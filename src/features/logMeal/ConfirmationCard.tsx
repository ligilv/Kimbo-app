import { Minus, Plus, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { formatKcal, formatQuantity } from '@/features/meals/format';
import { scaleItem, sumNutrients } from '@/features/meals/mealStore';
import type { FoodItem } from '@/features/meals/types';
import { colors, fonts, radius, spacing } from '@/theme';

const STEP = 0.5;

// What Kimbo understood, before anything is saved. Each row keeps the parsed
// item as its base, so nudging the amount never compounds rounding.
export type DraftRow = { base: FoodItem; quantity: number };

export const rowItem = (row: DraftRow) => scaleItem(row.base, row.quantity);

type Props = {
  rows: DraftRow[];
  active: boolean; // only the latest, unsaved card can be changed
  saving: boolean;
  onChangeQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onSave: () => void;
  onEdit: () => void;
};

export function ConfirmationCard({
  rows,
  active,
  saving,
  onChangeQuantity,
  onRemove,
  onSave,
  onEdit,
}: Props) {
  const items = rows.map(rowItem);
  const total = sumNutrients(items);

  return (
    <View style={[styles.card, !active && styles.inactive]}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.kcal}>{formatKcal(item.kcal)}</Text>
          </View>
          {active ? (
            <View style={styles.stepper}>
              <Pressable
                onPress={() =>
                  onChangeQuantity(index, Math.max(STEP, item.quantity - STEP))
                }
                disabled={item.quantity <= STEP}
                accessibilityRole="button"
                accessibilityLabel={`Less ${item.name}`}
                style={[
                  styles.stepButton,
                  item.quantity <= STEP && styles.disabled,
                ]}
              >
                <Minus size={18} color={colors.primary} />
              </Pressable>
              <Text style={styles.quantity}>
                {formatQuantity(item.quantity, item.unit)}
              </Text>
              <Pressable
                onPress={() => onChangeQuantity(index, item.quantity + STEP)}
                accessibilityRole="button"
                accessibilityLabel={`More ${item.name}`}
                style={styles.stepButton}
              >
                <Plus size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => onRemove(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name}`}
                style={styles.stepButton}
              >
                <X size={18} color={colors.text} />
              </Pressable>
            </View>
          ) : (
            <Text style={styles.quantity}>
              {formatQuantity(item.quantity, item.unit)}
            </Text>
          )}
        </View>
      ))}

      <View style={styles.total}>
        <Text style={styles.totalKcal}>Total {formatKcal(total.kcal)}</Text>
        <Text style={styles.macros}>
          Protein {Math.round(total.protein)} g · Carbs{' '}
          {Math.round(total.carbs)} g · Fat {Math.round(total.fat)} g
        </Text>
      </View>

      {active && (
        <View style={styles.actions}>
          <Pressable
            onPress={onEdit}
            disabled={saving}
            accessibilityRole="button"
            style={styles.edit}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={onSave}
            // Disabled while saving, so a double tap can't write two logs.
            disabled={saving || rows.length === 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving || rows.length === 0 }}
            style={({ pressed }) => [
              styles.save,
              (saving || rows.length === 0) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginLeft: 40, // lines up with Kimbo's bubbles, past the avatar
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  inactive: { opacity: 0.6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
  },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontFamily: fonts.semiBold },
  kcal: { fontSize: 14, opacity: 0.65 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    minWidth: 64,
    textAlign: 'center',
  },
  total: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(28, 43, 36, 0.15)',
    paddingTop: spacing.sm,
    gap: 2,
  },
  totalKcal: { fontSize: 17, fontFamily: fonts.bold },
  macros: { fontSize: 14, opacity: 0.7 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  edit: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: { fontSize: 16, fontFamily: fonts.bold, color: colors.primary },
  save: {
    flex: 2,
    minHeight: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
