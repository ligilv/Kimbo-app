import { useNavigation } from '@react-navigation/native';
import Settings from 'lucide-react-native/icons/settings';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/BottomSheet';
import { CyclingWords, THINKING_WORDS } from '@/components/chat/TypingIndicator';
import { Segmented } from '@/components/Segmented';
import { type Appearance, changeAppearance, useAppearance } from '@/features/appearance/appearance';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { showToast } from '@/components/Toast';
import { API_URL } from '@/config';
import { formatTime } from '@/engine/time';
import { loadDemoAccount } from '@/features/demo/demoAccount';
import { addDays, formatShortDate, toLocalDateKey } from '@/features/meals/dates';
import { MedicineSetupSheet } from '@/features/medicines/MedicineSetupSheet';
import { type DayMark, type Medicine, useAdherence, useMedicines } from '@/features/medicines/medicineStore';
import { MealTimesEditor } from '@/features/onboarding/components/MealTimesEditor';
import { targetsFor } from '@/features/onboarding/script';
import { DEFAULT_MEAL_TIMES, type Profile } from '@/features/onboarding/types';
import { useAnswers } from '@/features/onboarding/useOnboarding';
import { EditPlanSheet } from '@/features/plan/EditPlanSheet';
import { DeleteDataModal } from '@/features/profile/DeleteDataModal';
import { flagged, latestReport, useFollowups, useReports } from '@/features/reports/reportStore';
import { type UploadSource, useReportUpload } from '@/features/reports/useReportUpload';
import { getDeviceId } from '@/features/sync/deviceId';
import { readOutbox } from '@/features/sync/outbox';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';
import { version } from '../../package.json';
import { followupStatus } from './ReportResultScreen';

const WEEK = 7;

