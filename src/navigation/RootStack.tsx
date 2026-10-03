import {
  createStaticNavigation,
  type StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useIsOnboarded } from '@/features/onboarding/useOnboarding';
import { HomeScreen } from '@/screens/HomeScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { navigationTheme } from '@/theme';

const useNeedsOnboarding = () => !useIsOnboarded();

// Until onboarding is finished the app opens on Welcome, then the chat.
// Finishing onboarding swaps both for Home.
const RootStack = createNativeStackNavigator({
  screens: {
    Welcome: {
      if: useNeedsOnboarding,
      screen: WelcomeScreen,
      options: { headerShown: false },
    },
    Onboarding: {
      if: useNeedsOnboarding,
      screen: OnboardingScreen,
      options: { headerShown: false },
    },
    Home: {
      if: useIsOnboarded,
      screen: HomeScreen,
      options: { title: 'Kimbo' },
    },
  },
});

const StaticNavigation = createStaticNavigation(RootStack);

export function Navigation() {
  return <StaticNavigation theme={navigationTheme} />;
}

type RootStackParamList = StaticParamList<typeof RootStack>;

// Types useNavigation() and <Link> app-wide against the screens above.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
