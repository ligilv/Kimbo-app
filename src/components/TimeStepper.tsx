import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { fromMinutes, toMinutes } from '@/engine/time';
import { colors, fonts, radius, themedStyles } from '@/theme';

const HOLD_DELAY_MS = 400;
const REPEAT_MS = 90;
const MAX_REPEATS = 60; // a runaway hold stops on its own after ~5 s

type Unit = 'hour' | 'minute';

// "Breakfast   −  8 : 30 am  +". Tap the hour or the minutes to choose what
// − and + change (1 hour or 1 minute); hold a button to keep going.
// No clock picker: one row, works the same on both platforms.
export function TimeStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // "HH:MM"
  onChange: (value: string) => void;
}) {
  const [unit, setUnit] = useState<Unit>('minute');
  const total = toMinutes(value);
  const h = Math.floor(total / 60);
  const m = total % 60;

  // The latest value for the repeat timer, which outlives a render.
  const current = useRef(total);
  current.current = total;
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({});
  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
  };
  useEffect(() => stop, []);

  const step = (dir: 1 | -1) => {
    const now = current.current;
    // Minutes wrap within the hour (8:59 + 1 -> 8:00); hours wrap round the day.
    const next = fromMinutes(
      unit === 'minute' ? Math.floor(now / 60) * 60 + ((now % 60) + dir + 60) % 60 : now + dir * 60,
    );
    current.current = toMinutes(next);
    onChange(next);
  };
  // Hold to repeat. Stopped by any of: press out, the raw touch ending (iOS can
  // drop "press out" inside a sheet), or the repeat cap. A new press always
  // clears the last one first, so a timer can never be left running.
  const hold = (dir: 1 | -1) => {
    stop();
    step(dir);
    let repeats = 0;
    timers.current.delay = setTimeout(() => {
      timers.current.repeat = setInterval(() => {
        if (++repeats > MAX_REPEATS) return stop();
        step(dir);
      }, REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  const part = (which: Unit, text: string) => (
    <Pressable
      onPress={() => setUnit(which)}
      accessibilityRole="button"
      accessibilityState={{ selected: unit === which }}
      accessibilityLabel={`Change ${which}s`}
      hitSlop={6}
      style={[styles.part, unit === which && styles.partOn]}
    >
      <Text style={styles.time}>{text}</Text>
    </Pressable>
  );

  const button = (dir: 1 | -1) => (
    <Pressable
      onPressIn={() => hold(dir)}
      onPressOut={stop}
      onTouchEnd={stop}
      onTouchCancel={stop}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${dir > 0 ? 'later' : 'earlier'} by one ${unit}`}
      style={styles.button}
    >
      {dir > 0 ? <Plus size={18} color={colors.ink} /> : <Minus size={18} color={colors.ink} />}
    </Pressable>
  );

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {button(-1)}
      <View style={styles.clock} accessible={false}>
        {part('hour', String(h % 12 === 0 ? 12 : h % 12))}
        <Text style={styles.time}>:</Text>
        {part('minute', String(m).padStart(2, '0'))}
        <Text style={styles.ampm}>{h < 12 ? 'am' : 'pm'}</Text>
      </View>
      {button(1)}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingLeft: 16,
    minHeight: 52,
  },
  label: { flex: 1, fontSize: 16, fontFamily: fonts.semiBold },
  button: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  clock: { flexDirection: 'row', alignItems: 'center', minWidth: 96, justifyContent: 'center' },
  // The part − and + change is underlined.
  part: { paddingHorizontal: 3, minHeight: 36, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  partOn: { borderBottomColor: colors.ink },
  time: { fontSize: 16, fontFamily: fonts.bold },
  ampm: { fontSize: 14, fontFamily: fonts.semiBold, marginLeft: 4 },
}));