function Dots({ medicine, days, today }: { medicine: Medicine; days: string[]; today: string }) {
  const marks: DayMark[] = useAdherence(medicine, days, today);
  const taken = marks.filter(m => m === 'taken').length;
  const due = marks.filter(m => m !== 'none').length;
  return (
    <View style={styles.dots} accessible accessibilityLabel={`Taken ${taken} of ${due} times this week`}>
      {marks.map((m, i) => (
        <View key={i} style={[styles.dot, m === 'taken' && styles.dotTaken, m === 'none' && styles.dotNone]} />
      ))}
    </View>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function HealthScreen({ profile }: { profile: Profile }) {
  const navigation = useNavigation();
  const [, update] = useAnswers();
  const reports = useReports();
  const followups = useFollowups();
  const medicines = useMedicines();
  const upload = useReportUpload();
  const appearance = useAppearance();
  const [sheet, setSheet] = useState<'plan' | 'settings' | 'times' | 'medicine' | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const today = toLocalDateKey(new Date());
  const week = Array.from({ length: WEEK }, (_, i) => addDays(today, i - WEEK + 1));
  const targets = targetsFor(profile);
  const latest = latestReport(reports);
  const attention = latest ? flagged(latest) : [];

  const send = async (source: UploadSource) => {
    const report = await upload.upload(source);
    if (report) navigation.navigate('ReportResult', { reportId: report.id });
  };

  // Five quick taps on the version: load the reviewer demo account.
  const taps = useRef({ count: 0, timer: undefined as ReturnType<typeof setTimeout> | undefined });
  useEffect(() => () => clearTimeout(taps.current.timer), []);
  const onVersionTap = () => {
    const t = taps.current;
    clearTimeout(t.timer);
    t.count += 1;
    if (t.count >= 5) {
      t.count = 0;
      Alert.alert('Open the demo account?', 'This replaces everything on this phone with a sample profile, a month of meals, a report and a medicine.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open demo',
          onPress: () => {
            setSheet(null);
            loadDemoAccount();
          },
        },
      ]);
      return;
    }
    t.timer = setTimeout(() => {
      if (t.count === 1)
        Alert.alert('About this build', [`Version ${version} (${__DEV__ ? 'debug' : 'release'})`, `Server: ${API_URL}`, `Changes waiting to sync: ${readOutbox().length}`, `Device ID: ${getDeviceId().slice(0, 8)}`].join('\n'));
      t.count = 0;
    }, 600);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Health</Text>
        <Pressable onPress={() => setSheet('settings')} accessibilityRole="button" accessibilityLabel="Settings" style={styles.iconButton}>
          <Settings size={22} color={colors.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Section title="Needs attention">
          {attention.length === 0 ? (
            <Text style={styles.muted}>
              {latest ? 'Everything on your last report is in range.' : "Nothing flagged yet. Add a blood report and I'll tell you what needs attention, in plain words."}
            </Text>
          ) : (
            attention.map(v => {
              const f = followups.find(x => x.key === v.key);
              const med = medicines.find(m => m.id === f?.medicineId);
              return (
                <Pressable
                  key={v.key}
                  onPress={() => navigation.navigate('ReportResult', { reportId: latest!.id })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>
                      {v.label} · {v.status === 'low' ? 'low' : 'high'}
                    </Text>
                    <Text style={styles.muted}>{followupStatus(f, med?.name) ?? `${v.value} ${v.unit}`}</Text>
                  </View>
                  <Text style={styles.rowValue}>
                    {v.value} {v.unit}
                  </Text>
                </Pressable>
              );
            })
          )}
        </Section>

        <Section
          title="Medicines"
          action={<Button small variant="ghost" label="Add" onPress={() => setSheet('medicine')} />}
        >
          {medicines.length === 0 ? (
            <Text style={styles.muted}>None yet. Add one and I'll ask at the right time each day.</Text>
          ) : (
            medicines.map(m => (
              <Pressable
                key={m.id}
                onPress={() => setEditingMedicine(m)}
                accessibilityRole="button"
                accessibilityHint="Edit or stop this medicine"
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{m.name}</Text>
                  <Text style={styles.muted}>
                    {m.dose} · {m.frequency === 'daily' ? 'daily' : 'weekly'} at {formatTime(m.time)}
                  </Text>
                </View>
                <Dots medicine={m} days={week} today={today} />
              </Pressable>
            ))
          )}
        </Section>

        <Section title="Reports">
          {upload.reading ? (
            <View style={styles.reading}>
              <ActivityIndicator color={colors.ink} />
              <View>
                <CyclingWords words={THINKING_WORDS.report} style={styles.readingWord} />
                <Text style={styles.muted}>About 20 seconds</Text>
              </View>
            </View>
          ) : (
            <View style={styles.uploadRow}>
              <Button small variant="outline" label="Take a photo" onPress={() => send('camera')} />
              <Button small variant="outline" label="From gallery" onPress={() => send('gallery')} />
              <Button small variant="outline" label="PDF" onPress={() => send('pdf')} />
            </View>
          )}
          {upload.state.kind === 'error' && <Text style={styles.error}>{upload.state.text}</Text>}
          {[...reports].sort((a, b) => b.takenOn.localeCompare(a.takenOn)).map(r => (
            <Pressable
              key={r.id}
              onPress={() => navigation.navigate('ReportResult', { reportId: r.id })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{formatShortDate(r.takenOn)}</Text>
                <Text style={styles.muted}>
                  {flagged(r).length} of {r.values.length} need attention
                </Text>
              </View>
            </Pressable>
          ))}
        </Section>

        <Section title="Your plan">
          <View style={styles.plan}>
            <Text style={styles.kcal}>{targets.calories.toLocaleString('en-IN')} kcal a day</Text>
            <Text style={styles.muted}>
              Protein {targets.proteinG} g · Carbs {targets.carbsG} g · Fat {targets.fatG} g
            </Text>
            <Text style={styles.planWhy}>
              Your body burns about {targets.tdee.toLocaleString('en-IN')} kcal on a normal day.
              {profile.goal === 'lose'
                ? ` Eating ${(targets.tdee - targets.calories).toLocaleString('en-IN')} less means about ${targets.kgPerWeek} kg a week.`
                : profile.goal === 'gain'
                ? ` A small ${(targets.calories - targets.tdee).toLocaleString('en-IN')} kcal extra builds muscle without much fat.`
                : ' Eating that much keeps your weight steady.'}
            </Text>
            <Button small variant="outline" label="Edit plan" onPress={() => setSheet('plan')} style={styles.alignStart} />
          </View>
        </Section>
      </ScrollView>

      {sheet === 'plan' && (
        <EditPlanSheet profile={profile} onSave={next => update(next)} onClose={() => setSheet(null)} />
      )}
      {editingMedicine && (
        <MedicineSetupSheet existing={editingMedicine} onClose={() => setEditingMedicine(null)} />
      )}
      {sheet === 'medicine' && (
        <MedicineSetupSheet draft={{ time: (profile.mealTimes ?? DEFAULT_MEAL_TIMES).dinner }} onClose={() => setSheet(null)} />
      )}
      {sheet === 'times' && (
        <BottomSheet visible onClose={() => setSheet(null)}>
          <View style={styles.sheetBody}>
            <Text style={styles.sheetTitle}>Meal times</Text>
            <MealTimesEditor
              initial={profile.mealTimes}
              saveLabel="Save"
              onSave={mealTimes => {
                update({ mealTimes });
                showToast('Meal times saved');
                setSheet(null);
              }}
            />
          </View>
        </BottomSheet>
      )}
      {sheet === 'settings' && (
        <BottomSheet visible onClose={() => setSheet(null)}>
          <View style={styles.sheetBody}>
            <Text style={styles.sheetTitle}>Settings</Text>
            <Text style={styles.settingLabel}>Appearance</Text>
            <Segmented<Appearance>
              label="Appearance"
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              value={appearance}
              onChange={next => {
                // The sheet is its own window above the app: close it first so
                // the switch animation covers the whole screen.
                setSheet(null);
                setTimeout(() => changeAppearance(next), 60);
              }}
            />
            <Button variant="outline" label="Meal times" onPress={() => setSheet('times')} />
            <Button variant="outline" label="Edit plan" onPress={() => setSheet('plan')} />
            <Button
              variant="ghost"
              label="Delete my data"
              onPress={() => {
                setSheet(null);
                setDeleting(true);
              }}
            />
            <Text onPress={onVersionTap} accessibilityRole="button" suppressHighlighting style={styles.version}>
              Mira v{version}
            </Text>
          </View>
        </BottomSheet>
      )}
      {deleting && <DeleteDataModal onClose={() => setDeleting(false)} />}
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  title: { flex: 1, fontSize: 26, fontFamily: fonts.extraBold },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xl * 2 },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  sectionTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  rowTitle: { fontSize: 16, fontFamily: fonts.semiBold },
  rowValue: { fontSize: 15, fontFamily: fonts.bold },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  error: { fontSize: 14, fontFamily: fonts.semiBold },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.ink },
  dotTaken: { backgroundColor: colors.ink },
  dotNone: { borderColor: colors.line },
  uploadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  readingWord: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.ink },
  plan: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: 6 },
  kcal: { fontSize: 22, fontFamily: fonts.extraBold },
  planWhy: { fontSize: 15, lineHeight: 22 },
  alignStart: { alignSelf: 'flex-start', marginTop: spacing.sm },
  sheetBody: { gap: spacing.sm, paddingBottom: spacing.sm },
  settingLabel: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.muted },
  sheetTitle: { fontSize: 20, fontFamily: fonts.extraBold, marginBottom: spacing.xs },
  version: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: spacing.md },
  pressed: { opacity: 0.6 },
}));
