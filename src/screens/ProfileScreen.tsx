import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';

// Placeholder until Phase 8 (Profile).
export function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.muted}>Your profile comes in Phase 8.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { opacity: 0.6 },
});
