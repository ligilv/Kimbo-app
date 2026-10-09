import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TimeStepper } from '@/components/TimeStepper';
import { colors, fonts, spacing } from '@/theme';
import { DEFAULT_MEAL_TIMES, type MealTimes } from '../types';

const DEFAULT_SNACK = '17:00';

// "When do you usually eat?" Used in onboarding and in Settings.
export function MealTimesEditor({
  initial,
  onSave,
  saveLabel = 'Done',
}: {
  initial?: MealTimes;
  onSave: (times: MealTimes) => void;
  saveLabel?: string;
}) {
  const [times, setTimes] = useState<MealTimes>(initial ?? DEFAULT_MEAL_TIMES);
  const set = (patch: Partial<MealTimes>) => setTimes(t => ({ ...t, ...patch }));
  return (
    <View style={styles.stack}>
      <TimeStepper label="Breakfast" value={times.breakfast} onChange={breakfast => set({ breakfast })} />
      <TimeStepper label="Lunch" value={times.lunch} onChange={lunch => set({ lunch })} />
      <TimeStepper label="Dinner" value={times.dinner} onChange={dinner => set({ dinner })} />
      <View style={styles.snackRow}>
        <Text style={styles.snackLabel}>I have an evening snack</Text>
        <Switch
          value={times.snacks !== undefined}
          onValueChange={on => set({ snacks: on ? DEFAULT_SNACK : undefined })}
          trackColor={{ true: colors.ink, false: colors.line }}
          thumbColor={colors.ground}
          accessibilityLabel="I have an evening snack"
        />
      </View>
      {times.snacks !== undefined && (
        <TimeStepper label="Snack" value={times.snacks} onChange={snacks => set({ snacks })} />
      )}
      <Button label={saveLabel} onPress={() => onSave({ ...times, varies: false })} />
      <Button
        small
        variant="ghost"
        label="My times vary a lot"
        onPress={() => onSave({ ...DEFAULT_MEAL_TIMES, varies: true })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  snackRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 4 },
  snackLabel: { flex: 1, fontSize: 16, fontFamily: fonts.semiBold },
});
