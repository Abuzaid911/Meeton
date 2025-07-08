import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import AuthNavigator from './AuthNavigator';
import { Colors, FontSize, FontWeight } from '../constants';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import EventListScreen from '../screens/EventListScreen';  // New iOS-style screen
import CreateEventScreen from '../screens/events/CreateEventScreen';
import EditEventScreen from '../screens/events/EditEventScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EventDetailsScreen from '../screens/events/EventDetailsScreen';
import GuestListScreen from '../screens/events/GuestListScreen';
import EventPhotosScreen from '../screens/events/EventPhotosScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import FriendsScreen from '../screens/profile/FriendsScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LocationSettingsScreen from '../screens/settings/LocationSettingsScreen';
import CalendarScreen from '../screens/CalendarScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Custom Notification Tab Icon with Badge
const NotificationTabIcon: React.FC<{ focused: boolean; color: string; size: number }> = ({ focused, color, size }) => {
  const { unreadCount } = useNotifications();
  const iconName = focused ? 'notifications' : 'notifications-outline';

  return (
    <View style={{ position: 'relative' }}>
      <Ionicons name={iconName} size={size} color={color} />
      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -5,
            right: -8,
            backgroundColor: Colors.systemRed,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: Colors.black,
          }}
        >
          <Text
            style={{
              color: Colors.white,
              fontSize: FontSize.xs,
              fontWeight: FontWeight.bold,
              textAlign: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );
};

// Stack Navigator for Home and Event-related screens
function HomeStack() {
  return (
    <Stack.Navigator 
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.backgroundSecondary,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen 
        name="HomeMain" 
        component={EventListScreen}  // Use the new iOS-style screen
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="HomeSlider" 
        component={HomeScreen}  // Keep the original slider version
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
        options={{ 
          title: '',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen 
        name="EditEvent" 
        component={EditEventScreen}
        options={{ 
          title: '',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="GuestList" 
        component={GuestListScreen}
        options={{ title: 'Guest List', headerShown: false }}
      />
      <Stack.Screen 
        name="EventPhotos" 
        component={EventPhotosScreen}
        options={{ title: 'Photos', headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator for Create Event
function CreateEventStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.backgroundSecondary,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen 
        name="CreateEventMain" 
        component={CreateEventScreen}
        options={{ 
          title: 'Create Event',
          headerShown: false 
        }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{
          title: 'Event Details',
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator for Calendar
function CalendarStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.backgroundSecondary,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen 
        name="CalendarMain" 
        component={CalendarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
        options={{ 
          title: '',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator for Search
function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.backgroundSecondary,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen 
        name="SearchMain" 
        component={SearchScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator for Notifications
function NotificationsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.backgroundSecondary,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen 
        name="NotificationsMain" 
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator for Profile
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.backgroundSecondary,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ 
          presentation: 'modal',
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="LocationSettings" 
        component={LocationSettingsScreen}
        options={{ 
          presentation: 'modal',
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
}

// Bottom Tab Navigator
function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Create':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Calendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Notifications':
              return <NotificationTabIcon focused={focused} color={color} size={size} />;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        tabBarBackground: () => (
          <BlurView 
            intensity={100} 
            tint="dark" 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.2)',
            }}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 90,
          paddingBottom: 25,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Calendar" 
        component={CalendarStack}
        options={{ tabBarLabel: 'Calendar' }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateEventStack}
        options={{ 
          tabBarLabel: 'Create',
          tabBarIconStyle: { marginBottom: -3 },
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchStack}
        options={{ tabBarLabel: 'Search' }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsStack}
        options={{ tabBarLabel: 'Activity' }}
      />
    </Tab.Navigator>
  );
}

// Loading Screen Component
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.black }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

// Root Stack Navigator to handle global screens
function RootStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          presentation: 'modal',
          animationTypeForReplace: 'push',
        }}
      />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfileScreen}
        options={{
          presentation: 'modal',
          animationTypeForReplace: 'push',
        }}
      />
      <Stack.Screen 
        name="Friends" 
        component={FriendsScreen}
        options={{
          presentation: 'modal',
          animationTypeForReplace: 'push',
        }}
      />
      <Stack.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{
          presentation: 'modal',
          animationTypeForReplace: 'push',
        }}
      />
    </Stack.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show welcome screen if user is authenticated but hasn't completed onboarding
  if (isAuthenticated && user && !user.onboardingCompleted) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <RootStackNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
} 