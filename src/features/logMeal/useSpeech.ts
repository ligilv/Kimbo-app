import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';
import { API_URL } from '@/config';
import {
  fromUtf8,
  loudness,
  resample,
  toPcm16Base64,
  VOICE_RATE,
} from './voiceAudio';

const NOTHING_HEARD_MS = 6_000;
const MAX_LISTEN_MS = 30_000;
const TOKEN_TIMEOUT_MS = 8_000;
// After the mic stops, Gemini sends the final words ~0.5 s later. Wait at most this long.
const FINAL_WAIT_MS = 2_500;
const BARS = 28;

export type VoiceError = 'network' | 'failed';

type Handlers = {
  onText: (text: string) => void; // live words while speaking, then the final words
  onNothingHeard: () => void;
  onError: (error: VoiceError) => void;
};

// Live speech-to-text via Gemini: https://ai.google.dev/gemini-api/docs/live-api/live-transcribe
// The server hands out a one-use key; the mic streams straight to Gemini and
// words come back while the user talks. Never sends a meal by itself: the
// words go to onText and the screen shows them in "Mira heard" to fix first.
export function useSpeech(handlers: Handlers) {
  const [listening, setListening] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const latest = useRef(handlers);
  latest.current = handlers;
  const session = useRef<Session | null>(null);

  const end = useCallback(() => {
    session.current?.finish();
  }, []);

  useEffect(() => () => session.current?.abort(), []);

  const startListening = useCallback(async () => {
    session.current?.abort();
    setLevels(Array(BARS).fill(0));
    setListening(true);
    const s = new Session({
      onText: text => latest.current.onText(text),
      onLevel: level => setLevels(prev => [...prev.slice(1), level]),
      onDone: (outcome: 'heard' | 'nothing' | VoiceError) => {
        if (session.current === s) session.current = null;
        setListening(false);
        if (outcome === 'nothing') latest.current.onNothingHeard();
        else if (outcome !== 'heard') latest.current.onError(outcome);
      },
    });
    session.current = s;
    await s.start();
  }, []);

  return { listening, levels, startListening, stopListening: end };
}

type SessionEvents = {
  onText: (text: string) => void;
  onLevel: (level: number) => void;
  onDone: (outcome: 'heard' | 'nothing' | VoiceError) => void;
};

type LiveMessage = {
  setupComplete?: object;
  serverContent?: {
    interimInputTranscription?: { text?: string };
    inputTranscription?: { text?: string };
  };
  voiceActivity?: { type?: string };
};

// The library recommends one recorder for the whole app. Made on first use.
let sharedRecorder: AudioRecorder | undefined;

// One tap of the mic: record, stream, collect words, then report once.
class Session {
  private recorder = (sharedRecorder ??= new AudioRecorder());
  private ws: WebSocket | null = null;
  private queue: string[] = []; // audio recorded before Gemini is ready
  private ready = false;
  private finals = '';
  private interim = '';
  private timers: ReturnType<typeof setTimeout>[] = [];
  private done = false;
  private stopping = false;

  constructor(private events: SessionEvents) {}

  async start() {
    try {
      AudioManager.setAudioSessionOptions({
        iosCategory: 'record',
        iosMode: 'measurement',
      });
      await AudioManager.setAudioSessionActivity(true);
      this.recorder.onAudioReady(
        {
          sampleRate: VOICE_RATE,
          bufferLength: VOICE_RATE / 10,
          channelCount: 1,
        },
        e => this.onAudio(e.buffer.getChannelData(0), e.buffer.sampleRate),
      );
      // Record straight away so the first words aren't lost while Gemini connects.
      const started = await this.recorder.start();
      if (started.status === 'error') return this.finishWith('failed');
    } catch {
      return this.finishWith('failed');
    }
    this.timers.push(
      setTimeout(() => !this.text() && this.finish(), NOTHING_HEARD_MS),
      setTimeout(() => this.finish(), MAX_LISTEN_MS),
    );
    this.connect();
  }

