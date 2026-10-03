import type { StaticScreenProps } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { formatDayLabel } from '@/features/meals/dates';
import type { MealSlot } from '@/features/meals/types';
import { spacing } from '@/theme';

type Props = StaticScreenProps<{ date: string; slot?: MealSlot }>;

export function LogMealScreen({ route }: Props) {
  return (
    <View style={styles.container}>
      <Text>Logging for {formatDayLabel(route.params.date)}</Text>
      <Text style={styles.muted}>The meal chat comes in Phase 5.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  muted: { opacity: 0.6 },
});
