import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createStaticNavigation,
  type StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { House, UserRound } from 'lucide-react-native';
import { View } from 'react-native';
import { useIsOnboarded } from '@/features/onboarding/useOnboarding';
import { HomeScreen } from '@/screens/HomeScreen';
import { LogMealScreen } from '@/screens/LogMealScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { colors, fonts, navigationTheme } from '@/theme';
import { KimboTabButton } from './KimboTabButton';
import { navigationRef } from './navigationRef';

const useNeedsOnboarding = () => !useIsOnboarded();

const NoScreen = () => <View />;

const MainTabs = createBottomTabNavigator({
  screenOptions: {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: 'rgba(28, 43, 36, 0.5)',
    tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 12 },
    tabBarStyle: {
      backgroundColor: colors.background,
      borderTopColor: 'rgba(28, 43, 36, 0.12)',
    },
  },
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
      },
    },
    Kimbo: {
      screen: NoScreen,
      options: { tabBarButton: () => <KimboTabButton /> },
      listeners: { tabPress: e => e.preventDefault() },
    },
    Profile: {
      screen: ProfileScreen,
      options: {
        tabBarIcon: ({ color, size }) => (
          <UserRound color={color} size={size} />
        ),
      },
    },
  },
});

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
    MainTabs: {
      if: useIsOnboarded,
      screen: MainTabs,
      options: { headerShown: false },
    },
    LogMeal: {
      if: useIsOnboarded,
      screen: LogMealScreen,
      options: { headerShown: false, presentation: 'fullScreenModal' },
    },
  },
});

const StaticNavigation = createStaticNavigation(RootStack);

export function Navigation() {
  return <StaticNavigation ref={navigationRef} theme={navigationTheme} />;
}

type RootStackParamList = StaticParamList<typeof RootStack>;

// Types useNavigation() and <Link> app-wide against the screens above.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
