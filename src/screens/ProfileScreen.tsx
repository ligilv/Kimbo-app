import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/BottomSheet';
import { Text } from '@/components/Text';
import { getWelcomePlan } from '@/features/home/nudge';
import { Composer } from '@/features/onboarding/components/Composer';
import {
  displayName,
  isComplete,
  type Step,
  STEPS,
  targetsFor,
} from '@/features/onboarding/script';
import type { Answers } from '@/features/onboarding/types';
import { formatWeight } from '@/features/onboarding/units';
import { useAnswers } from '@/features/onboarding/useOnboarding';
import { API_URL } from '@/config';
import { getDeviceId } from '@/features/sync/deviceId';
import { readOutbox } from '@/features/sync/outbox';
import { version } from '../../package.json';
import { DeleteDataModal } from '@/features/profile/DeleteDataModal';
import {
  type PlanChange,
  PlanUpdatedModal,
} from '@/features/profile/PlanUpdatedModal';
import { colors, fonts, radius, spacing } from '@/theme';

const LABELS: Record<string, string> = {
  name: 'Name',
  goal: 'Goal',
  sex: 'Sex',
  age: 'Age',
  height: 'Height',
  weight: 'Weight',
  target: 'Target weight',
  activity: 'Activity',
  diet: 'Diet',
};

const GROUPS = [
  { title: 'About you', ids: ['name', 'sex', 'age', 'height'] },
  { title: 'Your goal', ids: ['goal', 'weight', 'target'] },
  { title: 'Lifestyle', ids: ['activity', 'diet'] },
];

// Details for testing on a phone or reporting a bug.
const showBuildInfo = () =>
  Alert.alert(
    'About this build',
    [
      `Version ${version} (${__DEV__ ? 'debug' : 'release'})`,
      `Server: ${API_URL}`,
      `Changes waiting to sync: ${readOutbox().length}`,
      `Device ID: ${getDeviceId().slice(0, 8)}`,
    ].join('\n'),
  );

const n = (value: number) => value.toLocaleString('en-IN');

export function ProfileScreen() {
  const [answers, update] = useAnswers();
  // The question being edited, plus answers given but not saved yet. Changing the
  // goal or weight can make the target weight point the wrong way; then the target
  // is asked next and nothing is saved until it's fixed.
  const [editing, setEditing] = useState<{
    step: Step;
    pending: Answers;
  } | null>(null);
  const [saved, setSaved] = useState<PlanChange | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!isComplete(answers)) return null; // only reachable after onboarding
  const targets = targetsFor(answers);
  // The name as Kimbo says it; other answers read as they did in the chat.
  const valueOf = (step: Step) =>
    step.id === 'name' ? displayName(answers) : step.reply?.(answers);
  const shown = (id: string) =>
    STEPS.find(s => s.id === id && !s.skip?.(answers));
  const kgToGo = Math.abs(answers.weightKg - (answers.targetWeightKg ?? 0));

  const submit = (patch: Answers) => {
    const next = { ...answers, ...editing?.pending, ...patch };
    if (isComplete(next)) {
      update(next); // targets are recalculated from these on every screen
      setEditing(null);
      // Picking the same answer again isn't worth celebrating.
      if (JSON.stringify(next) === JSON.stringify(answers)) return;
      const step = editing!.step;
      setSaved({
        before: targetsFor(answers),
        after: targetsFor(next),
        field: LABELS[step.id],
        value:
          step.id === 'name' ? displayName(next) : step.reply?.(next) ?? '',
      });
      return;
    }
    const missing = STEPS.find(s => !s.skip?.(next) && !s.isAnswered(next))!;
    // Drop the stale target so the box starts at a sensible value, as in onboarding.
    setEditing({
      step: missing,
      pending: { ...editing?.pending, ...patch, targetWeightKg: undefined },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your daily targets</Text>
          <Text style={styles.kcal}>{n(targets.calories)} kcal</Text>
          <Text style={styles.muted}>
            Protein {targets.proteinG} g · Carbs {targets.carbsG} g · Fat{' '}
            {targets.fatG} g
          </Text>
          <Text style={styles.reason}>
            {getWelcomePlan(answers, targets).reason}
          </Text>
        </View>

        {GROUPS.map(group => (
          <View key={group.title} style={styles.card}>
            <Text style={styles.cardLabel}>{group.title}</Text>
            {group.title === 'Your goal' && answers.goal !== 'maintain' && (
              // ponytail: no starting weight is stored, so "to go" rather than a progress bar.
              <Text style={styles.toGo}>
                {formatWeight(kgToGo, answers.weightUnit)} to go
                {targets.weeksToTarget
                  ? ` · about ${targets.weeksToTarget} weeks`
                  : ''}
              </Text>
            )}
            {group.ids.map(shown).map(
              (step, i) =>
                step && (
                  <Pressable
                    key={step.id}
                    onPress={() => setEditing({ step, pending: {} })}
                    accessibilityRole="button"
                    accessibilityLabel={`${LABELS[step.id]}: ${valueOf(step)}`}
                    accessibilityHint="Edit"
                    style={({ pressed }) => [
                      styles.row,
                      i > 0 && styles.divider,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.rowLabel}>{LABELS[step.id]}</Text>
                    <Text style={styles.rowValue}>{valueOf(step)}</Text>
                    <ChevronRight size={18} color={colors.text} opacity={0.4} />
                  </Pressable>
                ),
            )}
          </View>
        ))}

        <Text
          onPress={() => setDeleting(true)}
          accessibilityRole="button"
          suppressHighlighting
          style={styles.reset}
        >
          Delete my data
        </Text>
        <Text
          onPress={showBuildInfo}
          accessibilityRole="button"
          accessibilityHint="Shows build details"
          suppressHighlighting
          style={styles.version}
        >
          Kimbo v{version}
        </Text>
      </ScrollView>

      {editing && (
        <BottomSheet visible onClose={() => setEditing(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{LABELS[editing.step.id]}</Text>
            {Object.keys(editing.pending).length > 0 && (
              <Text style={styles.muted}>
                That change needs a new target weight too.
              </Text>
            )}
            <Composer
              key={editing.step.id}
              step={editing.step}
              answers={{ ...answers, ...editing.pending }}
              onSubmit={submit}
              onFinish={() => {}}
            />
          </View>
        </BottomSheet>
      )}

      {deleting && <DeleteDataModal onClose={() => setDeleting(false)} />}

      {saved && (
        <PlanUpdatedModal change={saved} onClose={() => setSaved(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  title: { fontSize: 24, fontFamily: fonts.extraBold },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardLabel: { fontSize: 13, fontFamily: fonts.semiBold, opacity: 0.6 },
  kcal: { fontSize: 28, fontFamily: fonts.extraBold, color: colors.primary },
  muted: { fontSize: 15, opacity: 0.7 },
  reason: { fontSize: 14, lineHeight: 20, marginTop: spacing.sm, opacity: 0.8 },
  toGo: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: spacing.sm,
  },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(28, 43, 36, 0.08)' },
  rowLabel: { flex: 1, fontSize: 15, opacity: 0.7 },
  rowValue: { fontSize: 16, fontFamily: fonts.semiBold, flexShrink: 1 },
  reset: {
    alignSelf: 'center',
    padding: spacing.md,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.alert,
  },
  version: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 13,
    opacity: 0.5,
  },
  sheet: { gap: spacing.lg },
  sheetTitle: { fontSize: 18, fontFamily: fonts.bold },
  pressed: { opacity: 0.8 },
});
