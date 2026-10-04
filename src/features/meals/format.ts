import type { MealSlot } from './types';

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

// Units that read wrong with an "s" ("2 g", not "2 gs").
const NO_PLURAL = new Set(['g', 'kg', 'ml', 'l', 'oz']);

// "1 piece", "2 pieces", "0.5 katori", "150 g".
export function formatQuantity(quantity: number, unit: string): string {
  const amount = Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(1);
  const plural = quantity > 1 && !NO_PLURAL.has(unit) && !unit.endsWith('s');
  return `${amount} ${unit}${plural ? 's' : ''}`;
}

export const formatKcal = (kcal: number) =>
  `${Math.round(kcal).toLocaleString('en-IN')} kcal`;
