import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { CyclingWords, THINKING_WORDS } from '@/components/chat/TypingIndicator';
import { Text } from '@/components/Text';
import { formatTime } from '@/engine/time';
import { flagged, getReports, latestReport } from '@/features/reports/reportStore';
import { useReportUpload } from '@/features/reports/useReportUpload';
import { colors, fonts, themedStyles } from '@/theme';
import { isComplete, planReason, type Step, type StepInput, targetsFor } from '../script';
import { type Answers, DEFAULT_MEAL_TIMES } from '../types';
import { MealTimesEditor } from './MealTimesEditor';
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
    case 'mealTimes':
      return (
        <MealTimesEditor
          initial={answers.mealTimes}
          onSave={mealTimes => onSubmit({ mealTimes })}
        />
      );
    case 'report':
      return <ReportComposer onSubmit={onSubmit} />;
    case 'finish':
      return <FinishCards answers={answers} onFinish={onFinish} />;
  }
}

function ReportComposer({ onSubmit }: { onSubmit: (patch: Answers) => void }) {
  const { state, upload, reading } = useReportUpload();
  const send = async (source: 'camera' | 'gallery' | 'pdf') => {
    if (await upload(source)) onSubmit({ reportStep: 'uploaded' });
  };
  if (reading)
    return (
      <View style={[styles.row, styles.reading]}>
        <ActivityIndicator color={colors.ink} />
        <View>
          <CyclingWords words={THINKING_WORDS.report} style={styles.readingWord} />
          <Text style={styles.hint}>About 20 seconds</Text>
        </View>
      </View>
    );
  return (
    <View style={styles.stack}>
      {state.kind === 'error' && <Text style={styles.hint}>{state.text}</Text>}
      <View style={styles.row}>
        <Button small variant="outline" label="Take a photo" onPress={() => send('camera')} style={styles.grow} />
        <Button small variant="outline" label="From gallery" onPress={() => send('gallery')} style={styles.grow} />
        <Button small variant="outline" label="PDF" onPress={() => send('pdf')} style={styles.grow} />
      </View>
      <Button small variant="ghost" label="Skip for now" onPress={() => onSubmit({ reportStep: 'skipped' })} />
    </View>
  );
}

// "Here's what I'll help with": your target, your report, your routine.
function FinishCards({ answers, onFinish }: { answers: Answers; onFinish: () => void }) {
  if (!isComplete(answers)) return null;
  const t = targetsFor(answers);
  const report = latestReport(getReports());
  const bad = report ? flagged(report) : [];
  const times = answers.mealTimes ?? DEFAULT_MEAL_TIMES;
  const cards = [
    {
      title: `${t.calories.toLocaleString('en-IN')} kcal and ${t.proteinG} g protein a day`,
      body: planReason(answers),
    },
    report
      ? {
          title: bad.length
            ? `${bad.length} of ${report.values.length} report values need attention`
            : 'Your report looks fine',
          body: bad.length
            ? `I'll ask about ${bad[0].label} first and help you follow up.`
            : 'Nothing to follow up. Add a new one from Health any time.',
        }
      : {
          title: 'Blood reports: add one any time from Health',
          body: "I'll read it and tell you, in plain words, what needs attention.",
        },
    {
      title: 'Short check-ins, at your times',
      body: answers.mealTimes?.varies
        ? "Your times vary, so I'll keep check-ins light."
        : `Around ${formatTime(times.breakfast)}, ${formatTime(times.lunch)} and ${formatTime(times.dinner)}. Snap, say or type what you ate.`,
    },
  ];
  return (
    <View style={styles.stack}>
      {cards.map(card => (
        <View key={card.title} style={styles.helpCard}>
          <Text style={styles.helpTitle}>{card.title}</Text>
          <Text style={styles.hint}>{card.body}</Text>
        </View>
      ))}
      <Button label="Start with today" onPress={onFinish} />
    </View>
  );
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
        placeholderTextColor={colors.muted}
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

const styles = themedStyles(() => ({
  stack: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pair: { flex: 1, flexDirection: 'row', gap: 8 },
  field: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.ink,
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
    borderColor: colors.line,
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
    backgroundColor: colors.well,
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
  hint: { fontSize: 14, lineHeight: 20, color: colors.muted },
  grow: { flex: 1, paddingHorizontal: 8 },
  reading: { minHeight: 48 },
  readingWord: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.ink },
  helpCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    gap: 2,
  },
  helpTitle: { fontSize: 16, fontFamily: fonts.bold },
  pressed: { opacity: 0.8 },
}));
