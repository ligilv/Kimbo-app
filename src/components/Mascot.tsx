import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/theme';

export type Mood = 'smile' | 'flat' | 'grin';

const MOUTH: Record<Mood, string> = {
  smile: 'M11 19 Q16 23 21 19',
  flat: 'M11.5 20 L20.5 20',
  grin: 'M10 18 Q16 25 22 18 Z',
};

// Mira: a stroke face in a circle. Only the mouth changes, no colour, no emoji.
export function Mascot({
  size = 32,
  mood = 'smile',
  inverted = false,
}: {
  size?: number;
  mood?: Mood;
  inverted?: boolean; // white on black, for overdue messages
}) {
  const ink = inverted ? colors.ground : colors.ink;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle
        cx={16}
        cy={16}
        r={15}
        fill={inverted ? colors.ink : colors.ground}
        stroke={ink}
        strokeWidth={1.5}
      />
      <Circle cx={11.5} cy={13} r={1.4} fill={ink} />
      <Circle cx={20.5} cy={13} r={1.4} fill={ink} />
      <Path
        d={MOUTH[mood]}
        stroke={ink}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill={mood === 'grin' ? ink : 'none'}
      />
    </Svg>
  );
}
