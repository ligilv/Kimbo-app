import { Camera, type LucideIcon, Keyboard, Mic } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { colors, fonts, radius, spacing } from '@/theme';

export type LogMode = 'photo' | 'voice' | 'text';

type Option = {
  mode: LogMode;
  icon: LucideIcon;
  title: string;
  body: string;
  ready: boolean;
};

// Photo and voice arrive in Phases 5B / 5C. Until then they show as "Coming soon",
// never as buttons that do nothing.
const OPTIONS: Option[] = [
  {
    mode: 'photo',
    icon: Camera,
    title: 'Snap your plate',
    body: 'Take or pick a photo',
    ready: false,
  },
  {
    mode: 'voice',
    icon: Mic,
    title: 'Say it',
    body: 'Tell Kimbo what you ate',
    ready: false,
  },
  {
    mode: 'text',
    icon: Keyboard,
    title: 'Type it',
    body: 'e.g. 2 chapatis and dal',
    ready: true,
  },
];

type Props = {
  date: DateKey;
  slot?: MealSlot;
  onClose: () => void;
  onChoose: (choice: { date: DateKey; slot: MealSlot; mode: LogMode }) => void;
};

export function KimboSheet({
  date,
  slot: initialSlot,
  onClose,
  onChoose,
}: Props) {
  const [slot, setSlot] = useState<MealSlot>(initialSlot ?? defaultSlotFor());

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
          <Pressable
            key={option.mode}
            onPress={() => onChoose({ date, slot, mode: option.mode })}
            disabled={!option.ready}
            accessibilityRole="button"
            accessibilityState={{ disabled: !option.ready }}
            accessibilityLabel={`${option.title}${
              option.ready ? '' : ', coming soon'
            }`}
            style={({ pressed }) => [
              styles.option,
              !option.ready && styles.optionSoon,
              pressed && styles.pressed,
            ]}
          >
            <IconBadge icon={option.icon} />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionBody}>{option.body}</Text>
            </View>
            {!option.ready && (
              <View style={styles.soonTag}>
                <Text style={styles.soonText}>Coming soon</Text>
              </View>
            )}
          </Pressable>
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
  optionSoon: { opacity: 0.55 },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 17, fontFamily: fonts.bold },
  optionBody: { fontSize: 14, opacity: 0.7 },
  soonTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(31, 77, 58, 0.1)',
  },
  soonText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
  pressed: { opacity: 0.8 },
});
