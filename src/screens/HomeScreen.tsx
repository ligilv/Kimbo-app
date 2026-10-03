import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Kimbo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.text,
  },
});
