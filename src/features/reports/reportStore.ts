import { useMMKVObject } from 'react-native-mmkv';
import { addDays, type DateKey, toLocalDateKey } from '@/features/meals/dates';
import { newId } from '@/features/meals/mealStore';
import { readJson, storage, writeJson } from '@/storage';
import type { ExtractReportResponse, ReportValue } from './schema';

export type Report = {
  id: string;
  takenOn: DateKey; // printed date, or the upload day
  uploadedAt: string;
  values: ReportValue[];
};

export type FollowupAnswer = 'prescribed' | 'taking' | 'not_yet';

// One open question per flagged value: "Seen a doctor about it?"
export type Followup = {
  id: string;
  reportId: string;
  key: string;
  label: string;
  status: 'low' | 'high';
  state: 'open' | 'treating';
  remindAt: string; // asked on Today once this has passed
  answer?: FollowupAnswer;
  answeredAt?: string;
  medicineId?: string;
};

const REPORTS = 'reports';
const FOLLOWUPS = 'followups';

export const getReports = () => readJson<Report[]>(REPORTS, []);
export const getFollowups = () => readJson<Followup[]>(FOLLOWUPS, []);
const saveFollowups = (list: Followup[]) => writeJson(FOLLOWUPS, list);

// Newest by test date, not upload order: an old report uploaded today isn't "latest".
export const latestReport = (reports: Report[]) =>
  [...reports].sort((a, b) => a.takenOn.localeCompare(b.takenOn)).at(-1);

export const flagged = (report: Report) => report.values.filter(v => v.status !== 'normal');

// The same report uploaded again (same results, same printed date): the one
// already saved, so it isn't listed twice or counted twice in trends.
export function findSameReport(data: ExtractReportResponse, reports = getReports()): Report | undefined {
  const fingerprint = (values: ReportValue[]) =>
    values.map(v => `${v.key}=${v.value}`).sort().join('|');
  const target = fingerprint(data.values);
  return reports.find(r => (!data.takenOn || r.takenOn === data.takenOn) && fingerprint(r.values) === target);
}

// Saves the report. Questions only follow the newest report (by printed date):
// - a flagged value with no question yet opens one (a re-test doesn't ask twice);
// - an unanswered question whose value is now normal is dropped, so Mira never
//   asks "your B12 is low" after a re-test says it's fine.
// An older report uploaded later just joins the history.
export function addReport(data: ExtractReportResponse, now = new Date()): Report {
  const report: Report = {
    id: newId(),
    takenOn: data.takenOn ?? toLocalDateKey(now),
    uploadedAt: now.toISOString(),
    values: data.values,
  };
  const reports = [...getReports(), report];
  writeJson(REPORTS, reports);
  if (latestReport(reports) !== report) return report;

  const nowNormal = new Set(report.values.filter(v => v.status === 'normal').map(v => v.key));
  const existing = getFollowups().filter(f => !(f.state === 'open' && nowNormal.has(f.key)));
  const asked = new Set(existing.map(f => f.key));
  const added = flagged(report)
    .filter(v => !asked.has(v.key))
    .map<Followup>(v => ({
      id: newId(),
      reportId: report.id,
      key: v.key,
      label: v.label,
      status: v.status as 'low' | 'high',
      state: 'open',
      remindAt: now.toISOString(),
    }));
  saveFollowups([...existing, ...added]);
  return report;
}

export function updateFollowup(id: string, patch: Partial<Followup>) {
  saveFollowups(getFollowups().map(f => (f.id === id ? { ...f, ...patch } : f)));
}

export function answerFollowup(id: string, answer: FollowupAnswer, now = new Date()) {
  updateFollowup(id, {
    answer,
    answeredAt: now.toISOString(),
    state: answer === 'not_yet' ? 'open' : 'treating',
    // "Not yet" asks again tomorrow unless the user picks "Remind me in 2 days".
    remindAt: answer === 'not_yet' ? addDaysIso(now, 1) : undefined,
  });
}

export const remindLater = (id: string, days: number, now = new Date()) =>
  updateFollowup(id, { remindAt: addDaysIso(now, days) });

const addDaysIso = (now: Date, days: number) =>
  new Date(now.getTime() + days * 86_400_000).toISOString();

// Questions Mira should ask now. One a day at most: a report with eight
// flagged values would otherwise be eight questions in a row, ahead of meals.
export function dueFollowups(list: Followup[], now: Date) {
  const today = toLocalDateKey(now);
  const askedToday = list.some(f => f.answeredAt && toLocalDateKey(new Date(f.answeredAt)) === today);
  if (askedToday) return [];
  return list.filter(f => f.state === 'open' && f.remindAt && new Date(f.remindAt) <= now);
}

// The same value across every report, oldest first, for the trend view.
export function history(key: string, reports = getReports()) {
  return reports
    .flatMap(r => r.values.filter(v => v.key === key).map(v => ({ date: r.takenOn, value: v })))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// A rough "test again" date: about three months after the latest report.
export const recheckOn = (latest: DateKey) => addDays(latest, 90);

export function useReports(): Report[] {
  const [list] = useMMKVObject<Report[]>(REPORTS, storage);
  return list ?? [];
}

export function useFollowups(): Followup[] {
  const [list] = useMMKVObject<Followup[]>(FOLLOWUPS, storage);
  return list ?? [];
}
