import { storage } from '@/storage';

const DEVICE_ID_KEY = 'device.id';

// An anonymous id for this install, so the server can keep each phone's data
// apart without a login. ponytail: Math.random is fine for an id that only needs
// to be unique, not secret; switch to crypto random if these ever become auth.
export function getDeviceId(): string {
  let id = storage.getString(DEVICE_ID_KEY);
  if (!id) {
    id = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    storage.set(DEVICE_ID_KEY, id);
  }
  return id;
}
