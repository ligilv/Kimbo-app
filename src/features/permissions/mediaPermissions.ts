import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  checkMultiple,
  request as requestPermission,
  PERMISSIONS,
  type PermissionStatus,
  requestMultiple,
  RESULTS,
} from 'react-native-permissions';

export const CAMERA = Platform.select({
  ios: PERMISSIONS.IOS.CAMERA,
  default: PERMISSIONS.ANDROID.CAMERA,
});
export const MICROPHONE = Platform.select({
  ios: PERMISSIONS.IOS.MICROPHONE,
  default: PERMISSIONS.ANDROID.RECORD_AUDIO,
});

export type MediaStatuses = {
  camera: PermissionStatus;
  microphone: PermissionStatus;
};

export const isGranted = (status: PermissionStatus) =>
  status === RESULTS.GRANTED || status === RESULTS.LIMITED;

export const isBlocked = (status: PermissionStatus) =>
  status === RESULTS.BLOCKED;

// Current camera + mic status, re-checked when the user comes back from Settings.
export function useMediaPermissions() {
  const [statuses, setStatuses] = useState<MediaStatuses | null>(null);

  const refresh = useCallback(async () => {
    const result = await checkMultiple([CAMERA, MICROPHONE]);
    setStatuses({ camera: result[CAMERA], microphone: result[MICROPHONE] });
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const request = useCallback(async (): Promise<MediaStatuses> => {
    const result = await requestMultiple([CAMERA, MICROPHONE]);
    const next = { camera: result[CAMERA], microphone: result[MICROPHONE] };
    setStatuses(next);
    return next;
  }, []);

  return { statuses, request };
}

export async function requestCamera(): Promise<boolean> {
  return isGranted(await requestPermission(CAMERA));
}