  private async connect() {
    let token: { token: string; model: string };
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);
      const res = await fetch(`${API_URL}/meals/voice-token`, {
        method: 'POST',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      token = await res.json();
    } catch {
      return this.finishWith('network');
    }
    if (this.done) return;
    // Ephemeral tokens use the "Constrained" endpoint: https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
    const ws = new WebSocket(
      'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained' +
        `?access_token=${encodeURIComponent(token.token)}`,
    );
    this.ws = ws;
    // The model and transcription settings are locked into the token by the server.
    ws.onopen = () =>
      ws.send(JSON.stringify({ setup: { model: `models/${token.model}` } }));
    // Gemini sends its JSON as binary frames; Hermes has no TextDecoder.
    ws.onmessage = e =>
      this.onMessage(typeof e.data === 'string' ? e.data : fromUtf8(e.data));
    ws.onerror = () => this.finishWith(this.text() ? 'heard' : 'network');
    ws.onclose = () =>
      this.finishWith(
        this.text() ? 'heard' : this.ready ? 'nothing' : 'failed',
      );
  }

  private onAudio(samples: Float32Array, rate: number) {
    if (this.stopping) return;
    this.events.onLevel(loudness(samples));
    const chunk = toPcm16Base64(resample(samples, rate));
    if (this.ready) this.sendAudio(chunk);
    else this.queue.push(chunk);
  }

  private sendAudio(data: string) {
    this.ws?.send(
      JSON.stringify({
        realtimeInput: {
          audio: { data, mimeType: `audio/pcm;rate=${VOICE_RATE}` },
        },
      }),
    );
  }

  private onMessage(raw: string) {
    let msg: LiveMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.setupComplete) {
      this.ready = true;
      this.queue.forEach(c => this.sendAudio(c));
      this.queue = [];
      if (this.stopping)
        this.ws?.send(
          JSON.stringify({ realtimeInput: { audioStreamEnd: true } }),
        );
      return;
    }
    const content = msg.serverContent ?? {};
    if (content.interimInputTranscription?.text) {
      this.interim = content.interimInputTranscription.text;
      this.events.onText(this.text());
    }
    if (content.inputTranscription?.text) {
      this.finals = `${this.finals} ${content.inputTranscription.text}`.trim();
      this.interim = '';
      this.events.onText(this.text());
      // Gemini only finalises once the user has stopped talking, so this is
      // the moment to show "Mira heard" without waiting for a tap on Stop.
      this.finishWith('heard');
    }
    // Gemini noticed the user stopped talking: stop like the phone's own dictation does.
    if (msg.voiceActivity?.type === 'ACTIVITY_END' && this.text())
      this.finish();
  }

  private text() {
    return `${this.finals} ${this.interim}`.trim();
  }

  // Stop the mic, then give Gemini a moment to send the last words.
  finish() {
    if (this.stopping || this.done) return;
    this.stopping = true;
    this.stopMic();
    if (this.ready)
      this.ws?.send(
        JSON.stringify({ realtimeInput: { audioStreamEnd: true } }),
      );
    this.timers.push(
      setTimeout(
        () => this.finishWith(this.text() ? 'heard' : 'nothing'),
        FINAL_WAIT_MS,
      ),
    );
  }

  abort() {
    this.done = true;
    this.cleanup();
  }

  private finishWith(outcome: 'heard' | 'nothing' | VoiceError) {
    if (this.done) return;
    this.done = true;
    this.cleanup();
    this.events.onDone(outcome);
  }

  private stopMic() {
    this.recorder.clearOnAudioReady();
    if (this.recorder.isRecording()) this.recorder.stop().catch(() => {});
    AudioManager.setAudioSessionActivity(false).catch(() => {});
  }

  private cleanup() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.stopMic();
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = ws.onerror = ws.onmessage = null;
      ws.close();
    }
  }
}
