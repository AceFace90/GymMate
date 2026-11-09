import React from 'react';
import { Platform, View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { spacing, typography, fontFamily, breakpoints } from '../theme';
import Icon from '../components/Icon';

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
const ProgressStack = createStackNavigator();
const SettingsStack = createStackNavigator();
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
    headerTitleStyle: { color: theme.text, fontWeight: '600', fontFamily },
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

function ProgressStackNav() {
  const { theme } = useTheme();
  return (
    <ProgressStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <ProgressStack.Screen name="ProgressMain" component={ProgressScreen} options={{ headerShown: false }} />
      <ProgressStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: 'Workout' }} />
    </ProgressStack.Navigator>
  );
}

// Settings tab (mirrors the iOS app). Profile ("Body & goals") and trainer connection live under it.
function SettingsStackNav({ user, onLogout }) {
  const { theme } = useTheme();
  return (
    <SettingsStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <SettingsStack.Screen name="SettingsMain" options={{ headerShown: false }}>
        {(props) => <SettingsScreen {...props} user={user} onLogout={onLogout} />}
      </SettingsStack.Screen>
      <SettingsStack.Screen name="Profile" options={{ title: 'Body & goals' }}>
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </SettingsStack.Screen>
      <SettingsStack.Screen name="ConnectTrainer" component={ConnectTrainerScreen} options={{ headerShown: false }} />
    </SettingsStack.Navigator>
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

const TABS = {
  Home: { icon: 'barbell', label: 'Today' },
  Programs: { icon: 'calendar', label: 'Programs' },
  Exercises: { icon: 'list', label: 'Exercises' },
  Progress: { icon: 'chart', label: 'Progress' },
  Clients: { icon: 'person', label: 'Clients' },
  Settings: { icon: 'gear', label: 'Settings' },
};

// Custom tab bar (React Navigation v6 has no tabBarPosition): frosted-glass bar on phones,
// floating rounded left sidebar on desktop, like MacroMate/LabMate web.
function TabBar({ state, navigation, desktop }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const glass = Platform.OS === 'web'
    ? { backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)' }
    : null;

  const container = desktop
    ? {
        position: 'absolute', top: 12, bottom: 12, left: 12, width: 248,
        backgroundColor: theme.card, borderRadius: 26, paddingTop: 64, paddingHorizontal: 10,
      }
    : {
        // LabMate-style floating pill: inset from the edges, glass blur, soft shadow.
        position: 'absolute', left: 12, right: 12, bottom: 10 + insets.bottom,
        maxWidth: 640, width: 'auto', alignSelf: 'center', marginHorizontal: 'auto',
        flexDirection: 'row', backgroundColor: theme.glass,
        borderWidth: 0.5, borderColor: theme.border, borderRadius: 32,
        paddingVertical: 6, paddingHorizontal: 4,
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 8px 28px rgba(0,0,0,0.14)' }
          : { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }),
        ...glass,
      };

  return (
    <View style={container}>
      {desktop ? (
        <Text style={{ position: 'absolute', top: 22, left: 22, fontSize: 22, fontWeight: '700', color: theme.text, fontFamily }}>GymMate</Text>
      ) : null}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const tab = TABS[route.name];
        if (!tab) return null;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        const color = desktop ? (focused ? theme.accentContrast : theme.text) : (focused ? theme.accent : theme.textSecondary);
        const iconColor = desktop && !focused ? theme.accent : color;
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            style={desktop
              ? { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 12, paddingHorizontal: 12, marginBottom: 2, backgroundColor: focused ? theme.accent : 'transparent' }
              : { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 4, borderRadius: 24, backgroundColor: focused ? theme.accentBg : 'transparent' }}
          >
            <Icon name={tab.icon} size={desktop ? 20 : 24} color={iconColor} />
            <Text style={desktop
              ? { fontSize: 15, fontWeight: '500', fontFamily, marginLeft: 12, color }
              : { fontSize: 10, fontWeight: '500', fontFamily, color }}
            >{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AppNavigator({ user, onLogout }) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= breakpoints.desktop;
  const isTrainer = user?.role === 'trainer';

  // Disable linking to prevent URL changes
  const linking = { enabled: false };

  // Theme the navigator itself so screen-transition backgrounds use our bg,
  // not React Navigation's default white (which flashed during transitions).
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: theme.bg, card: theme.card, border: theme.border, primary: theme.accent, text: theme.text },
  };

  return (
    <NavigationContainer linking={linking} theme={navTheme}>
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} desktop={desktop} />}
        sceneContainerStyle={{ backgroundColor: theme.bg, paddingLeft: desktop ? 272 : 0, paddingBottom: desktop ? 0 : 84 }}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home">
          {(props) => <HomeStackNav {...props} user={user} />}
        </Tab.Screen>
        <Tab.Screen name="Programs" component={ProgramsStackNav} />
        <Tab.Screen name="Exercises" component={ExercisesStackNav} />
        <Tab.Screen name="Progress" component={ProgressStackNav} />

        {/* Trainer-only tab */}
        {isTrainer && <Tab.Screen name="Clients" component={ClientsStackNav} />}

        <Tab.Screen name="Settings">
          {(props) => <SettingsStackNav {...props} user={user} onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
