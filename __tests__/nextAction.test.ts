import { type EngineContext, nearestSlot, nextAction, slotsSoFar } from '@/engine/nextAction';
import { slotFromText } from '@/features/meals/dates';

const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2026, 9, 10, h, m);
};

const base = (overrides: Partial<EngineContext> = {}): EngineContext => ({
  now: at('08:30'),
  routine: { breakfast: '08:30', lunch: '13:30', dinner: '20:30' },
  loggedSlots: [],
  medicines: [],
  openFollowups: [],
  dismissed: [],
  snoozedUntil: {},
  targets: { calories: 1390, proteinG: 90 },
  totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  diet: 'veg',
  firstTime: false,
  ...overrides,
});

const vitD = { id: 'm1', name: 'Vitamin D3', dose: '1 capsule', time: '21:00', handled: false };

test('meal window open around the usual time', () => {
  const a = nextAction(base({ now: at('08:10') }));
  expect(a).toMatchObject({ type: 'log_meal', urgency: 'normal', slot: 'breakfast' });
  expect(a.primary?.intent).toEqual({ kind: 'snap', slot: 'breakfast' });
});

test('meal goes overdue an hour after the usual time', () => {
  const a = nextAction(base({ now: at('09:35') }));
  expect(a).toMatchObject({ type: 'log_meal', urgency: 'overdue', slot: 'breakfast' });
  expect(a.title).toBe('Breakfast · 1h late');
  expect(nextAction(base({ now: at('09:00') })).urgency).toBe('normal');
});

test('a missed breakfast stops nagging once lunch opens', () => {
  expect(nextAction(base({ now: at('13:05') })).slot).toBe('lunch');
});

test('logged or skipped meals count as handled', () => {
  expect(nextAction(base({ now: at('08:40'), loggedSlots: ['breakfast'] })).type).toBe('all_done');
  expect(nextAction(base({ now: at('09:40'), dismissed: ['meal:breakfast'] })).type).toBe('all_done');
});

test('snoozed items come back after the snooze', () => {
  const snoozedUntil = { 'meal:breakfast': at('09:00').toISOString() };
  expect(nextAction(base({ now: at('08:45'), snoozedUntil })).type).toBe('all_done');
  expect(nextAction(base({ now: at('09:05'), snoozedUntil })).slot).toBe('breakfast');
});

test('overdue medicine beats everything', () => {
  const a = nextAction(
    base({ now: at('21:40'), medicines: [vitD], openFollowups: [{ id: 'f', label: 'Vitamin D', status: 'low' }] }),
  );
  expect(a).toMatchObject({ type: 'take_medicine', urgency: 'overdue', id: 'med:m1' });
});

test('report follow-up comes before meals', () => {
  const a = nextAction(base({ now: at('08:30'), openFollowups: [{ id: 'f', label: 'Vitamin D', status: 'low' }] }));
  expect(a.type).toBe('report_followup');
  expect(a.title).toBe('Your Vitamin D is low. Have you seen a doctor about it?');
  expect(a.dismiss?.intent).toEqual({ kind: 'followup', id: 'f', answer: 'not_yet' });
});

test('medicine due soon is a grey "soon" card, after the dinner window', () => {
  const a = nextAction(base({ now: at('20:40'), loggedSlots: ['breakfast', 'lunch', 'dinner'], medicines: [vitD] }));
  expect(a).toMatchObject({ type: 'take_medicine', urgency: 'soon' });
  expect(nextAction(base({ now: at('20:40'), loggedSlots: ['breakfast', 'lunch'], medicines: [vitD] })).slot).toBe('dinner');
});

test('evening protein nudge only when something is logged and it is short', () => {
  const ctx = base({
    now: at('18:30'),
    loggedSlots: ['breakfast', 'lunch'],
    totals: { kcal: 900, protein: 30, carbs: 0, fat: 0 },
  });
  expect(nextAction(ctx)).toMatchObject({ type: 'nutrition_nudge', title: "You're 60 g short on protein today." });
  expect(nextAction({ ...ctx, dismissed: ['nudge:protein'] }).type).toBe('all_done');
  expect(nextAction({ ...ctx, totals: { ...ctx.totals, protein: 60 } }).type).toBe('all_done');
});

test('all done says what is next, or tomorrow', () => {
  expect(nextAction(base({ now: at('10:30'), loggedSlots: ['breakfast'] })).title).toBe(
    "That's it till lunch. I'll check in around 1:30 pm.",
  );
  const night = nextAction(
    base({
      now: at('22:30'),
      loggedSlots: ['breakfast', 'lunch', 'dinner'],
      totals: { kcal: 1400, protein: 90, carbs: 0, fat: 0 },
    }),
  );
  expect(night).toMatchObject({ title: "You're on track today.", body: 'Tomorrow: breakfast around 8:30 am.' });
});

test('a new user between meals still gets one thing to do', () => {
  // Never "late" for someone with no habit yet; still breakfast until lunch opens.
  expect(nextAction(base({ now: at('11:00'), firstTime: true }))).toMatchObject({
    type: 'log_meal',
    urgency: 'normal',
    slot: 'breakfast',
    title: "Let's log your first meal",
  });
});

test('optional snack is never late', () => {
  const routine = { breakfast: '08:30', lunch: '13:30', snacks: '17:00', dinner: '20:30' };
  expect(nextAction(base({ now: at('17:00'), routine, loggedSlots: ['breakfast', 'lunch'] })).slot).toBe('snacks');
  expect(nextAction(base({ now: at('18:15'), routine, loggedSlots: ['breakfast', 'lunch'] })).type).toBe('all_done');
});

test('logging now goes to the closest usual meal', () => {
  const routine = { breakfast: '08:30', lunch: '13:30', dinner: '20:30' };
  expect(nearestSlot(routine, at('18:54'))).toBe('dinner');
  expect(nearestSlot(routine, at('10:30'))).toBe('breakfast');
  expect(nearestSlot({ ...routine, snacks: '17:00' }, at('16:30'))).toBe('snacks');
});

test('at lunch with no breakfast logged, Mira mentions it, and the example files under breakfast', () => {
  const a = nextAction(base({ now: at('13:20') }));
  expect(a).toMatchObject({ slot: 'lunch' });
  expect(a.body).toContain('No breakfast logged today.');
  expect(slotFromText('breakfast was poha')).toBe('breakfast');
  // Logged or skipped breakfast: nothing to mention.
  expect(nextAction(base({ now: at('13:20'), loggedSlots: ['breakfast'] })).body).not.toContain('breakfast');
  expect(nextAction(base({ now: at('13:20'), dismissed: ['meal:breakfast'] })).body).not.toContain('breakfast');
  // A brand-new user hasn't "missed" anything.
  expect(nextAction(base({ now: at('13:20'), firstTime: true })).body).not.toContain('logged today');
});

test('meal buttons only offer meals whose time has come', () => {
  const routine = { breakfast: '08:30', lunch: '13:30', dinner: '20:30' };
  expect(slotsSoFar(routine, at('06:00'))).toEqual(['breakfast', 'snacks']);
  expect(slotsSoFar(routine, at('11:27'))).toEqual(['breakfast', 'snacks']);
  expect(slotsSoFar(routine, at('11:30'))).toEqual(['breakfast', 'lunch', 'snacks']); // 2 h before lunch
  expect(slotsSoFar(routine, at('18:30'))).toEqual(['breakfast', 'lunch', 'snacks', 'dinner']); // early dinner
  expect(nearestSlot(routine, at('11:27'))).toBe('breakfast'); // not lunch, yet
});
