import { GlassWater, Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import type { DateKey } from '@/features/meals/dates';
import { colors, fonts, radius, spacing } from '@/theme';
import {
  addWater,
  formatWater,
  GLASS_ML,
  useWater,
  useWaterUnit,
} from './water';

const WATER_BLUE = '#3B82C4';

// "💧 5 of 8 glasses" with a glass per target glass that fills as you drink.
// Older (locked) days are shown without the buttons.
export function WaterCard({
  date,
  targetMl,
  locked,
}: {
  date: DateKey;
  targetMl: number;
  locked: boolean;
}) {
  const ml = useWater(date);
  const [unit, setUnit] = useWaterUnit();
  const glasses = Math.round(ml / GLASS_ML);
  const targetGlasses = targetMl / GLASS_ML;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.label}>💧 Water</Text>
          <Text style={styles.value} accessibilityLiveRegion="polite">
            {formatWater(ml, unit).replace(/ (glass|glasses|L)$/, '')} of{' '}
            {formatWater(targetMl, unit)}
          </Text>
        </View>
        <View style={styles.unitToggle}>
          {(['glass', 'l'] as const).map(u => (
            <Pressable
              key={u}
              onPress={() => setUnit(u)}
              accessibilityRole="button"
              accessibilityState={{ selected: unit === u }}
              accessibilityLabel={u === 'l' ? 'Show litres' : 'Show glasses'}
              style={[styles.unitItem, unit === u && styles.unitOn]}
            >
              <Text style={[styles.unitText, unit === u && styles.unitTextOn]}>
                {u === 'l' ? 'L' : 'Glasses'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        {!locked && (
          <Pressable
            onPress={() => addWater(date, -GLASS_ML)}
            disabled={ml === 0}
            accessibilityRole="button"
            accessibilityLabel="Remove a glass of water"
            style={[styles.step, ml === 0 && styles.disabled]}
          >
            <Minus size={20} color={colors.primary} />
          </Pressable>
        )}
        <View
          style={styles.glasses}
          accessible
          accessibilityLabel={`${glasses} of ${targetGlasses} glasses`}
        >
          {Array.from({ length: Math.max(targetGlasses, glasses) }, (_, i) => (
            <GlassWater
              key={i}
              size={22}
              color={i < glasses ? WATER_BLUE : 'rgba(28, 43, 36, 0.25)'}
              fill={i < glasses ? 'rgba(59, 130, 196, 0.25)' : 'none'}
            />
          ))}
        </View>
        {!locked && (
          <Pressable
            onPress={() => addWater(date, GLASS_ML)}
            accessibilityRole="button"
            accessibilityLabel="Add a glass of water"
            style={[styles.step, styles.stepAdd]}
          >
            <Plus size={20} color={colors.surface} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  label: { fontSize: 13, fontFamily: fonts.semiBold, opacity: 0.6 },
  value: { fontSize: 20, fontFamily: fonts.extraBold, color: WATER_BLUE },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31, 77, 58, 0.08)',
    borderRadius: radius.pill,
    padding: 3,
  },
  unitItem: {
    minHeight: 38,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  unitOn: { backgroundColor: colors.surface },
  unitText: { fontSize: 13, fontFamily: fonts.bold, opacity: 0.6 },
  unitTextOn: { opacity: 1, color: colors.primary },
  glasses: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 77, 58, 0.1)',
  },
  stepAdd: { backgroundColor: colors.primary },
  disabled: { opacity: 0.35 },
});
