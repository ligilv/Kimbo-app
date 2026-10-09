import { type StaticScreenProps, useNavigation } from '@react-navigation/native';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { formatShortDate, toLocalDateKey } from '@/features/meals/dates';
import { useMedicines } from '@/features/medicines/medicineStore';
import { isComplete } from '@/features/onboarding/script';
import { useAnswers } from '@/features/onboarding/useOnboarding';
import { RangeBar } from '@/features/reports/RangeBar';
import { flagged, type Followup, history, recheckOn, useFollowups, useReports } from '@/features/reports/reportStore';
import type { ReportValue } from '@/features/reports/schema';
import { foodsFor } from '@/features/reports/WhyItMattersSheet';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

type Props = StaticScreenProps<{ reportId: string }>;

const monthDay = (date: string) => formatShortDate(date).split(', ')[1];

export function followupStatus(f: Followup | undefined, medicineName?: string) {
  if (!f) return null;
  if (f.state === 'treating')
    return medicineName ? `Taking ${medicineName}` : f.answer === 'prescribed' ? 'Seeing a doctor' : 'Already taking something';
  if (new Date(f.remindAt) <= new Date()) return 'Mira will ask you on Today';
  return `Mira will ask again on ${formatShortDate(toLocalDateKey(new Date(f.remindAt)))}`;
}

export function ReportResultScreen({ route }: Props) {
  const navigation = useNavigation();
  const reports = useReports();
  const followups = useFollowups();
  const medicines = useMedicines();
  const [answers] = useAnswers();
  const [showNormal, setShowNormal] = useState(false);
  const report = reports.find(r => r.id === route.params.reportId);
  if (!report) return null;
  const diet = isComplete(answers) ? answers.diet : 'veg';
  const bad = flagged(report);
  const normal = report.values.filter(v => v.status === 'normal');

  const row = (value: ReportValue) => {
    const f = followups.find(x => x.key === value.key);
    const med = medicines.find(m => m.id === f?.medicineId);
    const past = history(value.key, reports);
    const foods = value.status === 'normal' ? [] : foodsFor(value, diet);
    return (
      <View key={value.key} style={styles.value}>
        <View style={styles.valueHead}>
          <Text style={styles.valueLabel}>{value.label}</Text>
          <Text style={styles.valueNumber}>
            {value.value} {value.unit}
          </Text>
        </View>
        {value.status !== 'normal' && <Text style={styles.status}>{value.status === 'low' ? 'Low' : 'High'}</Text>}
        <RangeBar value={value.value} low={value.low} high={value.high} />
        {(value.low !== null || value.high !== null) && (
          <Text style={styles.muted}>
            {value.low === null
              ? `Healthy: under ${value.high}`
              : value.high === null
              ? `Healthy: over ${value.low}`
              : `Usual range ${value.low}–${value.high}`}{' '}
            {value.unit}
          </Text>
        )}
        {value.note && <Text style={styles.note}>{value.note}</Text>}
        {foods.length > 0 && <Text style={styles.muted}>Foods that help: {foods.join(', ')}</Text>}
        {past.length > 1 && (
          <Text style={styles.trend}>
            {past.map(p => `${monthDay(p.date)}: ${p.value.value}`).join(' → ')} · recheck ~{monthDay(recheckOn(past.at(-1)!.date))}
          </Text>
        )}
        {value.status !== 'normal' && f && (
          <Text style={styles.followup}>{followupStatus(f, med?.name)}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <ChevronLeft size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Report · {formatShortDate(report.takenOn)}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>
          {bad.length === 0
            ? `All ${report.values.length} values are in range.`
            : `${bad.length} of ${report.values.length} values need attention.`}
        </Text>
        {bad.length > 0 && <Text style={styles.lead}>The rest look fine.</Text>}
        {bad.map(row)}
        {normal.length > 0 && (
          <Pressable
            onPress={() => setShowNormal(s => !s)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showNormal }}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{normal.length} values in range</Text>
            {showNormal ? <ChevronUp size={18} color={colors.ink} /> : <ChevronDown size={18} color={colors.ink} />}
          </Pressable>
        )}
        {showNormal && normal.map(row)}
        <Text style={styles.disclaimer}>
          Mira reads the numbers on your report and explains them in plain words. It isn't medical advice; a doctor should decide on treatment.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.ground },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, minHeight: 52 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontFamily: fonts.bold },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 24, fontFamily: fonts.extraBold },
  lead: { fontSize: 16, color: colors.muted, marginTop: -spacing.sm },
  value: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  valueHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  valueLabel: { flex: 1, fontSize: 17, fontFamily: fonts.bold },
  valueNumber: { fontSize: 17, fontFamily: fonts.extraBold },
  status: { fontSize: 13, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  muted: { fontSize: 14, color: colors.muted },
  note: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  trend: { fontSize: 14, fontFamily: fonts.semiBold, marginTop: 4 },
  followup: { fontSize: 14, fontFamily: fonts.semiBold, marginTop: 4 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  toggleText: { fontSize: 16, fontFamily: fonts.semiBold },
  disclaimer: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: spacing.md },
}));
