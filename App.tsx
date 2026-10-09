import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/Toast';
import { Navigation } from '@/navigation/RootStack';

// Above the tab bar and the composer.
function Toasts() {
  const insets = useSafeAreaInsets();
  return <ToastHost bottom={insets.bottom + 132} />;
}

function App() {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <Navigation />
        <Toasts />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
