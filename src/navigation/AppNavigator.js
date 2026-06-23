import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography } from '../theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ProgramsScreen from '../screens/ProgramsScreen';
import ProgramDetailScreen from '../screens/ProgramDetailScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Trainer Screens
import TrainerDashboardScreen from '../screens/trainer/TrainerDashboardScreen';
import ClientDetailScreen from '../screens/trainer/ClientDetailScreen';
import ClientWorkoutDetailScreen from '../screens/trainer/ClientWorkoutDetailScreen';
import ConnectionScreen from '../screens/trainer/ConnectionScreen';
import AssignProgramScreen from '../screens/trainer/AssignProgramScreen';

// Client Screens
import ConnectTrainerScreen from '../screens/client/ConnectTrainerScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const ProgramsStack = createStackNavigator();
const ExercisesStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const ClientsStack = createStackNavigator();

// Shared stack header styling. Renders the back arrow as an Ionicons glyph
// instead of React Navigation's default PNG — the PNG asset 404s under the
// GitHub Pages /gymmate/ subpath, whereas the Ionicons font is loaded via the
// @font-face injected in deploy.yml.
function stackScreenOptions(theme) {
  return {
    headerStyle: { backgroundColor: theme.bg },
    headerTintColor: theme.accent,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.bg },
    headerTitleStyle: { color: theme.accent, fontWeight: '700' },
    headerBackImage: ({ tintColor }) => (
      <Ionicons name="chevron-back" size={28} color={tintColor} style={{ marginLeft: spacing[2] }} />
    ),
  };
}

function HomeStackNav({ user }) {
  const { theme } = useTheme();
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <HomeStack.Screen name="HomeScreen" options={{ headerShown: false }}>
        {(props) => <HomeScreen {...props} user={user} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="Progress" component={ProgressScreen} options={{ title: 'Progress' }} />
      <HomeStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: 'Workout' }} />
    </HomeStack.Navigator>
  );
}

function ProgramsStackNav() {
  const { theme } = useTheme();
  return (
    <ProgramsStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <ProgramsStack.Screen name="ProgramsList" component={ProgramsScreen} options={{ title: 'Programs' }} />
      <ProgramsStack.Screen name="ProgramDetail" component={ProgramDetailScreen} options={{ title: 'Program' }} />
      <ProgramsStack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{ title: 'Workout', headerBackVisible: false }}
      />
      <ProgramsStack.Screen name="AssignProgram" component={AssignProgramScreen} options={{ headerShown: false }} />
    </ProgramsStack.Navigator>
  );
}

function ProfileStackNav({ onLogout }) {
  const { theme } = useTheme();
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <ProfileStack.Screen
        name="ProfileMain"
        options={({ navigation }) => ({
          title: 'Profile',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={{ marginRight: spacing[4] }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={24} color={theme.accent} />
            </TouchableOpacity>
          ),
        })}
      >
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <ProfileStack.Screen name="ConnectTrainer" component={ConnectTrainerScreen} options={{ headerShown: false }} />
    </ProfileStack.Navigator>
  );
}

function ClientsStackNav() {
  const { theme } = useTheme();
  return (
    <ClientsStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <ClientsStack.Screen name="ClientsList" component={TrainerDashboardScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="ClientWorkoutDetail" component={ClientWorkoutDetailScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="Connection" component={ConnectionScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="AssignProgram" component={AssignProgramScreen} options={{ headerShown: false }} />
    </ClientsStack.Navigator>
  );
}

function ExercisesStackNav() {
  const { theme } = useTheme();
  return (
    <ExercisesStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <ExercisesStack.Screen name="ExercisesList" component={ExercisesScreen} options={{ title: 'Exercises' }} />
      <ExercisesStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
    </ExercisesStack.Navigator>
  );
}

export default function AppNavigator({ user, onLogout }) {
  const { theme, isDark } = useTheme();
  const isTrainer = user?.role === 'trainer';

  // Disable linking to prevent URL changes
  const linking = {
    enabled: false,
  };

  // Theme the navigator itself so screen-transition backgrounds use our bg,
  // not React Navigation's default white (which flashed during transitions).
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: theme.bg, card: theme.card, border: theme.border, primary: theme.accent },
  };

  return (
    <NavigationContainer linking={linking} theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarLabelStyle: {
            fontSize: typography.sizes.xs,
            fontWeight: '600',
          },
          tabBarIcon: ({ focused }) => {
            const emoji = {
              Home: '🏠',
              Programs: '🏋️',
              Exercises: '📚',
              Profile: '👤',
              Clients: '👥',
            };
            return (
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
                {emoji[route.name] || '●'}
              </Text>
            );
          },
        })}
      >
        <Tab.Screen name="Home">
          {(props) => <HomeStackNav {...props} user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Programs" component={ProgramsStackNav} />
        <Tab.Screen name="Exercises" component={ExercisesStackNav} />

        {/* Trainer-only tabs */}
        {isTrainer && (
          <Tab.Screen name="Clients" component={ClientsStackNav} />
        )}

        <Tab.Screen
          name="Profile"
          children={() => <ProfileStackNav onLogout={onLogout} />}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
