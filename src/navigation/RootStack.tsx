import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStaticNavigation, type NavigationState, type StaticParamList } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import type { LucideIcon } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { isComplete } from '@/features/onboarding/script';
import type { Profile } from '@/features/onboarding/types';
import { useAnswers, useIsOnboarded } from '@/features/onboarding/useOnboarding';
import { HealthScreen } from '@/screens/HealthScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ReportResultScreen } from '@/screens/ReportResultScreen';
import { TodayScreen } from '@/screens/TodayScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { colors, fonts, navigationThemeFor, type Scheme } from '@/theme';

const useNeedsOnboarding = () => !useIsOnboarded();

// Tabs only exist after onboarding, so the profile is complete there.
const withProfile = (Screen: ComponentType<{ profile: Profile }>) =>
  function WithProfile() {
    const [answers] = useAnswers();
    return isComplete(answers) ? <Screen profile={answers} /> : null;
  };

const tabIcon =
  (Icon: LucideIcon) =>
  ({ color, focused }: { color: string; focused: boolean }) =>
    <Icon color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} />;

const MainTabs = createBottomTabNavigator({
  // Functions, so the colours are read at render time (light or dark).
  screenOptions: () => ({
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: colors.ink,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
    // Same white as the app, so the system bar area never shows a different colour.
    tabBarStyle: { backgroundColor: colors.ground, borderTopColor: colors.line },
  }),
  screens: {
    Today: { screen: withProfile(TodayScreen), options: { tabBarIcon: tabIcon(MessageCircle) } },
    Health: { screen: withProfile(HealthScreen), options: { tabBarIcon: tabIcon(HeartPulse) } },
  },
});

const RootStack = createNativeStackNavigator({
  screenOptions: () => ({ headerShown: false, contentStyle: { backgroundColor: colors.ground } }),
  screens: {
    Welcome: { if: useNeedsOnboarding, screen: WelcomeScreen },
    Onboarding: { if: useNeedsOnboarding, screen: OnboardingScreen },
    MainTabs: { if: useIsOnboarded, screen: MainTabs },
    ReportResult: { if: useIsOnboarded, screen: ReportResultScreen },
  },
});

const StaticNavigation = createStaticNavigation(RootStack);

// Kept across an appearance switch, so the app redraws on the same screen.
let savedState: NavigationState | undefined;

export function Navigation({ scheme }: { scheme: Scheme }) {
  return (
    <StaticNavigation
      theme={navigationThemeFor(scheme)}
      initialState={savedState}
      onStateChange={state => {
        savedState = state;
      }}
    />
  );
}

type RootStackParamList = StaticParamList<typeof RootStack>;

// Types useNavigation() and <Link> app-wide against the screens above.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
