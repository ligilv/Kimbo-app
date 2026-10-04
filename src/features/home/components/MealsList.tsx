import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import {
  formatKcal,
  formatQuantity,
  SLOT_LABEL,
} from '@/features/meals/format';
import { totalsForLogs } from '@/features/meals/mealStore';
import {
  type FoodItem,
  type MealLog,
  type MealSlot,
  MEAL_SLOTS,
} from '@/features/meals/types';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = {
  logs: MealLog[];
  onAddToSlot: (slot: MealSlot) => void;
  onEditItem: (log: MealLog, item: FoodItem) => void;
};

export function MealsList({ logs, onAddToSlot, onEditItem }: Props) {
  return (
    <View style={styles.list}>
      {MEAL_SLOTS.map(slot => {
        const slotLogs = logs.filter(log => log.slot === slot);
        const total = totalsForLogs(slotLogs).kcal;
        return (
          <View key={slot} style={styles.card}>
            <View style={styles.header} accessibilityRole="header">
              <Text style={styles.slotName}>{SLOT_LABEL[slot]}</Text>
              {slotLogs.length > 0 && (
                <Text style={styles.slotTotal}>{formatKcal(total)}</Text>
              )}
            </View>

            {slotLogs.length === 0 ? (
              <Pressable
                onPress={() => onAddToSlot(slot)}
                accessibilityRole="button"
                accessibilityLabel={`Nothing logged for ${SLOT_LABEL[slot]} yet. Log it`}
                style={({ pressed }) => [
                  styles.empty,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.plus}>
                  <Plus size={16} color={colors.primary} strokeWidth={2.5} />
                </View>
                <Text style={styles.emptyText}>
                  Nothing yet — what did you have?
                </Text>
              </Pressable>
            ) : (
              slotLogs.flatMap(log =>
                log.items.map(item => (
                  <Pressable
                    key={item.id}
                    onPress={() => onEditItem(log, item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, ${formatQuantity(
                      item.quantity,
                      item.unit,
                    )}, ${formatKcal(item.kcal)}`}
                    accessibilityHint="Change the amount, move or delete it"
                    style={({ pressed }) => [
                      styles.item,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.itemText}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQty}>
                        {formatQuantity(item.quantity, item.unit)}
                      </Text>
                    </View>
                    <Text style={styles.itemKcal}>{formatKcal(item.kcal)}</Text>
                  </Pressable>
                )),
              )
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: spacing.xs,
  },
  slotName: { fontSize: 17, fontFamily: fonts.bold },
  slotTotal: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  plus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(242, 163, 58, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 15, opacity: 0.7 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(28, 43, 36, 0.12)',
  },
  itemText: { flex: 1 },
  itemName: { fontSize: 16, fontFamily: fonts.semiBold },
  itemQty: { fontSize: 14, opacity: 0.65 },
  itemKcal: { fontSize: 15, fontFamily: fonts.semiBold },
  pressed: { opacity: 0.6 },
});
