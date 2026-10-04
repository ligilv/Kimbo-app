import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { type DateKey, toLocalDateKey } from '@/features/meals/dates';
import type { MealSlot } from '@/features/meals/types';
import { openLogMeal } from '@/navigation/navigationRef';
import { KimboSheet } from './KimboSheet';

type KimboSheetContext = {
  // The day Home is showing. Shared so the centre tab button logs to that day.
  selectedDate: DateKey;
  setSelectedDate: (date: DateKey) => void;
  openKimboSheet: (slot?: MealSlot) => void;
};

const Context = createContext<KimboSheetContext | null>(null);

export function KimboSheetProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(() =>
    toLocalDateKey(new Date()),
  );
  // undefined = closed; { slot } = open, with that slot pre-picked if given.
  const [sheet, setSheet] = useState<{ slot?: MealSlot }>();

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      openKimboSheet: (slot?: MealSlot) => setSheet({ slot }),
    }),
    [selectedDate],
  );

  return (
    <Context.Provider value={value}>
      {children}
      {sheet && (
        <KimboSheet
          date={selectedDate}
          slot={sheet.slot}
          onClose={() => setSheet(undefined)}
          onChoose={({ date, slot, mode }) => {
            setSheet(undefined);
            openLogMeal({ date, slot, mode });
          }}
        />
      )}
    </Context.Provider>
  );
}

export function useKimboSheet() {
  const value = useContext(Context);
  if (!value)
    throw new Error('useKimboSheet must be used inside KimboSheetProvider');
  return value;
}
