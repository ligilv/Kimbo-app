import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { showToast } from '@/components/Toast';
import { deleteLog, updateLog } from '@/features/meals/mealStore';
import type { MealLog } from '@/features/meals/types';
import { spacing, themedStyles } from '@/theme';
import { ReviewCard } from './FeedCards';
import { type DraftRow, rowItem } from './useLogFlow';

// "Edit" on a meal in the feed: the same review card, on the saved meal.
export function MealEditSheet({ log, onClose }: { log: MealLog; onClose: () => void }) {
  const [rows, setRows] = useState<DraftRow[]>(log.items.map(item => ({ base: item, quantity: item.quantity })));
  const [slot, setSlot] = useState(log.slot);

  const save = () => {
    if (rows.length === 0) deleteLog(log.id);
    else updateLog(log.id, { items: rows.map(rowItem), slot });
    showToast(rows.length === 0 ? 'Meal removed' : 'Meal updated');
    onClose();
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={styles.body}>
        <ReviewCard
          rows={rows}
          slot={slot}
          onSlot={setSlot}
          onChangeQuantity={(i, quantity) => setRows(r => r.map((row, j) => (j === i ? { ...row, quantity } : row)))}
          onRemove={i => setRows(r => r.filter((_, j) => j !== i))}
          onSave={save}
          onCancel={onClose}
          saveLabel="Save changes"
        />
        <Button
          small
          variant="ghost"
          label="Delete this meal"
          onPress={() => {
            deleteLog(log.id);
            showToast('Meal removed');
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({ body: { gap: spacing.sm, paddingBottom: spacing.sm } }));
