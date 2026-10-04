import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Text } from '@/components/Text';
import {
  formatKcal,
  formatQuantity,
  SLOT_LABEL,
} from '@/features/meals/format';
import {
  deleteItem,
  moveItem,
  scaleItem,
  updateItem,
} from '@/features/meals/mealStore';
import {
  type FoodItem,
  type MealLog,
  MEAL_SLOTS,
} from '@/features/meals/types';
import { colors, fonts, radius, spacing } from '@/theme';

const STEP = 0.5;
const MAX = 50;

type Props = {
  log: MealLog;
  item: FoodItem;
  onClose: () => void;
};

export function EditItemSheet({ log, item, onClose }: Props) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [slot, setSlot] = useState(log.slot);
  const preview = scaleItem(item, quantity);
  const changed = quantity !== item.quantity || slot !== log.slot;

  const save = () => {
    if (quantity !== item.quantity) updateItem(log.id, preview);
    if (slot !== log.slot) moveItem(log.id, item.id, slot);
    onClose();
  };

  const confirmDelete = () =>
    Alert.alert(`Delete ${item.name}?`, 'It will be removed from this day.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteItem(log.id, item.id);
          onClose();
        },
      },
    ]);

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>{item.name}</Text>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => setQuantity(q => Math.max(STEP, q - STEP))}
            disabled={quantity <= STEP}
            accessibilityRole="button"
            accessibilityLabel={`Less ${item.name}`}
            style={[styles.stepButton, quantity <= STEP && styles.disabled]}
          >
            <Minus size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.quantity} accessibilityLiveRegion="polite">
            {formatQuantity(quantity, item.unit)}
          </Text>
          <Pressable
            onPress={() => setQuantity(q => Math.min(MAX, q + STEP))}
            accessibilityRole="button"
            accessibilityLabel={`More ${item.name}`}
            style={styles.stepButton}
          >
            <Plus size={22} color={colors.primary} />
          </Pressable>
        </View>

        <Text style={styles.nutrients}>
          {formatKcal(preview.kcal)} · Protein {Math.round(preview.protein)} g ·
          Carbs {Math.round(preview.carbs)} g · Fat {Math.round(preview.fat)} g
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Meal</Text>
          <View style={styles.slots}>
            {MEAL_SLOTS.map(s => (
              <Pressable
                key={s}
                onPress={() => setSlot(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: s === slot }}
                style={[styles.slot, s === slot && styles.slotSelected]}
              >
                <Text
                  style={[
                    styles.slotText,
                    s === slot && styles.slotTextSelected,
                  ]}
                >
                  {SLOT_LABEL[s]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={save}
          disabled={!changed}
          accessibilityRole="button"
          accessibilityState={{ disabled: !changed }}
          style={({ pressed }) => [
            styles.save,
            !changed && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.saveText}>Save changes</Text>
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          style={styles.delete}
        >
          <Text style={styles.deleteText}>Delete {item.name}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  title: { fontSize: 22, fontFamily: fonts.extraBold },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xs,
  },
  stepButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: { fontSize: 22, fontFamily: fonts.extraBold },
  nutrients: { fontSize: 15, opacity: 0.75, textAlign: 'center' },
  section: { gap: spacing.sm },
  sectionLabel: { fontSize: 14, fontFamily: fonts.semiBold, opacity: 0.7 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(31, 77, 58, 0.25)',
    backgroundColor: colors.surface,
  },
  slotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotText: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.primary },
  slotTextSelected: { color: colors.background },
  save: {
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 17, fontFamily: fonts.bold, color: colors.text },
  delete: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 16, fontFamily: fonts.bold, color: colors.alert },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
