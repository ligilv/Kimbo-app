import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/theme';

export type Mood = 'smile' | 'flat' | 'grin';

// Only the mouth changes with mood; the ring never does.
const MOUTH: Record<Mood, string> = {
  smile: 'M48.5,59.5 Q54.5,65.5 61.5,58.5',
  flat: 'M48.5,60.5 L61.5,60.5',
  grin: 'M47,57.5 Q54.5,68 62.5,57.5',
};

// The ring's tip: the only teal in the mark (files/mira).
const TIP = '#14B8A6';

// Mira: the app-icon mark. A ring with a teal tip, two eyes and a mouth.
export function Mascot({
  size = 32,
  mood = 'smile',
  inverted = false,
}: {
  size?: number;
  mood?: Mood;
  inverted?: boolean; // white on a black circle, as in the app icon
}) {
  const ink = inverted ? colors.ground : colors.ink;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="18 18 72 72"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {inverted && <Circle cx={54} cy={54} r={36} fill={colors.ink} />}
      <Path d="M78,54 A24,24 0 1,1 37.03,37.03" stroke={ink} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Path d="M37.03,37.03 A24,24 0 0,1 54,30" stroke={TIP} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Path d="M47.5,46.5 L47.5,51.5" stroke={ink} strokeWidth={3.8} strokeLinecap="round" />
      <Path d="M60,46.5 L60,51.5" stroke={ink} strokeWidth={3.8} strokeLinecap="round" />
      <Path d={MOUTH[mood]} stroke={ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
