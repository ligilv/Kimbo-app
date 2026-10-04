import { MOCK_MEALS } from '@/mocks/parseMealResponses';
import type { ParsedItem, ParseMealResponse } from './schema';

// ponytail: offline stand-in for the server's Gemini parser, so the chat can be
// built and demoed without a backend. It only knows the foods in the mock meals.
// Switch MEAL_PARSER to 'server' in src/config.ts to use the real thing.

type Food = Omit<ParsedItem, 'quantity'> & {
  aliases: string[];
  countable: boolean;
};

const EXTRA_ALIASES: Record<string, string[]> = {
  Chapati: ['roti', 'rotis', 'chapatis', 'phulka'],
  'Steamed rice': ['rice', 'chawal'],
  'Dal tadka': ['dal', 'daal'],
  'Masala chai': ['chai', 'tea'],
  'Boiled egg': ['egg', 'eggs'],
  'Brown bread toast': ['toast', 'bread'],
  Curd: ['dahi', 'yogurt'],
};

// One serving of every food in the mock meals (nutrients divided down to 1 unit).
const FOODS: Food[] = Object.values(MOCK_MEALS)
  .flatMap(meal => meal.response.items)
  .filter(
    (item, i, all) => all.findIndex(other => other.name === item.name) === i,
  )
  .map(item => {
    const per = (n: number) => Math.round((n / item.quantity) * 10) / 10;
    const base = item.name.toLowerCase();
    return {
      name: item.name,
      unit: item.unit,
      kcal: per(item.kcal),
      protein: per(item.protein),
      carbs: per(item.carbs),
      fat: per(item.fat),
      countable: item.unit === 'piece' || item.unit === 'slice',
      aliases: [
        base,
        base.split(' ').at(-1)!,
        ...(EXTRA_ALIASES[item.name] ?? []),
      ],
    };
  });

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  half: 0.5,
};

function readQuantity(chunk: string): number | undefined {
  const digits = chunk.match(/(\d+(?:\.\d+)?)/);
  if (digits) return Number(digits[1]);
  const word = chunk.split(/\s+/).find(w => w in NUMBER_WORDS);
  return word ? NUMBER_WORDS[word] : undefined;
}

const findFood = (chunk: string) =>
  FOODS.find(food =>
    food.aliases.some(alias => new RegExp(`\\b${alias}\\b`).test(chunk)),
  );

const plural = (name: string) =>
  `${name.toLowerCase()}${name.endsWith('s') ? '' : 's'}`;

export async function mockParseMeal(
  text: string,
  hasPhoto = false,
): Promise<ParseMealResponse> {
  await new Promise<void>(resolve =>
    setTimeout(resolve, hasPhoto ? 1500 : 700),
  ); // feel like a network call

  // The mock can't see photos: it always "recognises" the same plate.
  if (hasPhoto) return MOCK_MEALS.dalRoti.response;

  // A follow-up answer arrives as: <original text>\nAnswer to "<question>": <answer>
  const [original, followUp] = text.toLowerCase().split('\nanswer to');
  const answerQuantity = followUp
    ? readQuantity(followUp.split(':').at(-1) ?? '')
    : undefined;

  const items: ParsedItem[] = [];
  for (const chunk of original.split(/,|\band\b|\bwith\b|\+/)) {
    const food = findFood(chunk);
    if (!food) continue;
    // The follow-up answer fills in a missing count, so it only applies to countable foods.
    let quantity =
      readQuantity(chunk) ?? (food.countable ? answerQuantity : undefined);
    if (quantity === undefined) {
      if (food.countable) {
        return {
          items: [],
          clarification: `How many ${plural(food.name)} did you have?`,
        };
      }
      quantity = 1; // "dal" means one katori of dal
    }
    const scale = (n: number) => Math.round(n * quantity * 10) / 10;
    items.push({
      name: food.name,
      unit: food.unit,
      quantity,
      kcal: Math.round(food.kcal * quantity),
      protein: scale(food.protein),
      carbs: scale(food.carbs),
      fat: scale(food.fat),
    });
  }
  return { items, clarification: null };
}
