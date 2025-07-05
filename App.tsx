import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import AppNavigator from './src/navigation/AppNavigator';

// Wrapper component to access auth context
function AppWithLocation() {
  const { user } = useAuth();

  return (
    <>
      {user ? (
        <LocationProvider currentUser={user}>
          <BottomSheetModalProvider>
            <AppNavigator />
          </BottomSheetModalProvider>
        </LocationProvider>
      ) : (
        <BottomSheetModalProvider>
          <AppNavigator />
        </BottomSheetModalProvider>
      )}
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  useEffect(() => {
    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('App received deep link while running:', event.url);
      // The GoogleAuthService will handle the OAuth callback
    });

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('App opened with deep link:', url);
        // The GoogleAuthService will handle this during OAuth flow
      }
    });

    return () => subscription?.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppWithLocation />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
