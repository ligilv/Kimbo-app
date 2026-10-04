import { mockParseMeal } from '@/features/logMeal/mockParser';
import { parseOnServer } from '@/features/logMeal/parseMeal';

const reply = (body: unknown, status = 200) =>
  (() =>
    Promise.resolve({
      ok: status < 400,
      status,
      json: () => Promise.resolve(body),
    })) as unknown as typeof fetch;

const chapati = {
  name: 'Chapati',
  quantity: 2,
  unit: 'piece',
  kcal: 240,
  protein: 6,
  carbs: 36,
  fat: 7,
};

describe('server parser', () => {
  test('accepts a valid reply', async () => {
    const result = await parseOnServer(
      { text: '2 chapatis' },
      reply({ items: [chapati], clarification: null }),
    );
    expect(result).toEqual({
      ok: true,
      data: { items: [chapati], clarification: null },
    });
  });

  test('accepts a clarification', async () => {
    const result = await parseOnServer(
      { text: 'chapati' },
      reply({ items: [], clarification: 'How many?' }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: { clarification: 'How many?' },
    });
  });

  test('rejects a malformed reply instead of crashing', async () => {
    expect(
      await parseOnServer(
        { text: 'x' },
        reply({ items: [{ name: 'Chapati' }] }),
      ),
    ).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(
      await parseOnServer({ text: 'x' }, reply({ ...chapati, kcal: -5 })),
    ).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  test('a server error is reported, not thrown', async () => {
    expect(
      await parseOnServer({ text: 'x' }, reply({ message: 'boom' }, 502)),
    ).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  test('no connection is a network error', async () => {
    const offline = (() =>
      Promise.reject(
        new TypeError('Network request failed'),
      )) as unknown as typeof fetch;
    expect(await parseOnServer({ text: 'x' }, offline)).toEqual({
      ok: false,
      reason: 'network',
    });
  });

  test('gives up after the timeout', async () => {
    jest.useFakeTimers();
    const hang = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) =>
        init.signal?.addEventListener('abort', () =>
          reject(new Error('aborted')),
        ),
      )) as unknown as typeof fetch;
    const pending = parseOnServer({ text: 'x' }, hang);
    jest.advanceTimersByTime(15_000);
    expect(await pending).toEqual({ ok: false, reason: 'timeout' });
    jest.useRealTimers();
  });
});

describe('mock parser', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const parse = async (text: string) => {
    const pending = mockParseMeal(text);
    jest.runAllTimers();
    return pending;
  };

  test('reads foods and counts, scaling nutrients', async () => {
    const { items, clarification } = await parse(
      '3 rotis, dal and a bowl of curd',
    );
    expect(clarification).toBeNull();
    expect(items.map(i => [i.name, i.quantity])).toEqual([
      ['Chapati', 3],
      ['Dal tadka', 1],
      ['Curd', 1],
    ]);
    expect(items[0].kcal).toBe(360);
  });

  test('asks how many when a countable food has no count', async () => {
    expect(await parse('chapati and dal')).toEqual({
      items: [],
      clarification: 'How many chapatis did you have?',
    });
  });

  test('uses the answer to a follow-up question', async () => {
    const { items } = await parse(
      'chapati and dal\nAnswer to "How many chapatis did you have?": 2',
    );
    expect(items.map(i => [i.name, i.quantity])).toEqual([
      ['Chapati', 2],
      ['Dal tadka', 1],
    ]);
  });

  test('finds no food in small talk', async () => {
    expect(await parse('hello, how are you?')).toEqual({
      items: [],
      clarification: null,
    });
  });
});

test('a photo is sent as base64 with its type, plus the optional note', async () => {
  const seen: { url?: string; body?: unknown } = {};
  const capture = ((url: string, init: RequestInit) => {
    seen.url = url;
    seen.body = JSON.parse(String(init.body));
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], clarification: 'Which dish?' }),
    });
  }) as unknown as typeof fetch;
  const photo = {
    uri: 'file:///plate.jpg',
    base64: 'abc123',
    mimeType: 'image/jpeg' as const,
  };
  await parseOnServer({ text: 'no ghee', photo }, capture);
  expect(seen.url).toMatch(/\/meals\/parse$/);
  expect(seen.body).toEqual({
    text: 'no ghee',
    image: { base64: 'abc123', mimeType: 'image/jpeg' },
  });
});
