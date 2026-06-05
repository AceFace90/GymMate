import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

const Tab = createBottomTabNavigator();
const ProgramsStack = createNativeStackNavigator();
const ExercisesStack = createNativeStackNavigator();

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

export default function AppNavigator() {
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
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Programs: focused ? 'barbell' : 'barbell-outline',
              Progress: focused ? 'trending-up' : 'trending-up-outline',
              Exercises: focused ? 'library' : 'library-outline',
              Profile: focused ? 'person' : 'person-outline',
            };
            return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Programs" component={ProgramsStackNav} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Exercises" component={ExercisesStackNav} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
