import { API_URL, MEAL_PARSER } from '@/config';
import { mockParseMeal } from './mockParser';
import { type ParseMealResponse, parseMealResponseSchema } from './schema';

const TIMEOUT_MS = 15_000;

export type ParseInput = {
  text?: string;
  imageUri?: string; // Phase 5B (photo) plugs in here, through the same pipeline
};

export type ParseResult =
  | { ok: true; data: ParseMealResponse }
  | { ok: false; reason: 'network' | 'timeout' | 'invalid' };

// The one place meal text becomes food items. Never throws: every failure comes
// back as a reason the chat can explain.
export async function parseMeal(input: ParseInput): Promise<ParseResult> {
  if (MEAL_PARSER === 'mock')
    return { ok: true, data: await mockParseMeal(input.text ?? '') };
  return parseOnServer(input);
}

export async function parseOnServer(
  { text }: ParseInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ParseResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${API_URL}/meals/parse`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
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
