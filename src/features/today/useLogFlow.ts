import { useCallback, useRef, useState } from 'react';
import { showToast } from '@/components/Toast';
import { type DateKey, slotFromText } from '@/features/meals/dates';
import { SLOT_LABEL } from '@/features/meals/format';
import {
  addLog,
  deleteLog,
  newId,
  scaleItem,
  sumNutrients,
} from '@/features/meals/mealStore';
import type { FoodItem, MealSlot } from '@/features/meals/types';
import { type MealPhoto, type ParseInput, parseMeal } from '@/features/logMeal/parseMeal';
import { askForReminders } from '@/features/reminders/reminders';

// Logging a meal happens inside the Today conversation:
// say/type/snap -> (voice: "Mira heard…") -> (vague: one portion question)
// -> review card with steppers -> Save. Nothing is saved before the review.

export type DraftRow = { base: FoodItem; quantity: number };
export const rowItem = (row: DraftRow) => scaleItem(row.base, row.quantity);

type NewTurn =
  | { kind: 'user'; text: string }
  | { kind: 'photo'; uri: string }
  | { kind: 'mira'; text: string };
export type Turn = NewTurn & { id: string };

export type Card =
  | { kind: 'heard'; text: string }
  | { kind: 'thinking'; photo: boolean }
  | { kind: 'clarify'; question: string; options: string[] }
  | { kind: 'review'; rows: DraftRow[]; rawText: string }
  | { kind: 'failed'; text: string; retry?: ParseInput; photo?: boolean };

const ERRORS = {
  network: "I couldn't reach the server. Check your connection and try again.",
  timeout: 'That took too long to work out. Try again?',
  invalid: 'Something went wrong reading that. Try again?',
};
const NO_FOOD = "I couldn't spot any food in that. Try something like “2 rotis, dal and a bowl of curd”.";
const NO_FOOD_PHOTO = "I couldn't make out food in that photo. Try another one, or just tell me what it was.";

export const JUST_GUESS = 'Just guess';
// One-tap answers for Mira's portion question.
export function answerOptions(question: string): string[] {
  if (/how many/i.test(question)) return ['1', '2', '3', '4'];
  return ['Half a katori', '1 katori', 'A plate', JUST_GUESS];
}

export function useLogFlow(date: DateKey, defaultSlot: MealSlot) {
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [card, setCard] = useState<Card | null>(null);
  // The original description + question, so an answer is parsed with context.
  const pending = useRef<{ base: string; question: string; photo?: MealPhoto } | null>(null);
  // Items already on the review card when "Add something" was tapped. Kept
  // through "Mira heard", a portion question or an error until the new food
  // comes back, so adding noodles never wipes the bread and jam.
  const keep = useRef<Extract<Card, { kind: 'review' }> | null>(null);
  const busy = card?.kind === 'thinking';

  const say = (turn: NewTurn) => setTurns(t => [...t, { ...turn, id: newId() }]);

  const reset = useCallback(() => {
    setTurns([]);
    setCard(null);
    pending.current = null;
    keep.current = null;
  }, []);

  const run = useCallback(async (input: ParseInput) => {
    setCard({ kind: 'thinking', photo: !!input.photo });
    const result = await parseMeal(input);
    if (!result.ok) {
      setCard({ kind: 'failed', text: ERRORS[result.reason], retry: input, photo: !!input.photo });
      return;
    }
    const { items, clarification } = result.data;
    if (clarification) {
      if (input.photo && !input.text) {
        setCard({ kind: 'failed', text: clarification, photo: true });
        return;
      }
      pending.current = { base: input.text ?? '', question: clarification, photo: input.photo };
      setCard({ kind: 'clarify', question: clarification, options: answerOptions(clarification) });
      return;
    }
    pending.current = null;
    const keepRows = keep.current?.rows ?? [];
    if (items.length === 0 && keepRows.length === 0) {
      setCard({ kind: 'failed', text: input.photo ? NO_FOOD_PHOTO : NO_FOOD, photo: !!input.photo });
      return;
    }
    const rows = [
      ...keepRows,
      ...items.map(item => ({ base: { ...item, id: newId() }, quantity: item.quantity })),
    ];
    const rawText = (input.text ?? '').split('\nAnswer to')[0] || 'Photo of my meal';
    keep.current = null;
    setCard({ kind: 'review', rows, rawText });
  }, []);

  // Typed text, or voice text the user confirmed.
  const sendText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    refreshKeep();
    const mentioned = slotFromText(trimmed);
    if (mentioned) setSlot(mentioned);
    if (card?.kind !== 'clarify' && !keep.current) setTurns([]);
    const followUp = card?.kind === 'clarify' ? pending.current : null;
    say({ kind: 'user', text: trimmed });
    run(
      followUp
        ? { text: `${followUp.base}\nAnswer to "${followUp.question}": ${trimmed === JUST_GUESS ? 'not sure, assume a typical serving' : trimmed}`, photo: followUp.photo }
        : { text: trimmed },
    );
  };

  const sendPhoto = (photo: MealPhoto) => {
    if (busy) return;
    refreshKeep();
    if (!keep.current) reset();
    say({ kind: 'photo', uri: photo.uri });
    run({ photo });
  };

  const heard = (text: string) => {
    refreshKeep();
    if (!keep.current) setTurns([]);
    setCard({ kind: 'heard', text });
  };

  // Closing "Mira heard" (or recording again): back to the meal being added
  // to, still in "add" mode, or to nothing.
  const dismissHeard = () => {
    if (card?.kind !== 'heard') return;
    if (keep.current) setCard(keep.current);
    else reset();
  };

  // The meal card may have been edited since "Add something"; keep the latest.
  const refreshKeep = () => {
    if (keep.current && card?.kind === 'review') keep.current = card;
  };

  const changeQuantity = (index: number, quantity: number) =>
    setCard(c => (c?.kind === 'review' ? { ...c, rows: c.rows.map((r, i) => (i === index ? { ...r, quantity } : r)) } : c));

  const removeRow = (index: number) =>
    setCard(c => (c?.kind === 'review' ? { ...c, rows: c.rows.filter((_, i) => i !== index) } : c));

  const addSomething = () => {
    if (card?.kind === 'review') keep.current = card;
    say({ kind: 'mira', text: 'What else did you have?' });
  };

  const retry = () => {
    if (card?.kind === 'failed' && card.retry) run(card.retry);
  };

  // Saves, then a quiet toast with Undo; the feed shows the meal and Mira's reaction.
  const save = () => {
    if (card?.kind !== 'review' || card.rows.length === 0) return;
    const items = card.rows.map(rowItem);
    const now = new Date().toISOString();
    const id = newId();
    addLog({ id, date, slot, items, rawText: card.rawText, createdAt: now, updatedAt: now });
    const total = sumNutrients(items);
    showToast(
      `${SLOT_LABEL[slot]} saved · ${Math.round(total.kcal).toLocaleString('en-IN')} kcal`,
      { label: 'Undo', onPress: () => deleteLog(id) },
    );
    reset();
    askForReminders(); // after the first meal: now reminders make sense
  };

  return {
    slot,
    setSlot,
    turns,
    card,
    busy,
    active: turns.length > 0 || card !== null,
    sendText,
    sendPhoto,
    heard,
    dismissHeard,
    changeQuantity,
    removeRow,
    addSomething,
    retry,
    save,
    reset,
    say,
  };
}
