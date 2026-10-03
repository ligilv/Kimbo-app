import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Text } from '@/components/Text';
import type { Targets } from '@/features/onboarding/targets';
import type { Activity, Goal, Profile } from '@/features/onboarding/types';
import { formatHeight, formatWeight } from '@/features/onboarding/units';
import { colors, fonts, radius, spacing } from '@/theme';

const ACTIVITY: Record<Activity, string> = {
  sedentary: 'mostly sitting',
  light: 'on your feet some',
  moderate: 'active',
  very: 'very active',
};
const GOAL_STEP: Record<Goal, (t: Targets) => string> = {
  lose: t =>
    `To lose weight steadily we take off ${n(
      t.tdee - t.calories,
    )} kcal, about ${t.kgPerWeek} kg a week.`,
  maintain: () => 'To stay where you are, you eat about what you burn.',
  gain: t =>
    `To build muscle we add a small ${n(t.calories - t.tdee)} kcal, about ${
      t.kgPerWeek
    } kg a week.`,
};

const n = (value: number) => Math.round(value).toLocaleString('en-IN');

type Props = {
  visible: boolean;
  onClose: () => void;
  profile: Profile;
  targets: Targets;
  onEditProfile: () => void;
};

function Step({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepBody}>{body}</Text>
    </View>
  );
}

export function TargetExplanationSheet({
  visible,
  onClose,
  profile,
  targets,
  onEditProfile,
}: Props) {
  const sex = profile.sex === 'unspecified' ? '' : `${profile.sex}, `;
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          How your {n(targets.calories)} kcal is worked out
        </Text>

        <Step
          title={`At rest: ${n(targets.bmr)} kcal`}
          body={`What your body burns doing nothing, from your age, height and weight (${
            profile.age
          }, ${sex}${formatHeight(
            profile.heightCm,
            profile.heightUnit,
          )}, ${formatWeight(profile.weightKg, profile.weightUnit)}).`}
        />
        <Step
          title={`A normal day: ${n(targets.tdee)} kcal`}
          body={`You said you're ${
            ACTIVITY[profile.activity]
          }, so we add what your day burns on top.`}
        />
        <Step
          title={`Your target: ${n(targets.calories)} kcal`}
          body={GOAL_STEP[profile.goal](targets)}
        />
        <Step
          title={`Protein: ${targets.proteinG} g`}
          body={`About ${(targets.proteinG / profile.weightKg).toFixed(
            1,
          )} g for each kg you weigh. The rest is split between carbs (${
            targets.carbsG
          } g) and fat (${targets.fatG} g).`}
        />

        <Text style={styles.footnote}>
          These are estimates (the Mifflin-St Jeor formula), not medical advice.
        </Text>

        <Text
          style={styles.link}
          onPress={onEditProfile}
          accessibilityRole="link"
          suppressHighlighting
        >
          Something changed? Update your details in Profile
        </Text>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 22, lineHeight: 28, fontFamily: fonts.extraBold },
  step: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 4,
  },
  stepTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.primary },
  stepBody: { fontSize: 15, lineHeight: 21, opacity: 0.8 },
  footnote: { fontSize: 13, opacity: 0.6 },
  link: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.primary,
    textDecorationLine: 'underline',
    paddingVertical: spacing.sm,
  },
});
