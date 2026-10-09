import { extractReport, type ReportFile } from '@/features/reports/reportApi';

jest.mock('react-native-image-picker', () => ({}));

const file = (base64: string): ReportFile => ({ base64, mimeType: 'application/pdf', name: 'r.pdf' });
const reply = (status: number) => jest.fn(async () => ({ ok: status < 300, status, json: async () => ({}) }) as unknown as Response);

test('a file over the cap is "too big" without uploading', async () => {
  const fetchImpl = reply(200);
  expect(await extractReport(file('A'.repeat(20 * 1024 * 1024 + 1)), fetchImpl)).toEqual({ ok: false, reason: 'too_big' });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('only a 413 means too big; other rejections mean unreadable', async () => {
  expect(await extractReport(file('AAAA'), reply(413))).toEqual({ ok: false, reason: 'too_big' });
  expect(await extractReport(file('AAAA'), reply(400))).toEqual({ ok: false, reason: 'unreadable' });
});
