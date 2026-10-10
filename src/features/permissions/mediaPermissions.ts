import { Platform } from 'react-native';
import {
  PERMISSIONS,
  type PermissionStatus,
  request,
  RESULTS,
} from 'react-native-permissions';

const CAMERA = Platform.select({
  ios: PERMISSIONS.IOS.CAMERA,
  default: PERMISSIONS.ANDROID.CAMERA,
});

const MICROPHONE = Platform.select({
  ios: PERMISSIONS.IOS.MICROPHONE,
  default: PERMISSIONS.ANDROID.RECORD_AUDIO,
});

const isGranted = (status: PermissionStatus) =>
  status === RESULTS.GRANTED || status === RESULTS.LIMITED;

// Asks for camera access at the moment it's needed, never upfront. If the phone
// already decided (allowed, or blocked after declining), no popup is shown and
// this just returns that answer. True if allowed.
export async function requestCamera(): Promise<boolean> {
  return isGranted(await request(CAMERA));
}

export type VoiceAccess = 'ok' | 'unavailable' | 'denied';

// Asked at the moment "Say it" is tapped. Speech is turned into text by Gemini
// (see useSpeech), so only the microphone is needed.
export async function requestVoice(): Promise<VoiceAccess> {
  try {
    return isGranted(await request(MICROPHONE)) ? 'ok' : 'denied';
  } catch {
    return 'unavailable';
  }
}
