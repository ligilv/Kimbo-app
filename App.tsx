import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/Toast';
import { useScheme } from '@/features/appearance/appearance';
import { AppearanceTransition } from '@/features/appearance/AppearanceTransition';
import { Navigation } from '@/navigation/RootStack';
import { colors, setScheme } from '@/theme';

// Above the tab bar and the composer.
function Toasts() {
  const insets = useSafeAreaInsets();
  return <ToastHost bottom={insets.bottom + 132} />;
}

// Switching appearance redraws everything below with the other colours; the
// key makes React rebuild it (screens keep their place, see RootStack).
function Themed() {
  const scheme = useScheme();
  setScheme(scheme);
  return (
    <View key={scheme} style={[styles.root, { backgroundColor: colors.ground }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <Navigation scheme={scheme} />
      <Toasts />
    </View>
  );
}

function App() {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <Themed />
        <AppearanceTransition />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

export default App;
