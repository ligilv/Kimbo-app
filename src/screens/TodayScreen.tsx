import { useNavigation } from '@react-navigation/native';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Camera from 'lucide-react-native/icons/camera';
import Mic from 'lucide-react-native/icons/mic';
import Square from 'lucide-react-native/icons/square';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { MiraBubble, UserBubble } from '@/components/chat/ChatBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Text } from '@/components/Text';
import { showToast } from '@/components/Toast';
import { type Chip, nearestSlot, type NextAction } from '@/engine/nextAction';
import { markHandled, snooze } from '@/features/day/dayState';
import { takePhoto, pickPhoto, type PhotoResult } from '@/features/logMeal/photo';
import { useSpeech } from '@/features/logMeal/useSpeech';
import {
  type DateKey,
  formatShortDate,
  isEditableDay,
  isYesterday,
  toLocalDateKey,
} from '@/features/meals/dates';
import type { MealLog, MealSlot } from '@/features/meals/types';
import { MedicineSetupSheet, type MedicineDraft } from '@/features/medicines/MedicineSetupSheet';
import { getDoses, getMedicines, isDueOn, recordDose } from '@/features/medicines/medicineStore';
import { tookMedicine } from '@/features/medicines/tookMedicine';
import type { Profile } from '@/features/onboarding/types';
import { requestCamera, requestVoice } from '@/features/permissions/mediaPermissions';
import { answerFollowup, getFollowups, getReports, remindLater, updateFollowup } from '@/features/reports/reportStore';
import type { ReportValue } from '@/features/reports/schema';
import { WhyItMattersSheet } from '@/features/reports/WhyItMattersSheet';
import { DayPickerSheet } from '@/features/today/DayPickerSheet';
import { ActionChips, HeardCard, OptionChips, ReviewCard } from '@/features/today/FeedCards';
import { mealSummary } from '@/features/today/feed';
import { MealEditSheet } from '@/features/today/MealEditSheet';
import { useLogFlow } from '@/features/today/useLogFlow';
import { useToday } from '@/features/today/useToday';
import { colors, fonts, radius, spacing } from '@/theme';

