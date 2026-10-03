import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

// Deep green line icon in a soft turmeric circle, matching the two-tone logo.
export function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <View
      style={styles.badge}
      accessible={false}
      importantForAccessibility="no"
    >
      <Icon size={20} color={colors.primary} strokeWidth={2.2} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(242, 163, 58, 0.2)', // turmeric at 20%
    alignItems: 'center',
    justifyContent: 'center',
  },
});
