import { useEffect, useRef, useState } from 'react';
import {
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
import { Text } from '@/components/Text';
import { MiraBubble, UserBubble } from '@/components/chat/ChatBubble';
import { Mascot } from '@/components/Mascot';
import { Composer } from '@/features/onboarding/components/Composer';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import {
  onboardingProgress,
  STEPS,
  visibleSteps,
} from '@/features/onboarding/script';
import {
  useAnswers,
  useCompleteOnboarding,
} from '@/features/onboarding/useOnboarding';
import { colors, fonts } from '@/theme';

const TYPING_MS = 900;

export function OnboardingScreen() {
  const [answers, update] = useAnswers();
  const finish = useCompleteOnboarding();
  const [editingId, setEditingId] = useState<string | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  const steps = visibleSteps(answers);
  const current = steps[steps.length - 1];

  // Mira "types" before each new question. Questions already answered in an
  // earlier session show straight away.
  const [typingId, setTypingId] = useState<string | null>(null);
  const shownId = useRef(current.id);
  useEffect(() => {
    if (shownId.current === current.id) return;
    shownId.current = current.id;
    setTypingId(current.id);
    const timer = setTimeout(() => setTypingId(null), TYPING_MS);
    return () => clearTimeout(timer);
  }, [current.id]);

  const typing = typingId === current.id;
  const progress = onboardingProgress(answers);
  const composerStep = editingId
    ? STEPS.find(s => s.id === editingId)!
    : current;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Mascot size={36} inverted />
        <View style={styles.flex}>
          <Text style={styles.headerName}>Mira</Text>
          <Text style={styles.headerSub}>
            {typing ? 'typing…' : 'Your health assistant'}
          </Text>
        </View>
        <Text style={styles.headerProgress}>
          {progress.done < progress.total
            ? `${progress.done + 1} of ${progress.total}`
            : 'Done'}
        </Text>
      </View>
      <View
        style={styles.progressTrack}
        accessible
        accessibilityLabel={`${progress.done} of ${progress.total} questions answered`}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${(progress.done / progress.total) * 100}%` },
          ]}
        />
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
          // The reply area can grow (hints, unit toggle), shrinking this view.
          onLayout={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {steps.map(step => {
            const isTyping = typing && step.id === current.id;
            const answered = step !== current;
            return (
              <View key={step.id} style={styles.turn}>
                {isTyping ? (
                  <TypingIndicator />
                ) : (
                  <Animated.View entering={FadeInDown.duration(250)}>
                    <MiraBubble text={step.mira(answers)} />
                  </Animated.View>
                )}
                {answered && step.reply && (
                  <UserBubble
                    text={step.reply(answers)}
                    editing={editingId === step.id}
                    onPress={() =>
                      setEditingId(editingId === step.id ? null : step.id)
                    }
                  />
                )}
              </View>
            );
          })}
        </ScrollView>

        {!typing && (
          // Tall replies (meal times, the closing cards) scroll instead of squeezing the chat away.
          <ScrollView
            style={styles.composerScroll}
            contentContainerStyle={styles.composer}
            keyboardShouldPersistTaps="handled"
          >
            {editingId && (
              <View style={styles.editingBar}>
                <Text style={styles.editingText}>Changing your answer</Text>
                <Pressable
                  onPress={() => setEditingId(null)}
                  accessibilityRole="button"
                  hitSlop={12}
                >
                  <Text style={styles.editingCancel}>Cancel</Text>
                </Pressable>
              </View>
            )}
            <Composer
              key={composerStep.id}
              step={composerStep}
              answers={answers}
              onSubmit={patch => {
                update(patch);
                setEditingId(null);
              }}
              onFinish={finish}
            />
          </ScrollView>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerProgress: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  progressTrack: { height: 3, backgroundColor: colors.line },
  progressFill: { height: '100%', backgroundColor: colors.ink },
  headerName: { fontSize: 17, fontFamily: fonts.bold },
  headerSub: { fontSize: 13, color: colors.muted },
  messages: { padding: 16, gap: 14 },
  turn: { gap: 14 },
  composerScroll: { flexGrow: 0, maxHeight: '62%' },
  composer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 8 },
  editingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  editingText: { fontSize: 14, color: colors.muted },
  editingCancel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
});
