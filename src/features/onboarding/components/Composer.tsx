import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/Text';
import { colors, fonts } from '@/theme';
import type { Step, StepInput } from '../script';
import type { Answers } from '../types';
import { cmToFtIn, formatWeight, ftInToCm, kgToLb, lbToKg } from '../units';

type Props = {
  step: Step;
  answers: Answers;
  onSubmit: (patch: Answers) => void;
  onFinish: () => void;
};

// The reply area under the chat. What it shows depends on the question.
export function Composer({ step, answers, onSubmit, onFinish }: Props) {
  const input = step.input;
  switch (input.kind) {
    case 'text':
      return (
        <TextComposer input={input} answers={answers} onSubmit={onSubmit} />
      );
    case 'choice':
      return (
        <ChoiceComposer input={input} answers={answers} onSubmit={onSubmit} />
      );
    case 'age':
      return (
        <NumberComposer
          initial={answers.age ?? 25}
          min={13}
          max={100}
          suffix="years"
          onSubmit={age => onSubmit({ age })}
        />
      );
    case 'height':
      return <HeightComposer answers={answers} onSubmit={onSubmit} />;
    case 'weight':
      return (
        <WeightComposer
          field={input.field}
          answers={answers}
          onSubmit={onSubmit}
        />
      );
    case 'finish':
      return (
        <Pressable
          onPress={onFinish}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Log my first meal</Text>
        </Pressable>
      );
  }
}

function SendButton({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Send"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.send,
        disabled && styles.sendDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.sendIcon}>↑</Text>
    </Pressable>
  );
}

function TextComposer({
  input,
  answers,
  onSubmit,
}: {
  input: Extract<StepInput, { kind: 'text' }>;
  answers: Answers;
  onSubmit: (patch: Answers) => void;
}) {
  const [value, setValue] = useState(answers[input.field] ?? '');
  const trimmed = value.trim();
  const submit = () => trimmed && onSubmit({ [input.field]: trimmed });
  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={input.placeholder}
        placeholderTextColor="rgba(28, 43, 36, 0.45)"
        autoFocus
        autoCapitalize="words"
        maxLength={30}
        returnKeyType="send"
        onSubmitEditing={submit}
        style={[styles.field, styles.textField]}
      />
      <SendButton disabled={!trimmed} onPress={submit} />
    </View>
  );
}

