import { useState } from 'react';
import { showToast } from '@/components/Toast';
import type { Diet } from '@/features/onboarding/types';
import { MedicineSetupSheet, type MedicineDraft } from '@/features/medicines/MedicineSetupSheet';
import {
  answerFollowup,
  type Followup,
  type FollowupAnswer,
  getReports,
  remindLater,
  updateFollowup,
} from './reportStore';
import type { ReportValue } from './schema';
import { WhyItMattersSheet } from './WhyItMattersSheet';

// A supplement is usually named after what it fixes ("Vitamin D" -> Vitamin D3);
// a test like Urea isn't, so the name is left for the user to type.
const SUPPLEMENT = /vitamin|b12|iron|ferritin|folate|folic|calcium|zinc|magnesium|omega/i;
export const suggestedMedicineName = (label: string) => (SUPPLEMENT.test(label) ? label : undefined);

// What happens after "Have you seen a doctor about it?", wherever it's asked
// (the Today chat or a tap on Health): prescribed/taking -> set up the
// medicine so Mira can remind; not yet -> why it matters, ask again later.
export function useFollowupAnswer({ diet, dinnerTime }: { diet: Diet; dinnerTime: string }) {
  const [medicine, setMedicine] = useState<(MedicineDraft & { followupId: string }) | null>(null);
  const [why, setWhy] = useState<{ followupId: string; value: ReportValue } | null>(null);

  const setUpMedicine = (followupId: string, label: string, key: string) =>
    setMedicine({ name: suggestedMedicineName(label), forKey: key, time: dinnerTime, followupId });

  const answer = (f: Followup, choice: FollowupAnswer) => {
    answerFollowup(f.id, choice);
    if (choice !== 'not_yet') return setUpMedicine(f.id, f.label, f.key);
    const value = getReports()
      .flatMap(r => r.values)
      .reverse()
      .find(v => v.key === f.key);
    if (value) setWhy({ followupId: f.id, value });
  };

  const sheets = (
    <>
      {medicine && (
        <MedicineSetupSheet
          draft={medicine}
          onClose={() => setMedicine(null)}
          onSaved={m => updateFollowup(medicine.followupId, { medicineId: m.id })}
        />
      )}
      {why && (
        <WhyItMattersSheet
          value={why.value}
          diet={diet}
          onClose={() => setWhy(null)}
          onRemindLater={() => {
            remindLater(why.followupId, 2);
            showToast("Okay, I'll ask again in 2 days");
            setWhy(null);
          }}
          onTaking={() => {
            answerFollowup(why.followupId, 'taking');
            setUpMedicine(why.followupId, why.value.label, why.value.key);
            setWhy(null);
          }}
        />
      )}
    </>
  );

  return { answer, sheets };
}
