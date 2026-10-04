import { useCallback, useRef, useState } from 'react';
import { type DateKey, formatDayLabel, isToday } from '@/features/meals/dates';
import { SLOT_LABEL } from '@/features/meals/format';
import { addLog, newId, sumNutrients } from '@/features/meals/mealStore';
import type { MealSlot } from '@/features/meals/types';
import { type DraftRow, rowItem } from './ConfirmationCard';
import { parseMeal } from './parseMeal';

export type ChatMessage =
  | { id: string; kind: 'kimbo'; text: string }
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'error'; text: string; retryQuery: string }
  | {
      id: string;
      kind: 'card';
      logId: string;
      rows: DraftRow[];
      rawText: string;
      saved: boolean;
    };

const ERRORS = {
  network:
    "I couldn't reach Kimbo's server. Check your connection and try again.",
  timeout: 'That took too long to work out. Try again?',
  invalid: 'Something went wrong reading that. Try again?',
};

const NO_FOOD =
  "Hmm, I couldn't spot any food in that. Try something like “2 chapatis, dal and a bowl of curd”.";

export function openingMessage(date: DateKey, slot?: MealSlot) {
  const when = isToday(date) ? '' : ` on ${formatDayLabel(date)}`;
  if (!slot)
    return `Which meal are you logging${when}? Pick one below, then tell me what you had.`;
  return `What did you have for ${SLOT_LABEL[slot].toLowerCase()}${when}?`;
}

// The Log Meal conversation: send text, show what Kimbo understood, save it.
export function useMealChat(date: DateKey, initialSlot?: MealSlot) {
  const [slot, setSlotState] = useState(initialSlot);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: newId(), kind: 'kimbo', text: openingMessage(date, initialSlot) },
  ]);
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  // When Kimbo asked a follow-up, the next message is sent together with the original.
  const pending = useRef<{ base: string; question: string } | null>(null);

  const push = (message: ChatMessage) => setMessages(m => [...m, message]);

  const setSlot = (next: MealSlot) => {
    if (!slot)
      push({ id: newId(), kind: 'kimbo', text: openingMessage(date, next) });
    setSlotState(next);
  };

  const run = useCallback(async (query: string) => {
    setThinking(true);
    const result = await parseMeal({ text: query });
    setThinking(false);

    if (!result.ok) {
      push({
        id: newId(),
        kind: 'error',
        text: ERRORS[result.reason],
        retryQuery: query,
      });
      return;
    }
    const { items, clarification } = result.data;
    if (clarification) {
      pending.current = { base: query, question: clarification };
      push({ id: newId(), kind: 'kimbo', text: clarification });
      return;
    }
    pending.current = null;
    if (items.length === 0) {
      push({ id: newId(), kind: 'kimbo', text: NO_FOOD });
      return;
    }
    push({
      id: newId(),
      kind: 'kimbo',
      text: "Here's what I found. Change anything before saving:",
    });
    push({
      id: newId(),
      kind: 'card',
      logId: newId(), // fixed per card, so saving it twice still writes one log
      rawText: query.split('\nAnswer to')[0],
      saved: false,
      rows: items.map(item => ({
        base: { ...item, id: newId() },
        quantity: item.quantity,
      })),
    });
  }, []);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    push({ id: newId(), kind: 'user', text: trimmed });
    const query = pending.current
      ? `${pending.current.base}\nAnswer to "${pending.current.question}": ${trimmed}`
      : trimmed;
    run(query);
  };

  const retry = (query: string) => {
    if (!thinking) run(query);
  };

  const updateCard = (id: string, change: (rows: DraftRow[]) => DraftRow[]) =>
    setMessages(m =>
      m.map(msg =>
        msg.id === id && msg.kind === 'card'
          ? { ...msg, rows: change(msg.rows) }
          : msg,
      ),
    );

  const changeQuantity = (cardId: string, index: number, quantity: number) =>
    updateCard(cardId, rows =>
      rows.map((r, i) => (i === index ? { ...r, quantity } : r)),
    );

  const removeRow = (cardId: string, index: number) =>
    updateCard(cardId, rows => rows.filter((_, i) => i !== index));

  // "Edit" throws the card away and lets the user describe the meal again.
  const editCard = (cardId: string): string => {
    const card = messages.find(m => m.id === cardId);
    setMessages(m => m.filter(msg => msg.id !== cardId));
    push({
      id: newId(),
      kind: 'kimbo',
      text: 'No problem. Tell me again what you had.',
    });
    return card?.kind === 'card' ? card.rawText : '';
  };

  // Returns true once saved, so the screen can head back to Home.
  const saveCard = (cardId: string): boolean => {
    const card = messages.find(m => m.id === cardId);
    if (!card || card.kind !== 'card' || card.saved || saving || !slot)
      return false;
    setSaving(true);
    const items = card.rows.map(rowItem);
    const now = new Date().toISOString();
    addLog({
      id: card.logId,
      date,
      slot,
      items,
      rawText: card.rawText,
      createdAt: now,
      updatedAt: now,
    });
    setMessages(m =>
      m.map(msg =>
        msg.id === cardId && msg.kind === 'card'
          ? { ...msg, saved: true }
          : msg,
      ),
    );
    const kcal = Math.round(sumNutrients(items).kcal).toLocaleString('en-IN');
    push({
      id: newId(),
      kind: 'kimbo',
      text: `Saved ${kcal} kcal to ${SLOT_LABEL[slot].toLowerCase()} ✓`,
    });
    return true;
  };

  return {
    slot,
    setSlot,
    messages,
    thinking,
    saving,
    send,
    retry,
    changeQuantity,
    removeRow,
    editCard,
    saveCard,
  };
}
