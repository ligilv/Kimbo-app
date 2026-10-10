import ReactTestRenderer from 'react-test-renderer';
import { useSpeech } from '@/features/logMeal/useSpeech';

// A fake mic: the test pushes audio with `mic.emit()`.
const mic = {
  onAudio: null as null | ((e: unknown) => void),
  emit(level = 0.1) {
    const data = new Float32Array(1600).fill(level);
    mic.onAudio?.({
      buffer: { sampleRate: 16_000, getChannelData: () => data },
    });
  },
};
jest.mock('react-native-audio-api', () => ({
  AudioManager: {
    setAudioSessionOptions: jest.fn(),
    setAudioSessionActivity: jest.fn(() => Promise.resolve()),
  },
  AudioRecorder: jest.fn(() => {
    let recording = false;
    return {
      onAudioReady: (_: unknown, cb: (e: unknown) => void) => {
        mic.onAudio = cb;
        return { status: 'success' };
      },
      clearOnAudioReady: () => {
        mic.onAudio = null;
      },
      start: () => {
        recording = true;
        return Promise.resolve({ status: 'success' });
      },
      stop: () => {
        recording = false;
        return Promise.resolve({ status: 'success' });
      },
      isRecording: () => recording,
    };
  }),
}));

// A fake Gemini socket: the test plays server messages with `socket.reply()`.
class FakeSocket {
  static last: FakeSocket;
  sent: Record<string, unknown>[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: ArrayBuffer }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) {
    FakeSocket.last = this;
  }
  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }
  close() {}
  // Gemini sends JSON as binary frames, like this.
  reply(msg: object) {
    const json = JSON.stringify(msg);
    this.onmessage?.({
      data: Uint8Array.from(json, c => c.charCodeAt(0)).buffer,
    });
  }
}

const flush = () =>
  ReactTestRenderer.act(() => new Promise<void>(r => setImmediate(r)));

async function setup(tokenOk = true) {
  jest.useFakeTimers({ doNotFake: ['setImmediate'] });
  globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      ok: tokenOk,
      status: tokenOk ? 200 : 502,
      json: () =>
        Promise.resolve({
          token: 'auth_tokens/x',
          model: 'gemini-3.5-transcribe-live',
        }),
    }),
  ) as unknown as typeof fetch;
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
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Probe />);
  });
  await ReactTestRenderer.act(() => api.startListening());
  await flush();
  return { handlers, api: () => api };
}

afterEach(() => jest.useRealTimers());

test('streams the mic to Gemini and reports live then final words', async () => {
  const { handlers, api } = await setup();
  const ws = FakeSocket.last;
  expect(ws.url).toContain(
    'BidiGenerateContentConstrained?access_token=auth_tokens%2Fx',
  );

  mic.emit(0.1); // recorded before Gemini is ready: held, not lost
  ws.onopen?.();
  expect(ws.sent[0]).toEqual({
    setup: { model: 'models/gemini-3.5-transcribe-live' },
  });
  await ReactTestRenderer.act(() => ws.reply({ setupComplete: {} }));
  expect(ws.sent[1]).toHaveProperty(
    'realtimeInput.audio.mimeType',
    'audio/pcm;rate=16000',
  );
  expect(api().levels.at(-1)).toBeGreaterThan(0);

  await ReactTestRenderer.act(() =>
    ws.reply({
      serverContent: { interimInputTranscription: { text: 'two roti' } },
    }),
  );
  expect(handlers.onText).toHaveBeenLastCalledWith('two roti');

  await ReactTestRenderer.act(() => api().stopListening());
  expect(ws.sent.at(-1)).toEqual({ realtimeInput: { audioStreamEnd: true } });
  expect(api().listening).toBe(true); // still waiting for the final words

  await ReactTestRenderer.act(() =>
    ws.reply({
      serverContent: { inputTranscription: { text: 'Two roti and dal.' } },
    }),
  );
  expect(handlers.onText).toHaveBeenLastCalledWith('Two roti and dal.');
  expect(api().listening).toBe(false);
  expect(handlers.onNothingHeard).not.toHaveBeenCalled();
  expect(handlers.onError).not.toHaveBeenCalled();
});

test('stops by itself when nothing is said', async () => {
  const { handlers, api } = await setup();
  FakeSocket.last.onopen?.();
  await ReactTestRenderer.act(() =>
    FakeSocket.last.reply({ setupComplete: {} }),
  );
  await ReactTestRenderer.act(() => jest.advanceTimersByTime(6_000 + 2_500));
  expect(handlers.onNothingHeard).toHaveBeenCalledTimes(1);
  expect(api().listening).toBe(false);
});

test('says voice needs internet when the server gives no key', async () => {
  const { handlers, api } = await setup(false);
  expect(handlers.onError).toHaveBeenCalledWith('network');
  expect(api().listening).toBe(false);
});
