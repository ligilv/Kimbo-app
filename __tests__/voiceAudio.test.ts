import {
  fromUtf8,
  loudness,
  resample,
  toPcm16Base64,
} from '@/features/logMeal/voiceAudio';

test('resample keeps 16 kHz as is and shrinks 48 kHz by three', () => {
  const s = new Float32Array([0, 0.5, 1, 0.5, 0, -0.5]);
  expect(resample(s, 16_000)).toBe(s);
  expect(Array.from(resample(s, 48_000))).toEqual([0, 0.5]);
});

test('PCM is 16-bit little-endian and clips out-of-range samples', () => {
  // bytes FF 7F | 01 80 | FF 7F | 00 00 = 32767, -32767, 32767 (clipped), 0
  expect(toPcm16Base64(new Float32Array([1, -1, 2, 0]))).toBe('/38BgP9/AAA=');
  expect(toPcm16Base64(new Float32Array([1]))).toBe('/38=');
});

test('loudness is 0 for silence, capped at 1, and makes normal speech visible', () => {
  expect(loudness(new Float32Array(100).fill(0.03))).toBeGreaterThan(0.5); // ~-30 dB, ordinary talking
  expect(loudness(new Float32Array(100))).toBe(0);
  expect(loudness(new Float32Array(100).fill(0.9))).toBe(1);
  expect(loudness(new Float32Array(0))).toBe(0);
});

test('decodes Gemini binary frames, Hindi and emoji included', () => {
  // UTF-8 bytes of 'दाल 🍛' (3-byte Devanagari, 4-byte emoji)
  const bytes = new Uint8Array([
    224, 164, 166, 224, 164, 190, 224, 164, 178, 32, 240, 159, 141, 155,
  ]);
  expect(fromUtf8(bytes.buffer)).toBe('दाल 🍛');
});
