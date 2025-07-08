import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIService } from './api';

// Conditional imports to prevent module errors
let messaging: any = null;
let Notifications: any = null;
let Device: any = null;

try {
  const firebaseMessaging = require('@react-native-firebase/messaging');
  messaging = firebaseMessaging.default;
} catch (error) {
  console.warn('⚠️ Firebase Messaging module not available, falling back to Expo notifications');
}

try {
  Notifications = require('expo-notifications').default;
  Device = require('expo-device').default;
} catch (error) {
  console.warn('⚠️ Expo Notifications module not available');
}

/**
 * Enhanced Notification Service for React Native/Expo
 * Handles push notification setup, token management, and notification handling
 * Uses Expo notifications as primary system with Firebase as fallback
 */

interface NotificationHandler {
  onNotificationReceived?: (notification: any) => void;
  onNotificationOpened?: (notification: any) => void;
}

class NotificationService {
  private isInitialized = false;
  private handlers: NotificationHandler = {};
  private notificationToken: string | null = null;
  private useExpoNotifications = false;

  /**
   * Initialize notification system
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      console.log('🔔 Initializing Notification Service...');

      // Determine which notification system to use
      if (Notifications && Device) {
        console.log('📱 Using Expo Notifications (recommended for iOS)');
        this.useExpoNotifications = true;
        await this.initializeExpoNotifications();
      } else if (messaging) {
        console.log('🔥 Using Firebase Messaging');
        this.useExpoNotifications = false;
        try {
          await this.initializeFirebaseMessaging();
        } catch (firebaseError) {
          console.log('⚠️ Firebase messaging initialization failed, continuing without notifications:', firebaseError);
        }
      } else {
        console.log('⚠️ No notification system available');
        return;
      }

      this.isInitialized = true;
      console.log('✅ Notification Service initialized successfully');
    } catch (error) {
      console.log('⚠️ Failed to initialize Notification Service, continuing without notifications:', error);
      // Don't throw error - let the app continue without notifications
      this.isInitialized = false;
    }
  }

  /**
   * Initialize Expo Notifications (better for iOS)
   */
  private async initializeExpoNotifications(): Promise<void> {
    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      const permission = await this.requestExpoPermission();
      if (!permission) {
        console.log('⚠️ Expo notification permission denied');
        return;
      }

      // Get push token
      await this.getExpoPushToken();

      // Set up listeners
      this.setupExpoNotificationListeners();

    } catch (error) {
      console.error('Error initializing Expo notifications:', error);
    }
  }

  /**
   * Initialize Firebase Messaging (fallback)
   */
  private async initializeFirebaseMessaging(): Promise<void> {
    try {
      // Request permission for notifications
      const permission = await this.requestFirebasePermission();
      if (!permission) {
        console.log('⚠️ Firebase notification permission denied');
        return;
      }

      // Get FCM token
      await this.getFirebaseToken();

      // Set up notification listeners
      this.setupFirebaseNotificationListeners();

    } catch (error) {
      console.log('⚠️ Error initializing Firebase messaging, continuing without it:', error);
      // Don't throw error - let the app continue without Firebase notifications
    }
  }

  /**
   * Request Expo notification permissions
   */
  private async requestExpoPermission(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        Alert.alert('Error', 'Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Enable Notifications',
          'Turn on notifications to get updates about friend requests, events, and more.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => this.openSettings() },
          ]
        );
        return false;
      }

      console.log('✅ Expo notification permission granted');
      return true;
    } catch (error) {
      console.error('Error requesting Expo notification permission:', error);
      return false;
    }
  }

  /**
   * Request Firebase notification permissions
   */
  private async requestFirebasePermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Firebase notification permission granted:', authStatus);
        return true;
      } else {
        console.log('❌ Firebase notification permission denied:', authStatus);
        
        Alert.alert(
          'Enable Notifications',
          'Turn on notifications to get updates about friend requests, events, and more.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => this.openSettings() },
          ]
        );
        
        return false;
      }
    } catch (error) {
      console.log('⚠️ Error requesting Firebase notification permission, continuing without notifications:', error);
      return false;
    }
  }

  /**
   * Get Expo push token
   */
  private async getExpoPushToken(): Promise<void> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-expo-project-id',
      });
      
      if (token) {
        this.notificationToken = token.data;
        console.log('📱 Expo Push Token received:', token.data.substring(0, 20) + '...');
        
        // Store token locally
        await AsyncStorage.setItem('expo_push_token', token.data);
        
        // Register token with backend
        await this.registerTokenWithBackend(token.data);
      } else {
        console.log('⚠️ No Expo push token received');
      }
    } catch (error) {
      console.error('Error getting Expo push token:', error);
    }
  }

  /**
   * Get Firebase token
   */
  private async getFirebaseToken(): Promise<void> {
    try {
      // Register device for remote messages first (required for iOS)
      if (Platform.OS === 'ios') {
        try {
          await messaging().registerDeviceForRemoteMessages();
          console.log('📱 Device registered for remote messages');
        } catch (registerError) {
          console.log('⚠️ Device registration failed, continuing without FCM:', registerError);
          return; // Exit gracefully if registration fails
        }
      }

      const token = await messaging().getToken();
      
      if (token) {
        this.notificationToken = token;
        console.log('📱 Firebase FCM Token received:', token.substring(0, 20) + '...');
        
        // Store token locally
        await AsyncStorage.setItem('fcm_token', token);
        
        // Register token with backend
        await this.registerTokenWithBackend(token);
        
        // Listen for token refresh
        messaging().onTokenRefresh(async (newToken: string) => {
          console.log('🔄 FCM Token refreshed');
          this.notificationToken = newToken;
          await AsyncStorage.setItem('fcm_token', newToken);
          await this.registerTokenWithBackend(newToken);
        });
      } else {
        console.log('⚠️ No FCM token received');
      }
    } catch (error) {
      console.log('⚠️ Error getting FCM token, continuing without it:', error);
      // Don't throw error - let the app continue without FCM
    }
  }

  /**
   * Register token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        tokenType: this.useExpoNotifications ? 'expo' : 'fcm',
        registeredAt: new Date().toISOString(),
      };

      const success = await APIService.registerDeviceToken(token, Platform.OS as 'ios' | 'android');
      if (success) {
        console.log('✅ Push token registered with backend');
      } else {
        console.log('⚠️ Failed to register push token with backend');
      }
    } catch (error) {
      console.error('Error registering push token with backend:', error);
    }
  }

  /**
   * Set up Expo notification listeners
   */
  private setupExpoNotificationListeners(): void {
    // Handle notification when app is in foreground
    Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('📱 Expo foreground notification received:', notification);
      
      if (this.handlers.onNotificationReceived) {
        this.handlers.onNotificationReceived(notification);
      } else {
        // Show default alert if no handler
        this.showDefaultNotification(notification);
      }
    });

    // Handle notification tap (app opened from notification)
    Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('📱 Expo notification tapped:', response);
      
      if (this.handlers.onNotificationOpened) {
        this.handlers.onNotificationOpened(response.notification);
      }
    });
  }

  /**
   * Set up Firebase notification listeners
   */
  private setupFirebaseNotificationListeners(): void {
    // Handle notification when app is in background/quit
    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('📱 Firebase background notification received:', remoteMessage);
    });

    // Handle notification when app is in foreground
    messaging().onMessage(async (remoteMessage: any) => {
      console.log('📱 Firebase foreground notification received:', remoteMessage);
      
      if (this.handlers.onNotificationReceived) {
        this.handlers.onNotificationReceived(remoteMessage);
      } else {
        this.showDefaultNotification(remoteMessage);
      }
    });

    // Handle notification opening
    messaging().onNotificationOpenedApp((remoteMessage: any) => {
      console.log('📱 App opened from Firebase notification:', remoteMessage);
      
      if (this.handlers.onNotificationOpened) {
        this.handlers.onNotificationOpened(remoteMessage);
      }
    });

    // Handle initial notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('📱 App launched from Firebase notification:', remoteMessage);
          
          if (this.handlers.onNotificationOpened) {
            this.handlers.onNotificationOpened(remoteMessage);
          }
        }
      });
  }

  /**
   * Show default notification alert
   */
  private showDefaultNotification(notification: any): void {
    let title = 'Notification';
    let body = 'You have a new notification';

    if (this.useExpoNotifications) {
      title = notification.request?.content?.title || title;
      body = notification.request?.content?.body || body;
    } else {
      title = notification.notification?.title || title;
      body = notification.notification?.body || body;
    }
    
    Alert.alert(title, body, [{ text: 'OK', style: 'default' }]);
  }

  /**
   * Set notification handlers
   */
  setHandlers(handlers: NotificationHandler): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Get current push token
   */
  async getCurrentToken(): Promise<string | null> {
    if (this.notificationToken) {
      return this.notificationToken;
    }

    try {
      const storageKey = this.useExpoNotifications ? 'expo_push_token' : 'fcm_token';
      const storedToken = await AsyncStorage.getItem(storageKey);
      
      if (storedToken) {
        this.notificationToken = storedToken;
        return storedToken;
      }

      // Try to get fresh token
      if (this.useExpoNotifications && Notifications) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-expo-project-id',
        });
        if (token) {
          this.notificationToken = token.data;
          await AsyncStorage.setItem('expo_push_token', token.data);
          return token.data;
        }
      } else if (messaging) {
        try {
          // Register device for remote messages first (required for iOS)
          if (Platform.OS === 'ios') {
            await messaging().registerDeviceForRemoteMessages();
          }
          
          const token = await messaging().getToken();
          if (token) {
            this.notificationToken = token;
            await AsyncStorage.setItem('fcm_token', token);
            return token;
          }
        } catch (fcmError) {
          console.log('⚠️ Error getting fresh FCM token:', fcmError);
          // Continue without FCM token
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current push token:', error);
      return null;
    }
  }

  /**
   * Unregister push token (logout)
   */
  async unregister(): Promise<void> {
    try {
      const token = await this.getCurrentToken();
      
      if (token) {
        const success = await APIService.unregisterDeviceToken(token);
        if (success) {
          console.log('✅ Push token unregistered from backend');
        }
      }

      // Clear local storage
      await AsyncStorage.removeItem('expo_push_token');
      await AsyncStorage.removeItem('fcm_token');
      this.notificationToken = null;
      
      console.log('✅ Push token cleared locally');
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  }

  /**
   * Open device settings
   */
  private openSettings(): void {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Open Settings',
        'Go to Settings > Notifications > MeetOn to enable notifications',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Open Settings',
        'Go to Settings > Apps > MeetOn > Notifications to enable notifications',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Check if notifications are enabled
   */
  async isEnabled(): Promise<boolean> {
    try {
      if (this.useExpoNotifications && Notifications) {
        const { status } = await Notifications.getPermissionsAsync();
        return status === 'granted';
      } else if (messaging) {
        const authStatus = await messaging().hasPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      }
      return false;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  /**
   * Set notification badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'ios' && this.useExpoNotifications && Notifications) {
        await Notifications.setBadgeCountAsync(count);
        console.log('📱 Badge count set to:', count);
      }
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger?: { seconds?: number; date?: Date }
  ): Promise<void> {
    try {
      if (this.useExpoNotifications && Notifications) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
          },
          trigger: trigger || null,
        });
        console.log('📱 Local notification scheduled');
      }
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService; 