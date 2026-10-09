import { useState } from 'react';
import { Alert, Switch, TextInput, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Segmented';
import { Text } from '@/components/Text';
import { TimeStepper } from '@/components/TimeStepper';
import { showToast } from '@/components/Toast';
import { formatTime } from '@/engine/time';
import { askForReminders } from '@/features/reminders/reminders';
import { toLocalDateKey } from '@/features/meals/dates';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import { type Medicine, removeMedicine, saveMedicine } from './medicineStore';

export type MedicineDraft = { name?: string; forKey?: string; time: string };

const DURATIONS = [
  { value: 0, label: 'Ongoing' },
  { value: 7, label: '1 week' },
  { value: 30, label: '1 month' },
  { value: 90, label: '3 months' },
];

// One sheet: what, how much, when, how long. Saving it puts the dose on Today
// (and a reminder) at that time. Pass `existing` to edit a medicine instead:
// it keeps its id and start date, so its dose history and dots stay.
export function MedicineSetupSheet({
  draft,
  existing,
  onClose,
  onSaved,
}: {
  draft?: MedicineDraft;
  existing?: Medicine;
  onClose: () => void;
  onSaved?: (medicine: Medicine) => void;
}) {
  const [name, setName] = useState(existing?.name ?? draft?.name ?? '');
  const [dose, setDose] = useState(existing?.dose ?? '1 tablet');
  const [time, setTime] = useState(existing?.time ?? draft?.time ?? '20:30');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>(existing?.frequency ?? 'daily');
  const [days, setDays] = useState(existing?.days ?? 0);
  const [remind, setRemind] = useState(existing?.remind ?? true);
  const valid = name.trim().length > 0 && dose.trim().length > 0;

  const save = () => {
    const medicine = saveMedicine({
      id: existing?.id,
      name: name.trim(),
      dose: dose.trim(),
      time,
      frequency,
      startDate: existing?.startDate ?? toLocalDateKey(new Date()),
      days: days || undefined,
      remind,
      forKey: existing?.forKey ?? draft?.forKey,
    });
    const done = existing ? 'updated' : 'added';
    showToast(
      remind
        ? `${medicine.name} ${done} · I'll remind you at ${formatTime(time)}`
        : `${medicine.name} ${done}`,
    );
    onSaved?.(medicine);
    if (remind) askForReminders();
    onClose();
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.title}>{existing ? 'Edit medicine' : 'Set up a medicine'}</Text>
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
            <Text style={styles.muted}>Reminds you at that time. Taken and Snooze work from the lock screen.</Text>
          </View>
          <Switch
            value={remind}
            onValueChange={setRemind}
            trackColor={{ true: colors.ink, false: colors.line }}
            thumbColor={colors.ground}
            accessibilityLabel="Remind me"
          />
        </View>
        <Button label={existing ? 'Save changes' : 'Save'} onPress={save} disabled={!valid} />
        {existing && (
          <Button
            small
            variant="ghost"
            label="Stop this medicine"
            onPress={() =>
              Alert.alert(`Stop ${existing.name}?`, "It won't show up on Today or remind you any more.", [
                { text: 'Keep', style: 'cancel' },
                {
                  text: 'Stop',
                  style: 'destructive',
                  onPress: () => {
                    removeMedicine(existing.id);
                    showToast(`${existing.name} stopped`);
                    onClose();
                  },
                },
              ])
            }
          />
        )}
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

const styles = themedStyles(() => ({
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
}));
