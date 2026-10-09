import { AppState } from 'react-native';
import notifee, {
  AlarmType,
  AndroidImportance,
  AuthorizationStatus,
  type Event,
  EventType,
  TriggerType,
} from 'react-native-notify-kit';
import { getDayState, snooze } from '@/features/day/dayState';
import { type DateKey, toLocalDateKey } from '@/features/meals/dates';
import { getLogsForDate } from '@/features/meals/mealStore';
import { getDoses, getMedicines, isDueOn, recordDose } from '@/features/medicines/medicineStore';
import { DEFAULT_MEAL_TIMES, type Answers } from '@/features/onboarding/types';
import { getFollowups } from '@/features/reports/reportStore';
import { readJson, storage } from '@/storage';
import { planReminders, type Reminder } from './plan';

// Local notifications: scheduled on the phone, no server or internet. Every
// time the data changes (a meal logged, a dose taken, times edited) the plan is
// worked out again and the phone's list is replaced, so a reminder for
// something already done never fires.

const CHANNEL = 'reminders';
const MEDICINE_CATEGORY = 'medicine';
const ASKED_KEY = 'reminders.asked';
const SNOOZE_MIN = 30;
// Storage keys whose changes can change the plan.
const WATCHED = ['meals.', 'day.', 'doses.', 'medicines', 'followups', 'onboarding.answers'];

function currentPlan(now = new Date()): Reminder[] {
  const answers = readJson<Answers>('onboarding.answers', {});
  return planReminders({
    now,
    mealTimes: answers.mealTimes ?? DEFAULT_MEAL_TIMES,
    medicines: getMedicines(),
    isDueOn,
    dayFacts: (date: DateKey) => {
      const day = getDayState(date);
      return {
        loggedSlots: getLogsForDate(date).map(l => l.slot),
        handled: Object.keys(day.handled),
        snoozedUntil: day.snoozedUntil,
        doses: getDoses(date),
      };
    },
    followups: getFollowups(),
  });
}

const allowed = async () =>
  (await notifee.getNotificationSettings()).authorizationStatus >= AuthorizationStatus.AUTHORIZED;

// Replaces the phone's scheduled reminders with the current plan.
export async function syncReminders() {
  try {
    if (!(await allowed())) return;
    const plan = currentPlan();
    const keep = new Set(plan.map(r => r.id));
    const stale = (await notifee.getTriggerNotificationIds()).filter(id => !keep.has(id));
    if (stale.length) await notifee.cancelTriggerNotifications(stale);
    for (const r of plan) {
      await notifee.createTriggerNotification(
        {
          id: r.id,
          title: r.title,
          body: r.body,
          data: { kind: r.kind, medicineId: r.medicineId ?? '', date: toLocalDateKey(new Date(r.at)) },
          android: {
            channelId: CHANNEL,
            smallIcon: 'ic_launcher_monochrome',
            pressAction: { id: 'default' }, // opens the app on Today
            actions:
              r.kind === 'medicine'
                ? [
                    { title: 'Taken', pressAction: { id: 'taken' } },
                    { title: `Snooze ${SNOOZE_MIN} min`, pressAction: { id: 'snooze' } },
                  ]
                : undefined,
          },
          ios: r.kind === 'medicine' ? { categoryId: MEDICINE_CATEGORY } : undefined,
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: r.at,
          // On time even when the phone is idle. Without the exact-alarm
          // permission the library falls back to Android's approximate timing.
          alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
        },
      );
    }
  } catch (error) {
    if (__DEV__) console.warn('reminders: sync failed', error);
  }
}

// Asked once, at a moment it makes sense (first medicine with "Remind me",
// first meal saved), never on first launch.
export async function askForReminders() {
  if (storage.getBoolean(ASKED_KEY)) return;
  storage.set(ASKED_KEY, true);
  await notifee.requestPermission();
  await syncReminders();
}

// Taken / Snooze on a medicine notification, without opening the app.
export async function handleReminderEvent({ type, detail }: Event) {
  if (type !== EventType.ACTION_PRESS || !detail.notification?.data) return;
  const { medicineId, date } = detail.notification.data as Record<string, string>;
  if (!medicineId) return;
  if (detail.pressAction?.id === 'taken') recordDose(date, medicineId, 'taken');
  if (detail.pressAction?.id === 'snooze') snooze(date, `med:${medicineId}`, SNOOZE_MIN);
  if (detail.notification.id) await notifee.cancelNotification(detail.notification.id);
  await syncReminders();
}

let timer: ReturnType<typeof setTimeout> | undefined;
const syncSoon = () => {
  clearTimeout(timer);
  timer = setTimeout(syncReminders, 500); // one sync for a burst of writes
};

// Call once at app start.
export function startReminders() {
  notifee
    .createChannel({ id: CHANNEL, name: 'Reminders', importance: AndroidImportance.HIGH })
    .catch(() => {});
  notifee
    .setNotificationCategories([
      {
        id: MEDICINE_CATEGORY,
        actions: [
          { id: 'taken', title: 'Taken' },
          { id: 'snooze', title: `Snooze ${SNOOZE_MIN} min` },
        ],
      },
    ])
    .catch(() => {});
  notifee.onForegroundEvent(handleReminderEvent);
  storage.addOnValueChangedListener(key => {
    if (WATCHED.some(prefix => key.startsWith(prefix))) syncSoon();
  });
  // Coming back after midnight moves "tomorrow" forward a day.
  AppState.addEventListener('change', state => state === 'active' && syncSoon());
  syncSoon();
}
