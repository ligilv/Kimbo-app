import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Segmented';
import { Text } from '@/components/Text';
import { showToast } from '@/components/Toast';
import { targetsFor } from '@/features/onboarding/script';
import type { Activity, Goal, Profile } from '@/features/onboarding/types';
import { formatHeight, formatWeight } from '@/features/onboarding/units';
import { colors, fonts, radius, spacing } from '@/theme';

function Stepper({ label, text, onStep }: { label: string; text: string; onStep: (dir: 1 | -1) => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <Pressable onPress={() => onStep(-1)} accessibilityRole="button" accessibilityLabel={`Less ${label}`} style={styles.stepButton}>
        <Minus size={18} color={colors.ink} />
      </Pressable>
      <Text style={styles.stepValue}>{text}</Text>
      <Pressable onPress={() => onStep(1)} accessibilityRole="button" accessibilityLabel={`More ${label}`} style={styles.stepButton}>
        <Plus size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

// Goal, weight, height, activity in one sheet; the target updates as you change
// them. Saving shows a toast — a routine change, not a celebration.
export function EditPlanSheet({
  profile,
  onSave,
  onClose,
}: {
  profile: Profile;
  onSave: (next: Profile) => void;
  onClose: () => void;
}) {
  const [next, setNext] = useState(profile);
  const set = (patch: Partial<Profile>) => setNext(p => fixTarget({ ...p, ...patch }));
  const targets = targetsFor(next);
  const before = targetsFor(profile).calories;

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.title}>Your plan</Text>
        <Segmented<Goal>
          label="Goal"
          options={[
            { value: 'lose', label: 'Lose' },
            { value: 'maintain', label: 'Maintain' },
            { value: 'gain', label: 'Gain' },
          ]}
          value={next.goal}
          onChange={goal => set({ goal })}
        />
        <Stepper
          label="Weight"
          text={formatWeight(next.weightKg, next.weightUnit)}
          onStep={d => set({ weightKg: Math.round((next.weightKg + d * 0.5) * 10) / 10 })}
        />
        <Stepper
          label="Height"
          text={formatHeight(next.heightCm, next.heightUnit)}
          onStep={d => set({ heightCm: next.heightCm + d })}
        />
        <Segmented<Activity>
          label="Activity"
          options={[
            { value: 'sedentary', label: 'Sitting' },
            { value: 'light', label: 'Some' },
            { value: 'moderate', label: 'Active' },
            { value: 'very', label: 'Very' },
          ]}
          value={next.activity}
          onChange={activity => set({ activity })}
        />
        <View style={styles.result}>
          <Text style={styles.kcal}>{targets.calories.toLocaleString('en-IN')} kcal a day</Text>
          <Text style={styles.muted}>
            Protein {targets.proteinG} g · Carbs {targets.carbsG} g · Fat {targets.fatG} g
          </Text>
        </View>
        <Button
          label="Save"
          onPress={() => {
            onSave(next);
            if (targets.calories !== before)
              showToast(`Target updated to ${targets.calories.toLocaleString('en-IN')} kcal`);
            else showToast('Plan saved');
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

// Switching goal can leave the target weight on the wrong side; nudge it 5 kg the right way.
function fixTarget(p: Profile): Profile {
  if (p.goal === 'maintain') return p;
  const t = p.targetWeightKg;
  const ok = t !== undefined && (p.goal === 'lose' ? t < p.weightKg : t > p.weightKg);
  return ok ? p : { ...p, targetWeightKg: p.weightKg + (p.goal === 'lose' ? -5 : 5) };
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 20, fontFamily: fonts.extraBold },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingLeft: 16,
    minHeight: 52,
  },
  stepperLabel: { flex: 1, fontSize: 16, fontFamily: fonts.semiBold },
  stepButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 16, fontFamily: fonts.bold, minWidth: 84, textAlign: 'center' },
  result: { backgroundColor: colors.well, borderRadius: radius.md, padding: spacing.lg, gap: 2 },
  kcal: { fontSize: 22, fontFamily: fonts.extraBold },
  muted: { fontSize: 14, color: colors.muted },
});
