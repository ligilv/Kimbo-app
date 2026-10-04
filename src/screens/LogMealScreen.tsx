import {
  type StaticScreenProps,
  useNavigation,
} from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KimboBubble, UserBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Text } from '@/components/Text';
import { ConfirmationCard } from '@/features/logMeal/ConfirmationCard';
import { useMealChat } from '@/features/logMeal/useMealChat';
import {
  defaultSlotFor,
  formatDayLabel,
  isToday,
} from '@/features/meals/dates';
import { SLOT_LABEL } from '@/features/meals/format';
import { type MealSlot, MEAL_SLOTS } from '@/features/meals/types';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = StaticScreenProps<{
  date: string;
  slot?: MealSlot;
  mode?: 'text' | 'photo' | 'voice'; // photo / voice arrive in Phases 5B / 5C
}>;

const BACK_TO_HOME_MS = 1200;

export function LogMealScreen({ route }: Props) {
  const navigation = useNavigation();
  const { date } = route.params;
  // Today guesses the meal from the time; a past day makes you pick.
  const initialSlot =
    route.params.slot ?? (isToday(date) ? defaultSlotFor() : undefined);
  const chat = useMealChat(date, initialSlot);
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);

  const latestCardId = [...chat.messages]
    .reverse()
    .find(m => m.kind === 'card')?.id;

  const send = () => {
    if (!chat.slot) return;
    chat.send(draft);
    setDraft('');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/kimbo-avatar.png')}
          style={styles.avatar}
        />
        <View style={styles.flex}>
          <Text style={styles.title}>Log a meal</Text>
          <Text style={styles.subtitle}>
            {chat.thinking ? 'thinking…' : formatDayLabel(date)}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.close}
        >
          <X size={22} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() =>
            scroll.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {chat.messages.map(message => (
            <Animated.View key={message.id} entering={FadeInDown.duration(220)}>
              {message.kind === 'kimbo' && <KimboBubble text={message.text} />}
              {message.kind === 'user' && (
                // Not editable here: tapping does nothing beyond the bubble's press state.
                <UserBubble
                  text={message.text}
                  editing={false}
                  onPress={() => {}}
                />
              )}
              {message.kind === 'error' && (
                <View style={styles.errorBlock}>
                  <KimboBubble text={message.text} />
                  <Pressable
                    onPress={() => chat.retry(message.retryQuery)}
                    accessibilityRole="button"
                    style={styles.retry}
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </View>
              )}
              {message.kind === 'card' && (
                <ConfirmationCard
                  rows={message.rows}
                  active={message.id === latestCardId && !message.saved}
                  saving={chat.saving}
                  onChangeQuantity={(i, q) =>
                    chat.changeQuantity(message.id, i, q)
                  }
                  onRemove={i => chat.removeRow(message.id, i)}
                  onEdit={() => setDraft(chat.editCard(message.id))}
                  onSave={() => {
                    if (chat.saveCard(message.id)) {
                      setTimeout(() => navigation.goBack(), BACK_TO_HOME_MS);
                    }
                  }}
                />
              )}
            </Animated.View>
          ))}
          {chat.thinking && <TypingIndicator />}
        </ScrollView>

        <View style={styles.composer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slots}
            keyboardShouldPersistTaps="handled"
          >
            {MEAL_SLOTS.map(s => (
              <Pressable
                key={s}
                onPress={() => chat.setSlot(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: s === chat.slot }}
                style={[styles.slot, s === chat.slot && styles.slotSelected]}
              >
                <Text
                  style={[
                    styles.slotText,
                    s === chat.slot && styles.slotTextSelected,
                  ]}
                >
                  {SLOT_LABEL[s]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ChatInput
            value={draft}
            onChangeText={setDraft}
            onSend={send}
            disabled={chat.thinking || !chat.slot}
            placeholder={
              chat.slot ? 'e.g. 2 chapatis, dal and curd' : 'Pick a meal first'
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28, 43, 36, 0.15)',
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  title: { fontSize: 17, fontFamily: fonts.bold },
  subtitle: { fontSize: 13, opacity: 0.7 },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: { padding: spacing.lg, gap: 14 },
  errorBlock: { gap: spacing.sm },
  retry: {
    marginLeft: 40,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: { fontSize: 15, fontFamily: fonts.bold, color: colors.primary },
  composer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  slots: { gap: spacing.sm },
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
});
