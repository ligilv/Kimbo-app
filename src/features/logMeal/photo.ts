import {
  type ImagePickerResponse,
  launchCamera,
  launchImageLibrary,
  type OptionsCommon,
} from 'react-native-image-picker';
import type { MealPhoto } from './parseMeal';

const OPTIONS: OptionsCommon = {
  mediaType: 'photo',
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.7,
  includeBase64: true,
};

export type PhotoResult =
  | { kind: 'photo'; photo: MealPhoto }
  | { kind: 'cancelled' }
  | { kind: 'error'; code?: string };

function toResult(res: ImagePickerResponse): PhotoResult {
  if (res.didCancel) return { kind: 'cancelled' };
  const asset = res.assets?.[0];
  if (res.errorCode || !asset?.uri || !asset.base64) {
    return { kind: 'error', code: res.errorCode };
  }
  return {
    kind: 'photo',
    photo: {
      uri: asset.uri,
      base64: asset.base64,
      // Android converts HEIC to JPEG while picking; only PNG stays PNG.
      mimeType: asset.type === 'image/png' ? 'image/png' : 'image/jpeg',
    },
  };
}

let pickerOpen = false;
export async function openPicker(
  launch: () => Promise<ImagePickerResponse>,
): Promise<ImagePickerResponse> {
  if (pickerOpen) return { didCancel: true };
  pickerOpen = true;
  try {
    return await launch();
  } finally {
    pickerOpen = false;
  }
}

export const takePhoto = () =>
  openPicker(() =>
    launchCamera({ ...OPTIONS, cameraType: 'back', saveToPhotos: false }),
  ).then(toResult);

export const pickPhoto = () =>
  openPicker(() =>
    launchImageLibrary({ ...OPTIONS, selectionLimit: 1 }),
  ).then(toResult);
