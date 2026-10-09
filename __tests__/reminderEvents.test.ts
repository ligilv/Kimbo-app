import { EventType } from 'react-native-notify-kit';
import { getDayState } from '@/features/day/dayState';
import { getDoses } from '@/features/medicines/medicineStore';
import { handleReminderEvent } from '@/features/reminders/reminders';

const press = (action: string) =>
  handleReminderEvent({
    type: EventType.ACTION_PRESS,
    detail: {
      pressAction: { id: action },
      notification: { id: 'med:2026-10-10:m1', data: { kind: 'medicine', medicineId: 'm1', date: '2026-10-10' } },
    },
  });

test('Taken on the notification records the dose for that day', async () => {
  await press('taken');
  expect(getDoses('2026-10-10').m1?.status).toBe('taken');
});

test('Snooze puts the medicine off for 30 minutes', async () => {
  await press('snooze');
  expect(getDayState('2026-10-10').snoozedUntil['med:m1']).toBeDefined();
});
