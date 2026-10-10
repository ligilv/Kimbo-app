// Mic samples arrive as floats (-1..1) at whatever rate the phone records.
// Gemini's live transcriber wants 16 kHz, 16-bit, little-endian PCM as base64.
export const VOICE_RATE = 16_000;

// ponytail: linear interpolation, fine for speech; a proper low-pass resampler if accuracy suffers.
export function resample(
  samples: Float32Array,
  fromRate: number,
): Float32Array {
  if (fromRate === VOICE_RATE) return samples;
  const out = new Float32Array(
    Math.floor((samples.length * VOICE_RATE) / fromRate),
  );
  const step = fromRate / VOICE_RATE;
  for (let i = 0; i < out.length; i++) {
    const pos = i * step;
    const j = Math.floor(pos);
    const next = samples[Math.min(j + 1, samples.length - 1)];
    out[i] = samples[j] + (next - samples[j]) * (pos - j);
  }
  return out;
}

export function toPcm16Base64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  samples.forEach((s, i) =>
    view.setInt16(i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true),
  );
  return base64(bytes);
}

/* eslint-disable no-bitwise -- base64 is bit shuffling */
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n =
      (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += ABC[(n >> 18) & 63] + ABC[(n >> 12) & 63];
    out += i + 1 < bytes.length ? ABC[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ABC[n & 63] : '=';
  }
  return out;
}

// Hindi words come back as multi-byte UTF-8, so this can't just map bytes to chars.
export function fromUtf8(buffer: ArrayBuffer): string {
  const b = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < b.length; ) {
    let c = b[i++];
    if (c >= 0xf0)
      c =
        ((c & 7) << 18) |
        ((b[i++] & 63) << 12) |
        ((b[i++] & 63) << 6) |
        (b[i++] & 63);
    else if (c >= 0xe0)
      c = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else if (c >= 0xc0) c = ((c & 31) << 6) | (b[i++] & 63);
    out += String.fromCodePoint(c);
  }
  return out;
}

// 0..1 for the waveform bars, on a decibel scale like the ear hears it:
// -55 dB (room hum) shows as flat, -15 dB (talking close to the phone) fills
// the bar. A straight scale left normal speech looking like nothing.
const QUIET_DB = -55;
const LOUD_DB = -15;
export function loudness(samples: Float32Array): number {
  let sum = 0;
  for (const s of samples) sum += s * s;
  const rms = Math.sqrt(sum / (samples.length || 1));
  if (rms === 0) return 0;
  const db = 20 * Math.log10(rms);
  return Math.max(0, Math.min(1, (db - QUIET_DB) / (LOUD_DB - QUIET_DB)));
}
