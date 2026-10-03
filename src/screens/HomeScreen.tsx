import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Kimbo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
