import * as STT from '@dbkable/react-native-speech-to-text';
import ReactTestRenderer from 'react-test-renderer';
import { useSpeech } from '@/features/logMeal/useSpeech';

type Listener = (arg?: unknown) => void;
const listener = (fn: unknown) =>
  (fn as jest.Mock).mock.calls.at(-1)![0] as Listener;

async function setup() {
  const handlers = {
    onText: jest.fn(),
    onNothingHeard: jest.fn(),
    onError: jest.fn(),
  };
  let api!: ReturnType<typeof useSpeech>;
  function Probe() {
    api = useSpeech(handlers);
    return null;
  }
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Probe />);
  });
  return {
    handlers,
    api: () => api,
    emitResult: (transcript: string) =>
      listener(STT.addSpeechResultListener)({
        transcript,
        isFinal: false,
        confidence: 0.9,
      }),
    emitEnd: () => listener(STT.addSpeechEndListener)(),
    emitError: (code: string) =>
      listener(STT.addSpeechErrorListener)({ code, message: code }),
    unmount: () => ReactTestRenderer.act(() => tree.unmount()),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

test('listens in en-IN and passes live words through', async () => {
  const s = await setup();
  await ReactTestRenderer.act(() => s.api().startListening());
  expect(STT.start).toHaveBeenCalledWith({ language: 'en-IN' });
  expect(s.api().listening).toBe(true);

  await ReactTestRenderer.act(() => s.emitResult('two chapatis'));
  await ReactTestRenderer.act(() => s.emitResult('two chapatis and dal'));
  expect(s.handlers.onText.mock.calls.map(c => c[0])).toEqual([
    'two chapatis',
    'two chapatis and dal',
  ]);

  await ReactTestRenderer.act(() => s.emitEnd());
  expect(s.api().listening).toBe(false);
  expect(s.handlers.onNothingHeard).not.toHaveBeenCalled();
  await s.unmount();
});

test('stops by itself and says so when nothing is heard for 6 seconds', async () => {
  const s = await setup();
  await ReactTestRenderer.act(() => s.api().startListening());
  await ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(6_000);
  });
  expect(STT.stop).toHaveBeenCalled();
  await ReactTestRenderer.act(() => s.emitEnd()); // the library sends "end" after stop
  expect(s.handlers.onNothingHeard).not.toHaveBeenCalled(); // waits for late words first
  await ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(1_000);
  });
  expect(s.handlers.onNothingHeard).toHaveBeenCalledTimes(1);
  await s.unmount();
});

test('errors end listening and are reported', async () => {
  const s = await setup();
  await ReactTestRenderer.act(() => s.api().startListening());
  await ReactTestRenderer.act(() => s.emitError('NETWORK_ERROR'));
  expect(s.api().listening).toBe(false);
  expect(s.handlers.onError).toHaveBeenCalledWith(
    expect.objectContaining({ code: 'NETWORK_ERROR' }),
  );
  await s.unmount();
});

test('a failed start is reported instead of crashing', async () => {
  (STT.start as jest.Mock).mockRejectedValueOnce(new Error('busy'));
  const s = await setup();
  await ReactTestRenderer.act(() => s.api().startListening());
  expect(s.handlers.onError).toHaveBeenCalledWith('start-failed');
  expect(s.api().listening).toBe(false);
  await s.unmount();
});

test('words arriving just after "speech ended" are kept, with no "didn\u2019t catch that"', async () => {
  const s = await setup();
  await ReactTestRenderer.act(() => s.api().startListening());
  await ReactTestRenderer.act(() => s.emitEnd()); // Android: end first...
  await ReactTestRenderer.act(() => s.emitResult('idli')); // ...then the final words
  await ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(2_000);
  });
  expect(s.handlers.onText).toHaveBeenCalledWith('idli');
  expect(s.handlers.onNothingHeard).not.toHaveBeenCalled();
  await s.unmount();
});
