import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import X from 'lucide-react-native/icons/x';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { Chip, NextAction } from '@/engine/nextAction';
import { formatKcal, formatQuantity, SLOT_LABEL } from '@/features/meals/format';
import { sumNutrients } from '@/features/meals/mealStore';
import { MEAL_SLOTS, type MealSlot } from '@/features/meals/types';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import { type DraftRow, rowItem } from './useLogFlow';

// Under each of Mira's prompts: one solid primary, the rest outlined, Skip last.
export function ActionChips({
  action,
  onChip,
  disabled,
}: {
  action: NextAction;
  onChip: (chip: Chip) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.chips}>
      {action.primary && (
        <Button small label={action.primary.label} onPress={() => onChip(action.primary!)} disabled={disabled} />
      )}
      {action.secondary && (
        <Button small variant="outline" label={action.secondary.label} onPress={() => onChip(action.secondary!)} disabled={disabled} />
      )}
      {action.dismiss && (
        <Button small variant="ghost" label={action.dismiss.label} onPress={() => onChip(action.dismiss!)} disabled={disabled} />
      )}
    </View>
  );
}

export function OptionChips({
  options,
  onPick,
  disabled,
}: {
  options: string[];
  onPick: (option: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.chips}>
      {options.map(option => (
        <Button key={option} small variant="outline" label={option} onPress={() => onPick(option)} disabled={disabled} />
      ))}
    </View>
  );
}

// "Mira heard: …" — voice is never logged until the words are confirmed.
export function HeardCard({
  name,
  text,
  onConfirm,
  onAgain,
  onClose,
}: {
  name: string;
  text: string;
  onConfirm: (text: string) => void;
  onAgain: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(text);
  return (
    <View style={styles.card}>
      <View style={styles.heardTop}>
        <Text style={styles.cardLabel}>{name} heard</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Discard what Mira heard">
          <X size={18} color={colors.muted} />
        </Pressable>
      </View>
      <TextInput
        value={value}
        onChangeText={setValue}
        multiline
        maxLength={500}
        style={styles.heardInput}
        accessibilityLabel="What Mira heard. Edit it if a word is wrong."
      />
      <Text style={styles.hint}>Tap the words to fix anything I got wrong.</Text>
      <View style={styles.row}>
        <Button small label="Looks right" onPress={() => onConfirm(value)} disabled={!value.trim()} style={styles.flex} />
        <Button small variant="outline" label="Again" onPress={onAgain} />
      </View>
    </View>
  );
}

const STEP = 0.5;

export function ReviewCard({
  rows,
  slot,
  onSlot,
  slots = MEAL_SLOTS,
  onChangeQuantity,
  onRemove,
  onAdd,
  onSave,
  onCancel,
  saveLabel,
}: {
  rows: DraftRow[];
  slot: MealSlot;
  onSlot?: (slot: MealSlot) => void;
  slots?: MealSlot[]; // which meal buttons to offer (default: all four)
  onChangeQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onAdd?: () => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const items = rows.map(rowItem);
  const total = sumNutrients(items);
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.itemRow}>
          <View style={styles.flex}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemMeta}>
              <Text style={styles.muted}>{formatKcal(item.kcal)}</Text>
              {item.guessed && (
                <View style={styles.guessed}>
                  <Text style={styles.guessedText}>Guessed portion</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => onChangeQuantity(index, Math.max(STEP, item.quantity - STEP))}
            disabled={item.quantity <= STEP}
            accessibilityRole="button"
            accessibilityLabel={`Less ${item.name}`}
            style={[styles.stepButton, item.quantity <= STEP && styles.disabled]}
          >
            <Minus size={18} color={colors.ink} />
          </Pressable>
          <Text style={styles.quantity}>{formatQuantity(item.quantity, item.unit)}</Text>
          <Pressable
            onPress={() => onChangeQuantity(index, item.quantity + STEP)}
            accessibilityRole="button"
            accessibilityLabel={`More ${item.name}`}
            style={styles.stepButton}
          >
            <Plus size={18} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => onRemove(index)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name}`}
            style={styles.stepButton}
          >
            <X size={18} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      {onAdd && (
        <Pressable onPress={onAdd} accessibilityRole="button" style={styles.addRow}>
          <Plus size={16} color={colors.ink} />
          <Text style={styles.addText}>Add something</Text>
        </Pressable>
      )}
      <View style={styles.totals}>
        <Text style={styles.totalKcal}>{formatKcal(total.kcal)}</Text>
        <Text style={styles.muted}>
          Protein {Math.round(total.protein)} g · Carbs {Math.round(total.carbs)} g · Fat {Math.round(total.fat)} g
        </Text>
      </View>
      {onSlot && (
        <View style={styles.slots}>
          {MEAL_SLOTS.filter(s => s === slot || slots.includes(s)).map(s => (
            <Pressable
              key={s}
              onPress={() => onSlot(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: s === slot }}
              style={[styles.slot, s === slot && styles.slotOn]}
            >
              <Text style={[styles.slotText, s === slot && styles.slotTextOn]}>{SLOT_LABEL[s]}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Button
        label={saveLabel ?? `Save as ${SLOT_LABEL[slot].toLowerCase()}`}
        onPress={onSave}
        disabled={rows.length === 0}
      />
      <Button small variant="ghost" label="Cancel" onPress={onCancel} />
    </View>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    // A white card on the off-white page was barely visible without an edge.
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  heardInput: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.ink,
    backgroundColor: colors.well,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  hint: { fontSize: 13, color: colors.muted },
  itemRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  itemName: { fontSize: 16, fontFamily: fonts.semiBold },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  guessed: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  guessedText: { fontSize: 12, color: colors.muted },
  stepButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  quantity: { fontSize: 14, fontFamily: fonts.semiBold, minWidth: 64, textAlign: 'center' },
  disabled: { opacity: 0.3 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  addText: { fontSize: 15, fontFamily: fonts.semiBold, textDecorationLine: 'underline' },
  totals: { backgroundColor: colors.well, borderRadius: radius.sm, padding: spacing.md, gap: 2 },
  totalKcal: { fontSize: 18, fontFamily: fonts.extraBold },
  muted: { fontSize: 14, color: colors.muted },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  slotOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotText: { fontSize: 14, fontFamily: fonts.semiBold },
  slotTextOn: { color: colors.ground },
}));
