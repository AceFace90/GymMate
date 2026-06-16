import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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
import TemplatesScreen from '../screens/trainer/TemplatesScreen';
import AssignProgramScreen from '../screens/trainer/AssignProgramScreen';

// Client Screens
import ConnectTrainerScreen from '../screens/client/ConnectTrainerScreen';

const Tab = createBottomTabNavigator();
const ProgramsStack = createStackNavigator();
const ProgressStack = createStackNavigator();
const ExercisesStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const ClientsStack = createStackNavigator();
const TemplatesStack = createStackNavigator();

function ProgramsStackNav() {
  const { theme } = useTheme();
  return (
    <ProgramsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.accent, fontWeight: '700' },
      }}
    >
      <ProgramsStack.Screen name="ProgramsList" component={ProgramsScreen} options={{ title: 'Programs' }} />
      <ProgramsStack.Screen name="ProgramDetail" component={ProgramDetailScreen} options={{ title: 'Program' }} />
      <ProgramsStack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{ title: 'Workout', headerBackVisible: false }}
      />
    </ProgramsStack.Navigator>
  );
}

function ProgressStackNav() {
  const { theme } = useTheme();
  return (
    <ProgressStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.accent, fontWeight: '700' },
      }}
    >
      <ProgressStack.Screen name="ProgressMain" component={ProgressScreen} options={{ title: 'Progress' }} />
    </ProgressStack.Navigator>
  );
}

function ProfileStackNav({ onLogout }) {
  const { theme } = useTheme();
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.accent, fontWeight: '700' },
      }}
    >
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
              <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
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
    <ClientsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.accent, fontWeight: '700' },
      }}
    >
      <ClientsStack.Screen name="ClientsList" component={TrainerDashboardScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="ClientWorkoutDetail" component={ClientWorkoutDetailScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="Connection" component={ConnectionScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="Templates" component={TemplatesScreen} options={{ headerShown: false }} />
      <ClientsStack.Screen name="AssignProgram" component={AssignProgramScreen} options={{ headerShown: false }} />
    </ClientsStack.Navigator>
  );
}

function TemplatesStackNav() {
  const { theme } = useTheme();
  return (
    <TemplatesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.accent, fontWeight: '700' },
      }}
    >
      <TemplatesStack.Screen name="TemplatesList" component={TemplatesScreen} options={{ headerShown: false }} />
      <TemplatesStack.Screen name="ProgramDetail" component={ProgramDetailScreen} options={{ title: 'Program' }} />
      <TemplatesStack.Screen name="AssignProgram" component={AssignProgramScreen} options={{ headerShown: false }} />
    </TemplatesStack.Navigator>
  );
}

function ExercisesStackNav() {
  const { theme } = useTheme();
  return (
    <ExercisesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
        headerTitleStyle: { color: theme.accent, fontWeight: '700' },
      }}
    >
      <ExercisesStack.Screen name="ExercisesList" component={ExercisesScreen} options={{ title: 'Exercises' }} />
      <ExercisesStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
    </ExercisesStack.Navigator>
  );
}

export default function AppNavigator({ user, onLogout }) {
  const { theme } = useTheme();
  const isTrainer = user?.role === 'trainer';

  return (
    <NavigationContainer>
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
              Progress: '📈',
              Exercises: '📚',
              Profile: '👤',
              Clients: '👥',
              Templates: '📋',
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
          {(props) => <HomeScreen {...props} user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Programs" component={ProgramsStackNav} />
        <Tab.Screen name="Progress" component={ProgressStackNav} />
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
