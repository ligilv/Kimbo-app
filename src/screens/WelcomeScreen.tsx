import { useNavigation } from '@react-navigation/native';
import Check from 'lucide-react-native/icons/check';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { Text } from '@/components/Text';
import { displayName, onboardingProgress } from '@/features/onboarding/script';
import { useAnswers } from '@/features/onboarding/useOnboarding';
import { colors, fonts, spacing, themedStyles } from '@/theme';

const POINTS = [
  'Tells you the one thing to do now, at your meal times',
  'Logs a meal from a photo or a sentence, and shows what it understood first',
  'Reads your blood report and helps you follow up on what matters',
];

export function WelcomeScreen() {
  const navigation = useNavigation();
  const [answers] = useAnswers();
  const returning = !!answers.name;
  const { done, total, next } = onboardingProgress(answers);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <Mascot size={112} mood="grin" />
        <Animated.View entering={FadeInDown.duration(400)} style={styles.intro}>
          <Text style={styles.title}>
            {returning ? `Welcome back, ${displayName(answers)}` : "Hi, I'm Mira"}
          </Text>
          <Text style={styles.subtitle}>
            {returning
              ? `${done} of ${total} questions done. Next: ${next.topic.toLowerCase()}.`
              : 'Your health assistant. I keep track so you don’t have to.'}
          </Text>
        </Animated.View>
        {!returning && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.points}>
            {POINTS.map(point => (
              <View key={point} style={styles.point}>
                <Check size={20} color={colors.ink} strokeWidth={2.4} />
                <Text style={styles.pointText}>{point}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={returning ? 'Continue' : "Let's go"} onPress={() => navigation.navigate('Onboarding')} />
        {!returning && <Text style={styles.small}>About a minute. No sign-up.</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.xl },
  intro: { gap: spacing.sm, alignItems: 'center' },
  title: { fontSize: 30, fontFamily: fonts.extraBold, textAlign: 'center' },
  subtitle: { fontSize: 17, lineHeight: 25, textAlign: 'center', color: colors.muted },
  points: { alignSelf: 'stretch', gap: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pointText: { flex: 1, fontSize: 16, lineHeight: 23 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.sm },
  small: { fontSize: 13, color: colors.muted, textAlign: 'center' },
}));
