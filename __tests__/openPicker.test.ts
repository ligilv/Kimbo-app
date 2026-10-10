import { openPicker } from '@/features/logMeal/photo';

test('a second tap while the camera is open is cancelled, not a second camera', async () => {
  let close!: () => void;
  const launch = jest.fn(() => new Promise<{ assets: [] }>(r => (close = () => r({ assets: [] }))));
  const first = openPicker(launch);
  await expect(openPicker(launch)).resolves.toEqual({ didCancel: true });
  expect(launch).toHaveBeenCalledTimes(1);
  close();
  await first;
  openPicker(launch); // closed again: a new tap opens it
  expect(launch).toHaveBeenCalledTimes(2);
});
