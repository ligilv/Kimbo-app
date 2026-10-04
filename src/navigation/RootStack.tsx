import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createStaticNavigation,
  type StaticParamList,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { House, type LucideIcon, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
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

// The selected tab gets a filled pill behind its icon, so it reads at a glance.
const tabIcon =
  (Icon: LucideIcon) =>
  ({ focused, color }: { focused: boolean; color: string }) =>
    (
      <View style={[styles.pill, focused && styles.pillOn]}>
        <Icon color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
      </View>
    );

const MainTabs = createBottomTabNavigator({
  screenOptions: {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: 'rgba(28, 43, 36, 0.45)',
    tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
    tabBarStyle: {
      backgroundColor: colors.background,
      borderTopColor: 'rgba(28, 43, 36, 0.12)',
    },
  },
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        tabBarIcon: tabIcon(House),
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
        tabBarIcon: tabIcon(UserRound),
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

const styles = StyleSheet.create({
  pill: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: 'rgba(31, 77, 58, 0.14)' },
});

type RootStackParamList = StaticParamList<typeof RootStack>;

// Types useNavigation() and <Link> app-wide against the screens above.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
