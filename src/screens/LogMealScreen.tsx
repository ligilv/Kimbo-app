import {
  type StaticScreenProps,
  useNavigation,
} from '@react-navigation/native';
import { Camera, ImageIcon, Mic, Square, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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
import {
  type PhotoResult,
  pickPhoto,
  takePhoto,
} from '@/features/logMeal/photo';
import { useMealChat } from '@/features/logMeal/useMealChat';
import { useSpeech } from '@/features/logMeal/useSpeech';
import {
  defaultSlotFor,
  formatDayLabel,
  isToday,
} from '@/features/meals/dates';
import { SLOT_LABEL } from '@/features/meals/format';
import { type MealSlot, MEAL_SLOTS } from '@/features/meals/types';
import {
  requestCamera,
  requestVoice,
} from '@/features/permissions/mediaPermissions';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = StaticScreenProps<{
  date: string;
  slot?: MealSlot;
  mode?: 'text' | 'photo' | 'voice';
  source?: 'camera' | 'gallery'; // for photo mode
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
  // Going back after a save is delayed so the "Saved" bubble shows; cancel it
  // if the user leaves first, or it would pop Home.
  const backTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(backTimer.current), []);

  const latestCardId = [...chat.messages]
    .reverse()
    .find(m => m.kind === 'card')?.id;

  const send = () => {
    if (!chat.slot) return;
    chat.send(draft);
    setDraft('');
  };

  const handlePhoto = (result: PhotoResult) => {
    if (result.kind === 'photo') chat.attachPhoto(result.photo);
    else if (result.kind === 'cancelled')
      chat.say(
        'No photo yet. Take one, pick from your gallery, or just type what you had.',
      );
    else
      chat.say(
        "I couldn't open that photo. Try again, or type what you had instead.",
      );
  };

  const openCamera = async () => {
    // Asked again here in case it was turned off since the sheet.
    if (!(await requestCamera())) {
      chat.say(
        'Camera access is off. Pick a photo from your gallery, or allow the camera in Settings.',
      );
      return;
    }
    handlePhoto(await takePhoto());
  };
  const openGallery = async () => handlePhoto(await pickPhoto());

  // Voice: the words go into the text box, live while speaking. Never sent
  // automatically, so food names like puttu or appam can be fixed first.
  const speech = useSpeech({
    onText: setDraft,
    onNothingHeard: () =>
      chat.say(
        "I didn't catch that. Tap the mic to try again, or type what you had.",
      ),
    onError: error =>
      chat.say(
        error !== 'start-failed' && error.code === 'NETWORK_ERROR'
          ? 'Voice needs an internet connection right now. Type what you had instead.'
          : "Voice isn't working right now. Type what you had instead.",
      ),
  });

  const toggleListening = async () => {
    if (speech.listening) return speech.stopListening();
    // Asked again in case it was turned off since the sheet (no popup if already allowed).
    const access = await requestVoice();
    if (access === 'ok') {
      setDraft('');
      speech.startListening();
    } else {
      chat.say(
        access === 'denied'
          ? 'Microphone access is off. Allow it in Settings, or type what you had.'
          : "Voice isn't available on this phone. Type what you had instead.",
      );
    }
  };

  // Photo mode opens the camera (or gallery) and voice mode starts listening
  // straight away, once. The ref holds the latest opener so the effect itself
  // only depends on the mode.
  const mode = route.params.mode;
  const isPhotoMode = mode === 'photo';
  const isVoiceMode = mode === 'voice';
  const openOnStart = useRef<() => void>(openCamera);
  openOnStart.current = isVoiceMode
    ? toggleListening
    : route.params.source === 'gallery'
    ? openGallery
    : openCamera;
  useEffect(() => {
    if (mode !== 'photo' && mode !== 'voice') return;
    const timer = setTimeout(() => openOnStart.current(), 350); // let the screen slide in first
    return () => clearTimeout(timer);
  }, [mode]);

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
              {message.kind === 'photo' && (
                <Image
                  source={{ uri: message.uri }}
                  style={styles.photo}
                  accessibilityLabel="Your meal photo"
                />
              )}
              {message.kind === 'user' && <UserBubble text={message.text} />}
              {message.kind === 'error' && (
                <View style={styles.errorBlock}>
                  <KimboBubble text={message.text} />
                  <Pressable
                    onPress={() => chat.retry(message.retry)}
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
                      backTimer.current = setTimeout(
                        () => navigation.goBack(),
                        BACK_TO_HOME_MS,
                      );
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
          {isPhotoMode && (
            <View style={styles.photoActions}>
              <Pressable
                onPress={openCamera}
                disabled={chat.thinking}
                accessibilityRole="button"
                style={styles.photoAction}
              >
                <Camera size={18} color={colors.primary} />
                <Text style={styles.photoActionText}>
                  {chat.photo ? 'Retake' : 'Take photo'}
                </Text>
              </Pressable>
              <Pressable
                onPress={openGallery}
                disabled={chat.thinking}
                accessibilityRole="button"
                style={styles.photoAction}
              >
                <ImageIcon size={18} color={colors.primary} />
                <Text style={styles.photoActionText}>Gallery</Text>
              </Pressable>
            </View>
          )}
          {isVoiceMode && (
            <Pressable
              onPress={toggleListening}
              disabled={chat.thinking}
              accessibilityRole="button"
              accessibilityLabel={
                speech.listening ? 'Stop listening' : 'Start speaking'
              }
              style={[styles.micButton, speech.listening && styles.micButtonOn]}
            >
              {speech.listening ? (
                <Square
                  size={18}
                  color={colors.background}
                  fill={colors.background}
                />
              ) : (
                <Mic size={20} color={colors.primary} />
              )}
              <Text
                style={[styles.micText, speech.listening && styles.micTextOn]}
              >
                {speech.listening ? 'Listening… tap to stop' : 'Tap to speak'}
              </Text>
            </Pressable>
          )}
          <ChatInput
            value={draft}
            onChangeText={setDraft}
            onSend={send}
            disabled={chat.thinking || !chat.slot}
            allowEmpty={!!chat.photo}
            placeholder={
              !chat.slot
                ? 'Pick a meal first'
                : chat.photo
                ? 'Add a note (optional), e.g. no ghee'
                : 'e.g. 2 chapatis, dal and curd'
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
  photo: {
    alignSelf: 'flex-end',
    width: 220,
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  photoActions: { flexDirection: 'row', gap: spacing.sm },
  micButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(242, 163, 58, 0.2)',
  },
  micButtonOn: { backgroundColor: colors.primary },
  micText: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.primary },
  micTextOn: { color: colors.background },
  photoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(242, 163, 58, 0.2)',
  },
  photoActionText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  slot: {
    minHeight: 44,
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
