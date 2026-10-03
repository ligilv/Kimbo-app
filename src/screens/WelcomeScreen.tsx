import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import {
  ArrowRight,
  type LucideIcon,
  MessageCircle,
  PencilLine,
  Target,
  Timer,
  UserCheck,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBadge } from '@/components/IconBadge';
import { Text } from '@/components/Text';
import { displayName, onboardingProgress } from '@/features/onboarding/script';
import type { Answers } from '@/features/onboarding/types';
import { useAnswers } from '@/features/onboarding/useOnboarding';
import { colors, fonts } from '@/theme';

type Point = { icon: LucideIcon; title: string; body: string };

const NEW_POINTS: Point[] = [
  {
    icon: MessageCircle,
    title: 'A quick chat, about a minute',
    body: "I'll ask a few questions about you and your goal.",
  },
  {
    icon: Target,
    title: 'Targets made for your body',
    body: 'Your age, height, weight and activity decide how much you should eat each day. No generic 2,000 kcal.',
  },
  {
    icon: UserCheck,
    title: 'No sign-up needed',
    body: 'No account or password. Your answers are only used to build your plan.',
  },
];

const SECONDS_PER_QUESTION = 6;

function returningPoints(answers: Answers): Point[] {
  const { done, total, next } = onboardingProgress(answers);
  const left = total - done;
  const seconds = Math.max(
    10,
    Math.round((left * SECONDS_PER_QUESTION) / 10) * 10,
  );
  return [
    {
      icon: ArrowRight,
      title: `Next up: ${next.topic.toLowerCase()}`,
      body:
        left > 1 ? `Then ${left - 1} more after that.` : "That's the last one!",
    },
    {
      icon: Timer,
      title:
        seconds >= 60 ? 'About a minute left' : `About ${seconds} seconds left`,
      body: "Then you'll see your daily calorie and protein targets.",
    },
    {
      icon: PencilLine,
      title: 'Your answers are saved',
      body: 'Tap any of them in the chat to change it.',
    },
  ];
}

export function WelcomeScreen() {
  const navigation = useNavigation();
  const [answers] = useAnswers();
  const returning = !!answers.name;
  const progress = onboardingProgress(answers);
  const points = returning ? returningPoints(answers) : NEW_POINTS;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bounces={false}
      >
        <LottieView
          source={require('@/assets/lottie/kimbo_loader_light_bg.json')}
          autoPlay
          loop
          style={styles.mascot}
        />
        <Animated.View entering={FadeInDown.duration(400)} style={styles.intro}>
          <Text style={styles.title}>
            {returning
              ? `Hi ${displayName(answers)}, welcome\u00A0back\u00A0👋`
              : "Hi, I'm Kimbo"}
          </Text>
          <Text style={styles.subtitle}>
            {returning
              ? "Let's continue where you left off."
              : 'I help you eat in a way that fits your body, and show how your meals connect to your goals.'}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>
            {returning ? "Here's where you are" : "First, let's set you up"}
          </Text>
          {returning && (
            <View
              style={styles.progress}
              accessible
              accessibilityLabel={`${progress.done} of ${progress.total} questions done`}
            >
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(progress.done / progress.total) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progress.done} of {progress.total} questions done
              </Text>
            </View>
          )}
          {points.map(point => (
            <View key={point.title} style={styles.point}>
              <IconBadge icon={point.icon} />
              <View style={styles.pointText}>
                <Text style={styles.pointTitle}>{point.title}</Text>
                <Text style={styles.pointBody}>{point.body}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={styles.footer}
      >
        <Pressable
          onPress={() => navigation.navigate('Onboarding')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>
            {returning ? 'Continue' : "Let's get started"}
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  // Fills the space above the button and centres the block in it, so tall phones
  // don't end up with an empty band under the card.
  scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 },
  mascot: { width: 140, height: 140, alignSelf: 'center' },
  intro: { gap: 8 },
  title: { fontSize: 32, fontFamily: fonts.extraBold, textAlign: 'center' },
  subtitle: { fontSize: 17, lineHeight: 25, textAlign: 'center', opacity: 0.8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    gap: 18,
  },
  cardTitle: { fontSize: 18, fontFamily: fonts.bold },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  progress: { gap: 8 },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(31, 77, 58, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  progressText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  pointText: { flex: 1, gap: 2 },
  pointTitle: { fontSize: 16, fontFamily: fonts.semiBold },
  pointBody: { fontSize: 15, lineHeight: 21, opacity: 0.75 },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontFamily: fonts.bold, color: colors.text },
  pressed: { opacity: 0.8 },
});
