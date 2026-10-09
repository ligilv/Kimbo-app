import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { colors, fonts, radius, themedStyles } from '@/theme';

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.item, on && styles.itemOn]}
          >
            <Text style={[styles.text, on && styles.textOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { flexDirection: 'row', backgroundColor: colors.well, borderRadius: radius.md, padding: 3 },
  item: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: 6 },
  itemOn: { backgroundColor: colors.ink },
  text: { fontSize: 14, fontFamily: fonts.semiBold },
  textOn: { color: colors.ground },
}));
