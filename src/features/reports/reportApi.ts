import { pick, types } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker';
import { openPicker } from '@/features/logMeal/photo';
import { API_URL } from '@/config';
import { type ExtractReportResponse, extractReportResponseSchema } from './schema';

const TIMEOUT_MS = 90_000; // a big scanned PDF takes a while to upload and read
// Same cap as the server (server/src/reports/report.schema.ts): ~15 MB file.
const MAX_BASE64_LENGTH = 20 * 1024 * 1024;

export type ReportFile = { base64: string; mimeType: 'image/jpeg' | 'image/png' | 'application/pdf'; name: string };
export type PickResult = { kind: 'file'; file: ReportFile } | { kind: 'cancelled' } | { kind: 'error' };

// Reports need more pixels than meal photos, or the small print is unreadable.
const PHOTO = { mediaType: 'photo', maxWidth: 2000, maxHeight: 2000, quality: 0.8, includeBase64: true } as const;

function fromImage(res: ImagePickerResponse): PickResult {
  if (res.didCancel) return { kind: 'cancelled' };
  const asset = res.assets?.[0];
  if (res.errorCode || !asset?.base64) return { kind: 'error' };
  return {
    kind: 'file',
    file: {
      base64: asset.base64,
      mimeType: asset.type === 'image/png' ? 'image/png' : 'image/jpeg',
      name: asset.fileName ?? 'Report photo',
    },
  };
}

export const photographReport = () =>
  openPicker(() => launchCamera({ ...PHOTO, cameraType: 'back', saveToPhotos: false })).then(fromImage);
export const pickReportImage = () => openPicker(() => launchImageLibrary({ ...PHOTO, selectionLimit: 1 })).then(fromImage);

// RN's fetch reads content:// and file:// uris, so the picked PDF needs no copy.
const readBase64 = async (uri: string) => {
  const blob = await (await fetch(uri)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export async function pickReportPdf(): Promise<PickResult> {
  try {
    const [doc] = await pick({ type: [types.pdf] });
    return {
      kind: 'file',
      file: { base64: await readBase64(doc.uri), mimeType: 'application/pdf', name: doc.name ?? 'Report.pdf' },
    };
  } catch (error) {
    const code = (error as { code?: string }).code;
    return code === 'OPERATION_CANCELED' ? { kind: 'cancelled' } : { kind: 'error' };
  }
}

export type ExtractResult =
  | { ok: true; data: ExtractReportResponse }
  | { ok: false; reason: 'network' | 'timeout' | 'invalid' | 'too_big' | 'unreadable' };

// Never throws: every failure comes back as a reason the screen can explain.
export async function extractReport(file: ReportFile, fetchImpl: typeof fetch = fetch): Promise<ExtractResult> {
  // Checked here so a huge file fails at once instead of after a long upload.
  if (file.base64.length > MAX_BASE64_LENGTH) return { ok: false, reason: 'too_big' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${API_URL}/reports/extract`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ file: { base64: file.base64, mimeType: file.mimeType } }),
      signal: controller.signal,
    });
    if (res.status === 413) return { ok: false, reason: 'too_big' };
    if (res.status === 400) return { ok: false, reason: 'unreadable' };
    if (!res.ok) return { ok: false, reason: res.status >= 500 ? 'invalid' : 'network' };
    const parsed = extractReportResponseSchema.safeParse(await res.json());
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, reason: 'invalid' };
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export const EXTRACT_ERRORS: Record<Exclude<ExtractResult, { ok: true }>['reason'], string> = {
  network: "I couldn't reach the server. Check your connection and try again.",
  timeout: 'That took too long to read. Try again, or send a clearer photo.',
  invalid: "I couldn't read that report. A sharper photo or the PDF usually works.",
  too_big: 'That file is over 15 MB, too big for me. Try a photo of each page instead.',
  unreadable: "I couldn't open that file. Send a PDF, or a JPEG or PNG photo of the report.",
};
