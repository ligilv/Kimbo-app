import { z } from 'zod';

// The backend's reply to POST /meals/parse. Everything from the network is
// checked against this before the app uses it.
export const parsedItemSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1),
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  guessed: z.boolean().optional(),
});

export const parseMealResponseSchema = z.object({
  items: z.array(parsedItemSchema),
  clarification: z.string().trim().min(1).nullable(),
});

export type ParsedItem = z.infer<typeof parsedItemSchema>;
export type ParseMealResponse = z.infer<typeof parseMealResponseSchema>;
