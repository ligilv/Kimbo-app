import Svg, { Circle } from 'react-native-svg';

type Props = {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor: string;
};

// A ring that fills clockwise from 12 o'clock.
export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
}: Props) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, progress)) * circumference;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {filled > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </Svg>
  );
}
