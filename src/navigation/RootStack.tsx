import {
  createStaticNavigation,
  type StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useIsOnboarded } from '@/features/onboarding/useOnboarding';
import { HomeScreen } from '@/screens/HomeScreen';
import { LogMealScreen } from '@/screens/LogMealScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { navigationTheme } from '@/theme';

const useNeedsOnboarding = () => !useIsOnboarded();


const RootStack = createNativeStackNavigator({
  screens: {
    Welcome: {
      if: useNeedsOnboarding,
      screen: WelcomeScreen,
      options: { headerShown: false},
    },
    Onboarding: {
      if: useNeedsOnboarding,
      screen: OnboardingScreen,
      options: { headerShown: false },
    },
    Home: {
      if: useIsOnboarded,
      screen: HomeScreen,
      options: { headerShown: false },
    },
    LogMeal: {
      if: useIsOnboarded,
      screen: LogMealScreen,
      options: { title: 'Log a meal', presentation: 'fullScreenModal' },
    },
    Profile: {
      if: useIsOnboarded,
      screen: ProfileScreen,
      options: { title: 'Profile' },
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
