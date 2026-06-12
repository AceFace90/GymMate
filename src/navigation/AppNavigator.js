import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography } from '../theme';

// Screens
import ProgramsScreen from '../screens/ProgramsScreen';
import ProgramDetailScreen from '../screens/ProgramDetailScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BiometricsScreen from '../screens/BiometricsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const ProgramsStack = createStackNavigator();
const ExercisesStack = createStackNavigator();
const ProfileStack = createStackNavigator();

function ProgramsStackNav() {
  const { theme } = useTheme();
  return (
    <ProgramsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
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

function ProfileStackNav({ onLogout }) {
  const { theme } = useTheme();
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
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
      <ProfileStack.Screen name="Biometrics" component={BiometricsScreen} options={{ title: 'Biometrics & Goals' }} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </ProfileStack.Navigator>
  );
}

function ExercisesStackNav() {
  const { theme } = useTheme();
  return (
    <ExercisesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <ExercisesStack.Screen name="ExercisesList" component={ExercisesScreen} options={{ title: 'Exercises' }} />
      <ExercisesStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Exercise' }} />
    </ExercisesStack.Navigator>
  );
}

export default function AppNavigator({ onLogout }) {
  const { theme } = useTheme();

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
              Programs: '🏋️',
              Progress: '📈',
              Exercises: '📚',
              Profile: '👤',
            };
            return (
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
                {emoji[route.name] || '●'}
              </Text>
            );
          },
        })}
      >
        <Tab.Screen name="Programs" component={ProgramsStackNav} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Exercises" component={ExercisesStackNav} />
        <Tab.Screen
          name="Profile"
          children={() => <ProfileStackNav onLogout={onLogout} />}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
