import ReactTestRenderer from 'react-test-renderer';
import {
  addLog,
  deleteItem,
  deleteLog,
  getLogsForDate,
  getTotalsForDate,
  getTotalsForRange,
  hasAnyLogs,
  moveItem,
  scaleItem,
  updateItem,
  updateLog,
} from '@/features/meals/mealStore';
import type { FoodItem, MealLog } from '@/features/meals/types';
import { useDayLogs } from '@/features/meals/useMeals';
import { storage } from '@/storage';

const item = (id: string, kcal: number, protein = 0): FoodItem => ({
  id,
  name: id,
  quantity: 1,
  unit: 'piece',
  kcal,
  protein,
  carbs: 0,
  fat: 0,
});

const log = (id: string, date: string, items: FoodItem[]): MealLog => ({
  id,
  date,
  slot: 'lunch',
  items,
  rawText: '',
  createdAt: '2026-10-03T07:00:00.000Z',
  updatedAt: '2026-10-03T07:00:00.000Z',
});

beforeEach(() => storage.clearAll());

test('adds logs per day and totals them', () => {
  addLog(
    log('a', '2026-10-03', [item('chapati', 240, 6), item('dal', 180, 9)]),
  );
  addLog(log('b', '2026-10-03', [item('curd', 100, 4)]));
  addLog(log('c', '2026-10-04', [item('idli', 120)]));

  expect(getLogsForDate('2026-10-03').map(l => l.id)).toEqual(['a', 'b']);
  expect(getTotalsForDate('2026-10-03')).toEqual({
    kcal: 520,
    protein: 19,
    carbs: 0,
    fat: 0,
  });
  expect(getTotalsForDate('2026-10-05').kcal).toBe(0);
  expect(hasAnyLogs()).toBe(true);
});

test('totals for a range include empty days', () => {
  addLog(log('a', '2026-10-02', [item('x', 300)]));
  const range = getTotalsForRange('2026-10-01', '2026-10-03');
  expect(Object.keys(range)).toEqual([
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
  ]);
  expect(range['2026-10-02'].kcal).toBe(300);
  expect(range['2026-10-01'].kcal).toBe(0);
});

test('saving the same log twice keeps one copy', () => {
  const meal = log('a', '2026-10-03', [item('x', 100)]);
  addLog(meal);
  addLog(meal);
  expect(getLogsForDate('2026-10-03')).toHaveLength(1);
});

test('updates a log in place, or moves it to another day', () => {
  addLog(log('a', '2026-10-03', [item('x', 100)]));
  updateLog('a', { slot: 'dinner' });
  expect(getLogsForDate('2026-10-03')[0].slot).toBe('dinner');
  expect(getLogsForDate('2026-10-03')[0].updatedAt).not.toBe(
    '2026-10-03T07:00:00.000Z',
  );

  updateLog('a', { date: '2026-10-02' });
  expect(getLogsForDate('2026-10-03')).toEqual([]);
  expect(getLogsForDate('2026-10-02')[0].id).toBe('a');
});

test('deletes items, and the meal once its last item is gone', () => {
  addLog(log('a', '2026-10-03', [item('x', 100), item('y', 50)]));
  deleteItem('a', 'x');
  expect(getTotalsForDate('2026-10-03').kcal).toBe(50);
  deleteItem('a', 'y');
  expect(getLogsForDate('2026-10-03')).toEqual([]);
  expect(hasAnyLogs()).toBe(false);
});

test('deleteLog removes a whole meal', () => {
  addLog(log('a', '2026-10-03', [item('x', 100)]));
  addLog(log('b', '2026-10-03', [item('y', 50)]));
  deleteLog('a');
  expect(getLogsForDate('2026-10-03').map(l => l.id)).toEqual(['b']);
});

test('useDayLogs re-renders when that day changes', async () => {
  const seen: number[] = [];
  function Probe() {
    seen.push(useDayLogs('2026-10-03').totals.kcal);
    return null;
  }
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Probe />);
  });
  await ReactTestRenderer.act(() => {
    addLog(log('a', '2026-10-03', [item('x', 240)]));
  });
  expect(seen.at(0)).toBe(0);
  expect(seen.at(-1)).toBe(240);
  // Unmount so later tests' storage resets don't update this component.
  await ReactTestRenderer.act(() => tree.unmount());
});

test('scaling an item keeps nutrients in proportion', () => {
  const chapati = {
    ...item('chapati', 240, 6),
    quantity: 2,
    carbs: 36,
    fat: 7,
  };
  expect(scaleItem(chapati, 3)).toMatchObject({
    quantity: 3,
    kcal: 360,
    protein: 9,
    carbs: 54,
    fat: 10.5,
  });
  expect(scaleItem(chapati, 0.5).kcal).toBe(60);
});

test('updateItem replaces one item in place', () => {
  addLog(log('a', '2026-10-03', [item('x', 100), item('y', 50)]));
  updateItem('a', { ...item('x', 100), quantity: 2, kcal: 200 });
  expect(getTotalsForDate('2026-10-03').kcal).toBe(250);
  expect(getLogsForDate('2026-10-03')[0].items.map(i => i.id)).toEqual([
    'x',
    'y',
  ]);
});

test('moving the only item changes the meal slot', () => {
  addLog(log('a', '2026-10-03', [item('x', 100)]));
  moveItem('a', 'x', 'dinner');
  const logs = getLogsForDate('2026-10-03');
  expect(logs).toHaveLength(1);
  expect(logs[0]).toMatchObject({ id: 'a', slot: 'dinner' });
});

test('moving one item out of a bigger meal splits it into its own meal', () => {
  addLog(log('a', '2026-10-03', [item('x', 100), item('y', 50)]));
  moveItem('a', 'y', 'snacks');
  const logs = getLogsForDate('2026-10-03');
  expect(logs).toHaveLength(2);
  expect(logs[0]).toMatchObject({ id: 'a', slot: 'lunch' });
  expect(logs[0].items.map(i => i.id)).toEqual(['x']);
  expect(logs[1]).toMatchObject({
    slot: 'snacks',
    items: [expect.objectContaining({ id: 'y' })],
  });
  expect(getTotalsForDate('2026-10-03').kcal).toBe(150); // nothing lost or doubled
});
