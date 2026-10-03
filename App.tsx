import { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './src/navigation/RootStack';
import { SplashScreen } from './src/screens/SplashScreen';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <Navigation />
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
    </SafeAreaProvider>
  );
}

export default App;
