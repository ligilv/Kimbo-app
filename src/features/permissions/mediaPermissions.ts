import {
  isAvailable as speechAvailable,
  requestPermissions as requestSpeechPermissions,
} from '@dbkable/react-native-speech-to-text';
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

const isGranted = (status: PermissionStatus) =>
  status === RESULTS.GRANTED || status === RESULTS.LIMITED;

// Asks for camera access at the moment it's needed, never upfront. If the phone
// already decided (allowed, or blocked after declining), no popup is shown and
// this just returns that answer. True if allowed.
export async function requestCamera(): Promise<boolean> {
  return isGranted(await request(CAMERA));
}

export type VoiceAccess = 'ok' | 'unavailable' | 'denied';

// Asked at the moment "Say it" is tapped. Covers the microphone (and speech
// recognition on iOS), plus whether the phone has a speech recogniser at all.
export async function requestVoice(): Promise<VoiceAccess> {
  try {
    if (!(await speechAvailable())) return 'unavailable';
    return (await requestSpeechPermissions()) ? 'ok' : 'denied';
  } catch {
    return 'unavailable';
  }
}
