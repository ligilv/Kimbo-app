import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useKimboSheet } from '@/features/kimbo/KimboSheetProvider';
import { colors } from '@/theme';

// The raised centre button. It isn't a screen: it opens the Kimbo sheet.
export function KimboTabButton() {
  const { openKimboSheet } = useKimboSheet();
  return (
    <View style={styles.slot}>
      <Pressable
        onPress={() => openKimboSheet()}
        accessibilityRole="button"
        accessibilityLabel="Log a meal with Kimbo"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Image
          source={require('@/assets/images/kimbo-avatar.png')}
          style={styles.logo}
          accessibilityIgnoresInvertColors
        />
      </Pressable>
    </View>
  );
}

const SIZE = 64;

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: 'center' },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    marginTop: -SIZE / 3, // sits above the bar
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  logo: { width: SIZE - 8, height: SIZE - 8, borderRadius: (SIZE - 8) / 2 },
  pressed: { transform: [{ scale: 0.94 }] },
});
