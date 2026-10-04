import { Camera, type LucideIcon, Keyboard, Mic } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { IconBadge } from '@/components/IconBadge';
import { Text } from '@/components/Text';
import {
  type DateKey,
  defaultSlotFor,
  formatShortDate,
  isToday,
} from '@/features/meals/dates';
import { SLOT_LABEL } from '@/features/meals/format';
import { type MealSlot, MEAL_SLOTS } from '@/features/meals/types';
import {
  requestCamera,
  requestVoice,
} from '@/features/permissions/mediaPermissions';
import { colors, fonts, radius, spacing } from '@/theme';

export type LogMode = 'photo' | 'voice' | 'text';
export type PhotoSource = 'camera' | 'gallery';

type Option = {
  mode: LogMode;
  icon: LucideIcon;
  title: string;
  body: string;
};

const OPTIONS: Option[] = [
  {
    mode: 'photo',
    icon: Camera,
    title: 'Snap your plate',
    body: 'Take or pick a photo',
  },
  {
    mode: 'voice',
    icon: Mic,
    title: 'Say it',
    body: 'Tell Kimbo what you ate',
  },
  {
    mode: 'text',
    icon: Keyboard,
    title: 'Type it',
    body: 'e.g. 2 chapatis and dal',
  },
];

type Props = {
  date: DateKey;
  slot?: MealSlot;
  onClose: () => void;
  onChoose: (choice: {
    date: DateKey;
    slot: MealSlot;
    mode: LogMode;
    source?: PhotoSource;
  }) => void;
};

export function KimboSheet({
  date,
  slot: initialSlot,
  onClose,
  onChoose,
}: Props) {
  const [slot, setSlot] = useState<MealSlot>(initialSlot ?? defaultSlotFor());
  const [cameraOff, setCameraOff] = useState(false);
  const [voiceProblem, setVoiceProblem] = useState<
    'unavailable' | 'denied' | null
  >(null);

  // Camera and microphone are asked for here, at the moment they're needed.
  const choose = async (mode: LogMode) => {
    if (mode === 'photo') {
      if (await requestCamera())
        onChoose({ date, slot, mode, source: 'camera' });
      else setCameraOff(true);
      return;
    }
    if (mode === 'voice') {
      const access = await requestVoice();
      if (access === 'ok') onChoose({ date, slot, mode });
      else setVoiceProblem(access);
      return;
    }
    onChoose({ date, slot, mode });
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title}>Log a meal</Text>
          {!isToday(date) && (
            <Text style={styles.forDay}>
              Logging for {formatShortDate(date)}
            </Text>
          )}
        </View>

        <View style={styles.slots}>
          {MEAL_SLOTS.map(s => (
            <Pressable
              key={s}
              onPress={() => setSlot(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: s === slot }}
              style={[styles.slot, s === slot && styles.slotSelected]}
            >
              <Text
                style={[styles.slotText, s === slot && styles.slotTextSelected]}
              >
                {SLOT_LABEL[s]}
              </Text>
            </Pressable>
          ))}
        </View>

        {OPTIONS.map(option => (
          <View key={option.mode} style={styles.optionWrap}>
            <Pressable
              onPress={() => choose(option.mode)}
              accessibilityRole="button"
              accessibilityLabel={option.title}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.pressed,
              ]}
            >
              <IconBadge icon={option.icon} />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionBody}>{option.body}</Text>
              </View>
            </Pressable>
            {option.mode === 'photo' && cameraOff && (
              <View style={styles.cameraOff}>
                <Text style={styles.cameraOffText}>Camera access is off.</Text>
                <View style={styles.cameraOffActions}>
                  <Pressable
                    onPress={() => Linking.openSettings()}
                    accessibilityRole="button"
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>Allow in Settings</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      onChoose({ date, slot, mode: 'photo', source: 'gallery' })
                    }
                    accessibilityRole="button"
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>Pick from gallery</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {option.mode === 'voice' && voiceProblem && (
              <View style={styles.cameraOff}>
                <Text style={styles.cameraOffText}>
                  {voiceProblem === 'denied'
                    ? 'Microphone access is off.'
                    : "Voice isn't available on this phone."}
                </Text>
                <View style={styles.cameraOffActions}>
                  {voiceProblem === 'denied' && (
                    <Pressable
                      onPress={() => Linking.openSettings()}
                      accessibilityRole="button"
                      style={styles.linkButton}
                    >
                      <Text style={styles.linkText}>Allow in Settings</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => onChoose({ date, slot, mode: 'text' })}
                    accessibilityRole="button"
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>Type it instead</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.sm },
  heading: { gap: 2 },
  title: { fontSize: 22, fontFamily: fonts.extraBold },
  forDay: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.primary },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(31, 77, 58, 0.25)',
    backgroundColor: colors.surface,
  },
  slotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotText: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.primary },
  slotTextSelected: { color: colors.background },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 17, fontFamily: fonts.bold },
  optionBody: { fontSize: 14, opacity: 0.7 },
  optionWrap: { gap: spacing.xs },
  cameraOff: { paddingHorizontal: spacing.lg, gap: 2 },
  cameraOffText: { fontSize: 14, opacity: 0.75 },
  cameraOffActions: { flexDirection: 'row', gap: spacing.lg },
  linkButton: { minHeight: 44, justifyContent: 'center' },
  linkText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.8 },
});