function ChoiceComposer({
  input,
  answers,
  onSubmit,
}: {
  input: Extract<StepInput, { kind: 'choice' }>;
  answers: Answers;
  onSubmit: (patch: Answers) => void;
}) {
  const current = answers[input.field];
  return (
    <View style={styles.choices}>
      {input.options.map(option => {
        const selected = option.value === current;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSubmit({ [input.field]: option.value })}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.choice,
              selected && styles.choiceSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.choiceLabel}>{option.label}</Text>
            {option.hint ? (
              <Text style={styles.choiceHint}>{option.hint}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function UnitToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.toggle}>
      {options.map(o => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          style={[styles.toggleItem, o.value === value && styles.toggleItemOn]}
        >
          <Text
            style={[
              styles.toggleText,
              o.value === value && styles.toggleTextOn,
            ]}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  suffix: string;
};

// − [ 170 ] cm +   Type a number or nudge it with the buttons.
function NumberField({ value, onChange, min, max, suffix }: FieldProps) {
  const n = Number(value);
  const nudge = (by: number) =>
    onChange(
      String(Math.min(max, Math.max(min, (Number.isFinite(n) ? n : min) + by))),
    );
  return (
    <View style={styles.numberField}>
      <Pressable
        onPress={() => nudge(-1)}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${suffix}`}
        style={styles.stepper}
      >
        <Text style={styles.stepperText}>−</Text>
      </Pressable>
      <TextInput
        value={value}
        onChangeText={t => onChange(t.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        maxLength={5}
        selectTextOnFocus
        accessibilityLabel={suffix}
        style={styles.numberInput}
      />
      <Text style={styles.suffix}>{suffix}</Text>
      <Pressable
        onPress={() => nudge(1)}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${suffix}`}
        style={styles.stepper}
      >
        <Text style={styles.stepperText}>+</Text>
      </Pressable>
    </View>
  );
}

const inRange = (value: string, min: number, max: number) => {
  const n = Number(value);
  return value !== '' && Number.isFinite(n) && n >= min && n <= max;
};

function Hint({ text }: { text: string }) {
  return <Text style={styles.hint}>{text}</Text>;
}

function NumberComposer({
  initial,
  min,
  max,
  suffix,
  onSubmit,
}: {
  initial: number;
  min: number;
  max: number;
  suffix: string;
  onSubmit: (value: number) => void;
}) {
  const [value, setValue] = useState(String(initial));
  const valid = inRange(value, min, max);
  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <NumberField
          value={value}
          onChange={setValue}
          min={min}
          max={max}
          suffix={suffix}
        />
        <SendButton
          disabled={!valid}
          onPress={() => onSubmit(Math.round(Number(value)))}
        />
      </View>
      {!valid && <Hint text={`Between ${min} and ${max}`} />}
    </View>
  );
}

function HeightComposer({
  answers,
  onSubmit,
}: {
  answers: Answers;
  onSubmit: (patch: Answers) => void;
}) {
  const startCm = answers.heightCm ?? 165;
  const [unit, setUnit] = useState(answers.heightUnit ?? 'cm');
  const [cm, setCm] = useState(String(startCm));
  const [ft, setFt] = useState(String(cmToFtIn(startCm).ft));
  const [inches, setInches] = useState(String(cmToFtIn(startCm).in));

  const valid =
    unit === 'cm'
      ? inRange(cm, 100, 230)
      : inRange(ft, 3, 7) && inRange(inches, 0, 11);
  const heightCm =
    unit === 'cm'
      ? Math.round(Number(cm))
      : ftInToCm(Number(ft), Number(inches));

  // Carry the value across when switching units.
  const switchUnit = (next: 'cm' | 'ftin') => {
    if (next === unit) return;
    if (valid && next === 'ftin') {
      setFt(String(cmToFtIn(heightCm).ft));
      setInches(String(cmToFtIn(heightCm).in));
    } else if (valid) {
      setCm(String(heightCm));
    }
    setUnit(next);
  };

  return (
    <View style={styles.stack}>
      <UnitToggle
        options={[
          { value: 'cm', label: 'cm' },
          { value: 'ftin', label: 'ft · in' },
        ]}
        value={unit}
        onChange={switchUnit}
      />
      <View style={styles.row}>
        {unit === 'cm' ? (
          <NumberField
            value={cm}
            onChange={setCm}
            min={100}
            max={230}
            suffix="cm"
          />
        ) : (
          <View style={styles.pair}>
            <NumberField
              value={ft}
              onChange={setFt}
              min={3}
              max={7}
              suffix="ft"
            />
            <NumberField
              value={inches}
              onChange={setInches}
              min={0}
              max={11}
              suffix="in"
            />
          </View>
        )}
        <SendButton
          disabled={!valid}
          onPress={() => onSubmit({ heightCm, heightUnit: unit })}
        />
      </View>
      {!valid && (
        <Hint
          text={
            unit === 'cm'
              ? 'Between 100 and 230 cm'
              : 'Between 3′ 0″ and 7′ 11″'
          }
        />
      )}
    </View>
  );
}

const KG_RANGE = { min: 30, max: 250 };

function WeightComposer({
  field,
  answers,
  onSubmit,
}: {
  field: 'weightKg' | 'targetWeightKg';
  answers: Answers;
  onSubmit: (patch: Answers) => void;
}) {
  const isTarget = field === 'targetWeightKg';
  const current = answers.weightKg ?? 65;
  const fallback = isTarget
    ? current + (answers.goal === 'gain' ? 5 : -5)
    : current;
  const startKg = answers[field] ?? fallback;

  const [unit, setUnit] = useState(answers.weightUnit ?? 'kg');
  const [value, setValue] = useState(
    String(unit === 'kg' ? startKg : kgToLb(startKg)),
  );

  const range =
    unit === 'kg'
      ? KG_RANGE
      : { min: kgToLb(KG_RANGE.min), max: kgToLb(KG_RANGE.max) };
  const kg =
    unit === 'kg' ? Math.round(Number(value) * 10) / 10 : lbToKg(Number(value));
  const inRangeNow = inRange(value, range.min, range.max);
  const wrongWay =
    isTarget &&
    inRangeNow &&
    (answers.goal === 'lose' ? kg >= current : kg <= current);
  const valid = inRangeNow && !wrongWay;

  const switchUnit = (next: 'kg' | 'lb') => {
    if (next === unit) return;
    if (inRangeNow)
      setValue(String(next === 'kg' ? lbToKg(Number(value)) : kgToLb(kg)));
    setUnit(next);
  };

  const hint = !inRangeNow
    ? `Between ${range.min} and ${range.max} ${unit}`
    : wrongWay
    ? `Pick something ${
        answers.goal === 'lose' ? 'below' : 'above'
      } ${formatWeight(current, unit)}`
    : null;

  return (
    <View style={styles.stack}>
      {/* The unit is chosen once, with your current weight. */}
      {!isTarget && (
        <UnitToggle
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
          value={unit}
          onChange={switchUnit}
        />
      )}
      <View style={styles.row}>
        <NumberField
          value={value}
          onChange={setValue}
          min={range.min}
          max={range.max}
          suffix={unit}
        />
        <SendButton
          disabled={!valid}
          onPress={() =>
            onSubmit(
              isTarget ? { [field]: kg } : { [field]: kg, weightUnit: unit },
            )
          }
        />
      </View>
      {hint && <Hint text={hint} />}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pair: { flex: 1, flexDirection: 'row', gap: 8 },
  field: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 18,
    minHeight: 48,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  textField: { flex: 1 },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.35 },
  sendIcon: { color: colors.background, fontSize: 22, fontFamily: fonts.bold },
  // One full-width button per option, so short lists never leave a lone chip on a second row.
  choices: { gap: 8 },
  choice: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(31, 77, 58, 0.25)',
  },
  choiceSelected: { borderColor: colors.primary, borderWidth: 2 },
  choiceLabel: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  choiceHint: { fontSize: 14, marginTop: 2, opacity: 0.7 },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(31, 77, 58, 0.1)',
    borderRadius: 18,
    padding: 3,
  },
  toggleItem: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  toggleItemOn: { backgroundColor: colors.primary },
  toggleText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  toggleTextOn: { color: colors.background },
  numberField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    minHeight: 48,
    paddingHorizontal: 4,
  },
  stepper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 24,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  numberInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 22,
    fontFamily: fonts.extraBold,
    color: colors.text,
    paddingVertical: 0,
  },
  suffix: { flex: 1, fontSize: 16, marginLeft: 6, opacity: 0.7 },
  hint: { fontSize: 14, color: colors.text, opacity: 0.75, paddingLeft: 8 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontFamily: fonts.bold, color: colors.text },
  pressed: { opacity: 0.8 },
});
