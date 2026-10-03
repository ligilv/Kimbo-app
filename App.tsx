import { useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from '@/navigation/RootStack';
import { seedMockMeals } from '@/mocks/seedMockMeals';
import { SplashScreen } from '@/screens/SplashScreen';

// Dev builds only: fills the last week with sample meals until the backend exists.
seedMockMeals();

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <Navigation />
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
