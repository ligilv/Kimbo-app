import { useEffect, useState } from 'react';
import { type StyleProp, type TextStyle, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Mascot } from '@/components/Mascot';
import { colors, fonts, themedStyles } from '@/theme';

// What Mira says while she works, by kind of wait. Food-flavoured on purpose.
export const THINKING_WORDS = {
  photo: ['Squinting at the plate…', 'Counting rotis…', 'Eyeballing the katori…', 'Spotting the dal…', 'Adding up protein…'],
  text: ['Weighing it up…', 'Adding up protein…', 'Doing the maths…', 'Checking portions…'],
  report: ['Reading your report…', 'Checking ranges…', 'Finding what matters…', 'Putting it in plain words…'],
};

const WORD_MS = 1_500;

// One word at a time, fading to the next every 1.5 s; stays on the last one.
export function CyclingWords({ words, style }: { words: string[]; style?: StyleProp<TextStyle> }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setI(n => Math.min(n + 1, words.length - 1)), WORD_MS);
    return () => clearInterval(timer);
  }, [words]);
  return (
    <Animated.Text key={i} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={style}>
      {words[i]}
    </Animated.Text>
  );
}

function Dot({ delay }: { delay: number }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(-4, { duration: 250 }), withTiming(0, { duration: 250 })), -1),
    );
  }, [delay, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

// Mira's "typing" bubble. With `words` (a slow wait like a photo) it also
// shows what she's doing; screen readers just hear that she's thinking.
export function TypingIndicator({ words }: { words?: string[] }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={words ? 'Mira is thinking' : 'Mira is typing'}
      accessibilityLiveRegion="polite"
    >
      <Mascot size={28} />
      <View style={styles.bubble}>
        <View style={styles.dots}>
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </View>
        {words && <CyclingWords words={words} style={styles.word} />}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    backgroundColor: colors.well,
  },
  dots: { flexDirection: 'row', gap: 5 },
  word: { fontSize: 15, fontFamily: fonts.regular, color: colors.muted },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.ink, opacity: 0.6 },
}));