export function TodayScreen({ profile }: { profile: Profile }) {
  const navigation = useNavigation();
  const [date, setDate] = useState<DateKey | null>(null); // null = follow today
  // useToday re-renders every minute, so this rolls over at midnight.
  const viewing = date ?? toLocalDateKey(new Date());
  const state = useToday(profile, viewing);
  const { now, today, isToday, totals, targets, feed, mealTimes } = state;
  const editable = isEditableDay(viewing, today);

  const flow = useLogFlow(viewing, nearestSlot(mealTimes, now));
  // A new log (not an answer inside one) starts on the meal closest to now,
  // or the meal Mira just asked about.
  const startSlot = (slot?: MealSlot) => {
    if (slot) flow.setSlot(slot);
    else if (!flow.active)
      flow.setSlot(state.action?.slot ?? nearestSlot(mealTimes, new Date()));
  };
  const [draft, setDraft] = useState('');
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<MealLog | null>(null);
  const [medicine, setMedicine] = useState<(MedicineDraft & { followupId?: string }) | null>(null);
  const [why, setWhy] = useState<{ followupId: string; value: ReportValue } | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const input = useRef<TextInputInstance>(null);

  // Voice: live words show in the box; when speech ends they go to "Mira heard".
  const spoken = useRef('');
  const speech = useSpeech({
    onText: text => {
      spoken.current = text;
      setDraft(text);
    },
    onNothingHeard: () => flow.say({ kind: 'mira', text: "I didn't catch that. Tap the mic and try again, or type it." }),
    onError: error =>
      flow.say({
        kind: 'mira',
        text:
          error !== 'start-failed' && error.code === 'NETWORK_ERROR'
            ? 'Voice needs internet right now. Type it instead?'
            : "Voice isn't working right now. Type it instead?",
      }),
  });
  const wasListening = useRef(false);
  useEffect(() => {
    if (wasListening.current && !speech.listening && spoken.current.trim()) {
      flow.heard(spoken.current.trim());
      spoken.current = '';
      setDraft('');
    }
    wasListening.current = speech.listening;
  }, [speech.listening, flow]);

  const listen = async (slot?: MealSlot) => {
    startSlot(slot);
    if (speech.listening) return speech.stopListening();
    const access = await requestVoice();
    if (access !== 'ok') {
      flow.say({
        kind: 'mira',
        text: access === 'denied' ? 'Microphone access is off. Allow it in Settings, or type it.' : "Voice isn't available on this phone. Type it instead?",
      });
      return;
    }
    spoken.current = '';
    setDraft('');
    speech.startListening();
  };

  const handlePhoto = (result: PhotoResult) => {
    if (result.kind === 'photo') flow.sendPhoto(result.photo);
    else if (result.kind === 'error') flow.say({ kind: 'mira', text: "I couldn't open that photo. Try again, or tell me what you had." });
  };

  const snap = async (slot?: MealSlot) => {
    startSlot(slot);
    if (!(await requestCamera())) {
      flow.say({ kind: 'mira', text: 'Camera access is off. Pick a photo from your gallery instead, or tell me what you had.' });
      handlePhoto(await pickPhoto());
      return;
    }
    handlePhoto(await takePhoto());
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    // "took my vitamin d" is a dose, not food.
    if (isToday) {
      const doses = getDoses(today);
      const pending = getMedicines().filter(m => isDueOn(m, today) && !doses[m.id]);
      const med = tookMedicine(text, pending);
      if (med) {
        recordDose(today, med.id, 'taken');
        showToast(`${med.name} marked as taken`);
        return;
      }
    }
    startSlot();
    flow.sendText(text);
  };

  const onChip = ({ intent }: Chip) => {
    switch (intent.kind) {
      case 'snap':
        return snap(intent.slot);
      case 'say':
        return listen(intent.slot);
      case 'skip_meal':
        return markHandled(today, `meal:${intent.slot}`);
      case 'med_taken':
        return recordDose(today, intent.id, 'taken');
      case 'med_skip':
        return recordDose(today, intent.id, 'skipped');
      case 'snooze':
        snooze(today, intent.key, intent.minutes);
        return showToast(`Okay, I'll ask again in ${intent.minutes} min`);
      case 'dismiss':
        return markHandled(today, intent.key);
      case 'followup': {
        const f = getFollowups().find(x => x.id === intent.id);
        if (!f) return;
        answerFollowup(f.id, intent.answer);
        if (intent.answer === 'not_yet') {
          const value = getReports()
            .flatMap(r => r.values)
            .reverse()
            .find(v => v.key === f.key);
          if (value) setWhy({ followupId: f.id, value });
          return;
        }
        // Prescribed or already taking: set it up so Mira can remind.
        return setMedicine({ name: f.label, forKey: f.key, time: mealTimes.dinner, followupId: f.id });
      }
    }
  };

  const moodFor = (action: NextAction) =>
    action.urgency === 'overdue' ? 'flat' : action.type === 'all_done' ? 'grin' : 'smile';

  const showSoFar = totals.kcal > 0;
  const title = isToday ? 'Today' : isYesterday(viewing, now) ? 'Yesterday' : formatShortDate(viewing);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>{title}</Text>
          {isToday && <Text style={styles.subtitle}>{formatShortDate(today)}</Text>}
        </View>
        {!isToday && (
          <Button small variant="outline" label="Back to today" onPress={() => setDate(null)} />
        )}
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel="Earlier days"
          style={styles.iconButton}
        >
          <CalendarDays size={22} color={colors.ink} />
        </Pressable>
      </View>

      {showSoFar && (
        <Pressable
          onPress={() => navigation.navigate('MainTabs', { screen: 'Health' })}
          accessibilityRole="button"
          accessibilityLabel={`${isToday ? 'So far' : 'That day'}: ${Math.round(totals.kcal)} of ${targets.calories} kcal, protein ${Math.round(totals.protein)} of ${targets.proteinG} grams`}
          style={styles.soFar}
        >
          <Text style={styles.soFarLabel}>{isToday ? 'So far' : 'That day'}</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, (totals.kcal / targets.calories) * 100)}%` }]} />
          </View>
          <Text style={styles.soFarText}>
            {Math.round(totals.kcal).toLocaleString('en-IN')} / {targets.calories.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.soFarText}>
            P {Math.round(totals.protein)}/{targets.proteinG}
          </Text>
        </Pressable>
      )}

      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.feed}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {feed.map(item => (
            <Animated.View key={item.id} entering={FadeInDown.duration(220)}>
              {item.kind === 'mira' && (
                <MiraBubble
                  text={item.text}
                  inverted={item.action?.urgency === 'overdue'}
                  mood={item.action ? moodFor(item.action) : 'smile'}
                >
                  {item.action && !flow.active && <ActionChips action={item.action} onChip={onChip} />}
                </MiraBubble>
              )}
              {item.kind === 'reply' && <UserBubble text={item.text} />}
              {item.kind === 'meal' && (
                <UserBubble
                  text={mealSummary(item.log)}
                  onPress={editable ? () => setEditing(item.log) : undefined}
                  trailing={
                    editable ? (
                      <>
                        {'  ·  '}
                        <Text style={styles.editLink}>Edit</Text>
                      </>
                    ) : undefined
                  }
                />
              )}
            </Animated.View>
          ))}

          {!isToday && editable && feed.every(i => i.kind === 'mira') && (
            <MiraBubble text={`Nothing logged ${isYesterday(viewing, now) ? 'yesterday' : 'that day'}. Missed a meal? Tell me below.`} />
          )}
          {!editable && (
            <Text style={styles.locked}>Days before yesterday can't be changed.</Text>
          )}

          {flow.turns.map(turn => (
            <Animated.View key={turn.id} entering={FadeInDown.duration(220)}>
              {turn.kind === 'user' && <UserBubble text={turn.text} />}
              {turn.kind === 'mira' && <MiraBubble text={turn.text} />}
              {turn.kind === 'photo' && (
                <Image source={{ uri: turn.uri }} style={styles.photo} accessibilityLabel="Your meal photo" />
              )}
            </Animated.View>
          ))}
          {flow.card?.kind === 'thinking' && <TypingIndicator />}
          {flow.card?.kind === 'heard' && (
            <HeardCard
              name="Mira"
              text={flow.card.text}
              onConfirm={text => flow.sendText(text)}
              onAgain={() => listen()}
            />
          )}
          {flow.card?.kind === 'clarify' && (
            <MiraBubble text={flow.card.question}>
              <OptionChips options={flow.card.options} onPick={flow.sendText} />
            </MiraBubble>
          )}
          {flow.card?.kind === 'failed' && (
            <MiraBubble text={flow.card.text} mood="flat">
              <View style={styles.chips}>
                {flow.card.retry && <Button small label="Try again" onPress={flow.retry} />}
                {flow.card.photo && <Button small variant="outline" label="Retake" onPress={() => snap()} />}
                <Button
                  small
                  variant="ghost"
                  label="Tell Mira instead"
                  onPress={() => {
                    flow.reset();
                    input.current?.focus();
                  }}
                />
              </View>
            </MiraBubble>
          )}
          {flow.card?.kind === 'review' && (
            <MiraBubble text="Here's what I got. Fix anything, then save.">
              <ReviewCard
                rows={flow.card.rows}
                slot={flow.slot}
                onSlot={flow.setSlot}
                onChangeQuantity={flow.changeQuantity}
                onRemove={flow.removeRow}
                onAdd={() => {
                  flow.addSomething();
                  input.current?.focus();
                }}
                onSave={flow.save}
                onCancel={flow.reset}
              />
            </MiraBubble>
          )}
        </ScrollView>

        {editable && (
          <View style={styles.composer}>
            <Pressable
              onPress={() => snap()}
              disabled={flow.busy}
              accessibilityRole="button"
              accessibilityLabel="Snap your plate"
              style={styles.roundButton}
            >
              <Camera size={22} color={colors.ink} />
            </Pressable>
            <TextInput
              ref={input}
              value={draft}
              onChangeText={setDraft}
              placeholder={speech.listening ? 'Listening…' : isToday ? 'Tell Mira…' : 'Add a missed meal…'}
              placeholderTextColor={colors.muted}
              editable={!flow.busy && !speech.listening}
              multiline
              maxLength={500}
              style={styles.input}
              accessibilityLabel="Tell Mira what you ate"
            />
            {draft.trim() && !speech.listening ? (
              <Pressable onPress={send} accessibilityRole="button" accessibilityLabel="Send" style={[styles.roundButton, styles.sendButton]}>
                <ArrowUp size={22} color={colors.ground} strokeWidth={2.5} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => listen()}
                disabled={flow.busy}
                accessibilityRole="button"
                accessibilityLabel={speech.listening ? 'Stop listening' : 'Say it'}
                style={[styles.roundButton, speech.listening && styles.sendButton]}
              >
                {speech.listening ? (
                  <Square size={18} color={colors.ground} fill={colors.ground} />
                ) : (
                  <Mic size={22} color={colors.ink} />
                )}
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {picking && (
        <DayPickerSheet
          today={today}
          selected={viewing}
          onPick={day => {
            setDate(day === today ? null : day);
            flow.reset();
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {editing && <MealEditSheet log={editing} onClose={() => setEditing(null)} />}
      {medicine && (
        <MedicineSetupSheet
          draft={medicine}
          onClose={() => setMedicine(null)}
          onSaved={m => medicine.followupId && updateFollowup(medicine.followupId, { medicineId: m.id })}
        />
      )}
      {why && (
        <WhyItMattersSheet
          value={why.value}
          diet={profile.diet}
          onClose={() => setWhy(null)}
          onRemindLater={() => {
            remindLater(why.followupId, 2);
            showToast("Okay, I'll ask again in 2 days");
            setWhy(null);
          }}
          onTaking={() => {
            answerFollowup(why.followupId, 'taking');
            setMedicine({ name: why.value.label, forKey: why.value.key, time: mealTimes.dinner, followupId: why.followupId });
            setWhy(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.ground,
  },
  title: { fontSize: 26, fontFamily: fonts.extraBold },
  subtitle: { fontSize: 14, color: colors.muted },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  soFar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.well,
  },
  soFarLabel: { fontSize: 13, fontFamily: fonts.bold },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.ink },
  soFarText: { fontSize: 13, fontFamily: fonts.semiBold },
  feed: { padding: spacing.lg, gap: 14 },
  editLink: { color: colors.ground, textDecorationLine: 'underline', fontFamily: fonts.semiBold },
  locked: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { alignSelf: 'flex-end', width: 200, height: 200, borderRadius: radius.lg, backgroundColor: colors.well },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.ground,
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  sendButton: { backgroundColor: colors.ink, borderColor: colors.ink },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: colors.well,
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
});
