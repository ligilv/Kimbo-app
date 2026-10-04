import {
  createNavigationContainerRef,
  type ParamListBase,
} from '@react-navigation/native';
import type { DateKey } from '@/features/meals/dates';
import type { MealSlot } from '@/features/meals/types';

// Lets code outside a screen (the Kimbo sheet) navigate. Left untyped because the
// static navigator's `ref` prop expects the generic form; openLogMeal adds the types back.
export const navigationRef = createNavigationContainerRef<ParamListBase>();

export function openLogMeal(params: {
  date: DateKey;
  slot?: MealSlot;
  mode?: 'text' | 'photo' | 'voice';
  source?: 'camera' | 'gallery';
}) {
  if (navigationRef.isReady()) navigationRef.navigate('LogMeal', params);
}
