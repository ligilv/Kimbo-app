import ReactTestRenderer from 'react-test-renderer';
import { parseMeal } from '@/features/logMeal/parseMeal';
import { useLogFlow } from '@/features/today/useLogFlow';

jest.mock('@/features/logMeal/parseMeal', () => ({ parseMeal: jest.fn() }));
jest.mock('@/features/reminders/reminders', () => ({
  askForReminders: jest.fn(),
}));
const parse = parseMeal as jest.Mock;

const item = (name: string) => ({
  name,
  quantity: 1,
  unit: 'piece',
  kcal: 100,
  protein: 2,
  carbs: 10,
  fat: 1,
});
const reply = (items: object[], clarification: string | null = null) =>
  parse.mockResolvedValueOnce({ ok: true, data: { items, clarification } });

async function setup() {
  let flow!: ReturnType<typeof useLogFlow>;
  function Probe() {
    flow = useLogFlow('2026-10-10', 'breakfast');
    return null;
  }
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Probe />);
  });
  const act = (fn: () => unknown) =>
    ReactTestRenderer.act(async () => {
      await fn();
    });
  return { flow: () => flow, act };
}

const names = (flow: ReturnType<typeof useLogFlow>) =>
  flow.card?.kind === 'review'
    ? flow.card.rows.map(r => r.base.name)
    : flow.card?.kind;

test('adding by voice, through a portion question, keeps what was already there', async () => {
  const { flow, act } = await setup();
  reply([item('White bread'), item('Fruit jam')]);
  await act(() => flow().sendText('bread and jam'));
  expect(names(flow())).toEqual(['White bread', 'Fruit jam']);

  await act(() => flow().addSomething());
  await act(() => flow().heard('noodles')); // voice: "Mira heard" card
  reply([], 'How many bowls of noodles?');
  await act(() => flow().sendText('noodles'));
  expect(flow().card?.kind).toBe('clarify');
  reply([item('Noodles')]);
  await act(() => flow().sendText('1 bowl'));
  expect(names(flow())).toEqual(['White bread', 'Fruit jam', 'Noodles']);
});

test('a new meal after saving starts empty', async () => {
  const { flow, act } = await setup();
  reply([item('Poha')]);
  await act(() => flow().sendText('poha'));
  await act(() => flow().addSomething());
  await act(() => flow().reset()); // Cancel
  reply([item('Idli')]);
  await act(() => flow().sendText('idli'));
  expect(names(flow())).toEqual(['Idli']);
});

test('closing or redoing "Mira heard" while adding keeps the meal, edits included', async () => {
  const { flow, act } = await setup();
  reply([item('White bread')]);
  await act(() => flow().sendText('bread'));
  await act(() => flow().addSomething());
  await act(() => flow().heard('soup'));
  await act(() => flow().dismissHeard()); // × (or a new recording)
  expect(names(flow())).toEqual(['White bread']);
  await act(() => flow().changeQuantity(0, 3)); // edited after coming back
  await act(() => flow().heard('chicken 65'));
  reply([item('Chicken 65')]);
  await act(() => flow().sendText('chicken 65'));
  expect(names(flow())).toEqual(['White bread', 'Chicken 65']);
  const card = flow().card;
  expect(card?.kind === 'review' && card.rows[0].quantity).toBe(3);
});

test('closing "Mira heard" with nothing to add to clears it', async () => {
  const { flow, act } = await setup();
  await act(() => flow().heard('soup'));
  await act(() => flow().dismissHeard());
  expect(flow().card).toBeNull();
});
