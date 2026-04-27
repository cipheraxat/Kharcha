import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { useStore } from '../store';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import SyncScreen from '../screens/SyncScreen';
import OverviewScreen from '../screens/OverviewScreen';
import BreakdownScreen from '../screens/BreakdownScreen';
import PatternsScreen from '../screens/PatternsScreen';
import SavingsScreen from '../screens/SavingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Sync: undefined;
  Main: undefined;
};

export type TabParamList = {
  Overview: undefined;
  Breakdown: undefined;
  Patterns: undefined;
  Savings: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 18,
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: COLORS.borderSoft,
          borderRadius: 26,
          shadowColor: COLORS.shadow,
          shadowOpacity: 1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Overview: 'grid-outline',
            Breakdown: 'pie-chart-outline',
            Patterns: 'analytics-outline',
            Savings: 'wallet-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={(icons[route.name] ?? 'help-outline') as React.ComponentProps<typeof Ionicons>['name']} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Breakdown" component={BreakdownScreen} />
      <Tab.Screen name="Patterns" component={PatternsScreen} />
      <Tab.Screen name="Savings" component={SavingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const session = useStore((s) => s.session);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Sync"
              component={SyncScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
