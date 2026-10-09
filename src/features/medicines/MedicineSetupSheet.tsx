import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Segmented';
import { Text } from '@/components/Text';
import { TimeStepper } from '@/components/TimeStepper';
import { showToast } from '@/components/Toast';
import { formatTime } from '@/engine/time';
import { askForReminders } from '@/features/reminders/reminders';
import { toLocalDateKey } from '@/features/meals/dates';
import { colors, fonts, radius, spacing } from '@/theme';
import { type Medicine, saveMedicine } from './medicineStore';

export type MedicineDraft = { name?: string; forKey?: string; time: string };

const DURATIONS = [
  { value: 0, label: 'Ongoing' },
  { value: 7, label: '1 week' },
  { value: 30, label: '1 month' },
  { value: 90, label: '3 months' },
];

// One sheet: what, how much, when, how long. Saving it puts the dose on Today
// at that time; nothing else to set up.
export function MedicineSetupSheet({
  draft,
  onClose,
  onSaved,
}: {
  draft: MedicineDraft;
  onClose: () => void;
  onSaved?: (medicine: Medicine) => void;
}) {
  const [name, setName] = useState(draft.name ?? '');
  const [dose, setDose] = useState('1 tablet');
  const [time, setTime] = useState(draft.time);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [days, setDays] = useState(0);
  const [remind, setRemind] = useState(true);
  const valid = name.trim().length > 0 && dose.trim().length > 0;

  const save = () => {
    const medicine = saveMedicine({
      name: name.trim(),
      dose: dose.trim(),
      time,
      frequency,
      startDate: toLocalDateKey(new Date()),
      days: days || undefined,
      remind,
      forKey: draft.forKey,
    });
    showToast(
      remind
        ? `${medicine.name} added · I'll remind you at ${formatTime(time)}`
        : `${medicine.name} added`,
    );
    onSaved?.(medicine);
    if (remind) askForReminders();
    onClose();
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.title}>Set up a medicine</Text>
        <Field label="Name">
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Vitamin D3 60K" placeholderTextColor={colors.muted} style={styles.input} maxLength={60} />
        </Field>
        <Field label="Dose">
          <TextInput value={dose} onChangeText={setDose} placeholder="e.g. 1 capsule" placeholderTextColor={colors.muted} style={styles.input} maxLength={40} />
        </Field>
        <TimeStepper label="When" value={time} onChange={setTime} />
        <Segmented
          label="How often"
          options={[
            { value: 'daily', label: 'Every day' },
            { value: 'weekly', label: 'Once a week' },
          ]}
          value={frequency}
          onChange={setFrequency}
        />
        <Segmented label="For how long" options={DURATIONS} value={days} onChange={setDays} />
        <View style={styles.toggle}>
          <View style={styles.flex}>
            <Text style={styles.toggleLabel}>Remind me</Text>
            <Text style={styles.muted}>A notification at that time, with a Taken button.</Text>
          </View>
          <Switch
            value={remind}
            onValueChange={setRemind}
            trackColor={{ true: colors.ink, false: colors.line }}
            thumbColor={colors.ground}
            accessibilityLabel="Remind me"
          />
        </View>
        <Button label="Save" onPress={save} disabled={!valid} />
      </View>
    </BottomSheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 20, fontFamily: fonts.extraBold },
  field: { gap: 4 },
  fieldLabel: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.muted },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  toggleLabel: { fontSize: 16, fontFamily: fonts.semiBold },
  muted: { fontSize: 13, color: colors.muted },
  flex: { flex: 1 },
});
