import type { Medicine } from './medicineStore';

const TOOK = /\b(took|taken|had|done with|finished)\b/i;
const GENERIC = /\b(medicine|meds|tablet|pill|capsule|dose|supplement)s?\b/i;

// "took my vitamin d", "had my tablet": which of today's pending medicines the
// text means, or undefined if it isn't about a medicine (then it's food).
export function tookMedicine(text: string, pending: Medicine[]): Medicine | undefined {
  if (!TOOK.test(text) || pending.length === 0) return undefined;
  const lower = text.toLowerCase();
  const named = pending.find(m =>
    m.name
      .toLowerCase()
      .split(/\s+/)
      .some(word => word.length > 2 && lower.includes(word)),
  );
  if (named) return named;
  return GENERIC.test(text) ? pending[0] : undefined;
}
