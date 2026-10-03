import ReactTestRenderer from 'react-test-renderer';
import { CalorieRing, ringLabel } from '@/features/home/components/CalorieRing';

// Every piece of text the ring renders, one entry per text element.
async function texts(props: {
  eaten: number;
  target: number;
  isToday: boolean;
}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<CalorieRing {...props} />);
  });
  const found: string[] = [];
  const walk = (node: ReactTestRenderer.ReactTestRendererNode | null) => {
    if (!node || typeof node === 'string') return;
    if (node.type === 'Text') {
      found.push(
        (node.children ?? []).filter(c => typeof c === 'string').join(''),
      );
    }
    node.children?.forEach(walk);
  };
  [tree.toJSON()].flat().forEach(walk);
  return found;
}

test('today counts down what is left', async () => {
  expect(await texts({ eaten: 845, target: 2540, isToday: true })).toEqual(
    expect.arrayContaining(['1,695', 'kcal left', 'of 2,540 kcal']),
  );
});

test('a past day shows what was eaten', async () => {
  expect(await texts({ eaten: 1685, target: 2540, isToday: false })).toEqual(
    expect.arrayContaining(['1,685', 'kcal eaten']),
  );
});

test('over target shows how much over, on any day', async () => {
  expect(await texts({ eaten: 2660, target: 2540, isToday: true })).toEqual(
    expect.arrayContaining(['120', 'kcal over']),
  );
  expect(ringLabel(2660, 2540, true)).toBe(
    '2,660 kcal eaten, 120 over your 2,540 kcal target',
  );
});

test('nothing logged yet today', async () => {
  expect(await texts({ eaten: 0, target: 2540, isToday: true })).toEqual(
    expect.arrayContaining(['2,540', 'kcal left']),
  );
});
