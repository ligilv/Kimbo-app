import { API_URL, MEAL_PARSER } from '@/config';
import { mockParseMeal } from './mockParser';
import { type ParseMealResponse, parseMealResponseSchema } from './schema';

const TIMEOUT_MS = 15_000;
// Photos take Gemini longer, and the server may try a backup model too.
const PHOTO_TIMEOUT_MS = 35_000;

export type MealPhoto = {
  uri: string;
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
};

export type ParseInput = {
  text?: string;
  photo?: MealPhoto; // sent as base64; the uri is only for showing it in the chat
};

export type ParseResult =
  | { ok: true; data: ParseMealResponse }
  | { ok: false; reason: 'network' | 'timeout' | 'invalid' };

// The one place meal text becomes food items. Never throws: every failure comes
// back as a reason the chat can explain.
export async function parseMeal(input: ParseInput): Promise<ParseResult> {
  if (MEAL_PARSER === 'mock')
    return {
      ok: true,
      data: await mockParseMeal(input.text ?? '', !!input.photo),
    };
  return parseOnServer(input);
}

export async function parseOnServer(
  { text, photo }: ParseInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ParseResult> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    photo ? PHOTO_TIMEOUT_MS : TIMEOUT_MS,
  );
  try {
    const res = await fetchImpl(`${API_URL}/meals/parse`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        image: photo && { base64: photo.base64, mimeType: photo.mimeType },
      }),
      signal: controller.signal,
    });
    if (!res.ok)
      return { ok: false, reason: res.status >= 500 ? 'invalid' : 'network' };
    const parsed = parseMealResponseSchema.safeParse(await res.json());
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, reason: 'invalid' };
  } catch (error) {
    if (controller.signal.aborted) return { ok: false, reason: 'timeout' };
    return {
      ok: false,
      reason: error instanceof SyntaxError ? 'invalid' : 'network',
    };
  } finally {
    clearTimeout(timer);
  }
}
