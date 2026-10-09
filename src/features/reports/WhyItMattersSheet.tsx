import { View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { Diet } from '@/features/onboarding/types';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import type { ReportValue } from './schema';

// Foods that respect what the user eats: vegetarians never see chicken.
export const foodsFor = (value: ReportValue, diet: Diet) =>
  diet === 'nonveg' || diet === 'egg'
    ? [...value.foods.nonveg, ...value.foods.veg].slice(0, 5)
    : value.foods.veg;

// For "Not yet": why this value matters, what helps, and a later reminder.
export function WhyItMattersSheet({
  value,
  diet,
  onRemindLater,
  onTaking,
  onClose,
}: {
  value: ReportValue;
  diet: Diet;
  onRemindLater: () => void;
  onTaking: () => void;
  onClose: () => void;
}) {
  const foods = foodsFor(value, diet);
  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.title}>Why {value.label} matters</Text>
        <Text style={styles.muted}>
          Yours is {value.value} {value.unit}
          {value.low !== null && value.high !== null ? ` (usual range ${value.low}–${value.high})` : ''}.
        </Text>
        {value.why.map(reason => (
          <View key={reason} style={styles.reason}>
            <View style={styles.dot} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
        {foods.length > 0 && (
          <View style={styles.foodBlock}>
            <Text style={styles.label}>Food can help a little</Text>
            <View style={styles.foods}>
              {foods.map(food => (
                <View key={food} style={styles.food}>
                  <Text style={styles.foodText}>{food}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <Text style={styles.note}>A doctor can tell you if you need more than food. This isn't medical advice.</Text>
        <Button label="Remind me in 2 days" onPress={onRemindLater} />
        <Button variant="outline" label="I'm already taking something" onPress={onTaking} />
      </View>
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  body: { gap: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 20, fontFamily: fonts.extraBold },
  muted: { fontSize: 15, color: colors.muted },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink, marginTop: 9 },
  reasonText: { flex: 1, fontSize: 16, lineHeight: 23 },
  foodBlock: { gap: spacing.sm },
  label: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted },
  foods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  food: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  foodText: { fontSize: 14 },
  note: { fontSize: 13, color: colors.muted },
}));
