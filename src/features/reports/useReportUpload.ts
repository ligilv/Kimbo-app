import { useState } from 'react';
import { requestCamera } from '@/features/permissions/mediaPermissions';
import {
  EXTRACT_ERRORS,
  extractReport,
  photographReport,
  pickReportImage,
  pickReportPdf,
  type PickResult,
} from './reportApi';
import { showToast } from '@/components/Toast';
import { formatShortDate } from '@/features/meals/dates';
import { addReport, findSameReport, type Report } from './reportStore';

export type UploadSource = 'camera' | 'gallery' | 'pdf';
type State = { kind: 'idle' } | { kind: 'reading' } | { kind: 'error'; text: string };

const NOT_A_REPORT = "That doesn't look like a lab report. Try a photo of the page with the results table.";

// Pick -> send to the server -> save. Returns the saved report, or null.
export function useReportUpload() {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const upload = async (source: UploadSource): Promise<Report | null> => {
    let picked: PickResult;
    if (source === 'camera') {
      if (!(await requestCamera())) {
        setState({ kind: 'error', text: 'Camera access is off. Pick a photo or PDF instead.' });
        return null;
      }
      picked = await photographReport();
    } else picked = source === 'gallery' ? await pickReportImage() : await pickReportPdf();

    if (picked.kind === 'cancelled') return null;
    if (picked.kind === 'error') {
      setState({ kind: 'error', text: "I couldn't open that file. Try another one." });
      return null;
    }
    setState({ kind: 'reading' });
    const result = await extractReport(picked.file);
    if (!result.ok) {
      setState({ kind: 'error', text: EXTRACT_ERRORS[result.reason] });
      return null;
    }
    if (result.data.notAReport || result.data.values.length === 0) {
      setState({ kind: 'error', text: NOT_A_REPORT });
      return null;
    }
    setState({ kind: 'idle' });
    const same = findSameReport(result.data);
    if (same) {
      showToast(`You've already added this report (${formatShortDate(same.takenOn)})`);
      return same;
    }
    return addReport(result.data);
  };

  return { state, upload, reading: state.kind === 'reading' };
}
