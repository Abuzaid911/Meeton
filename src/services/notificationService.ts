import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIService } from './api';

// Conditional import to prevent module errors
let messaging: any = null;

try {
  const firebaseMessaging = require('@react-native-firebase/messaging');
  messaging = firebaseMessaging.default;
} catch (error) {
  console.warn('⚠️ Firebase Messaging module not available, notifications will be disabled');
}

/**
 * Firebase Notification Service for React Native
 * Handles push notification setup, token management, and notification handling
 */

interface NotificationHandler {
  onNotificationReceived?: (notification: any) => void;
  onNotificationOpened?: (notification: any) => void;
}

class NotificationService {
  private isInitialized = false;
  private handlers: NotificationHandler = {};
  private fcmToken: string | null = null;

  /**
   * Initialize Firebase messaging
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      if (!messaging) {
        console.log('⚠️ Firebase Messaging not available, notifications disabled');
        return;
      }

      console.log('🔔 Initializing Firebase Messaging...');

      // Request permission for notifications
      const permission = await this.requestPermission();
      if (!permission) {
        console.log('⚠️ Notification permission denied');
        return;
      }

      // Get FCM token
      await this.getFCMToken();

      // Set up notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('✅ Firebase Messaging initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Messaging:', error);
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermission(): Promise<boolean> {
    try {
      if (!messaging) {
        return false;
      }
      
      const authStatus = await messaging().requestPermission();
      
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Notification permission granted:', authStatus);
        return true;
      } else {
        console.log('❌ Notification permission denied:', authStatus);
        
        // Show alert to user about enabling notifications
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
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM token and register with backend
   */
  private async getFCMToken(): Promise<void> {
    try {
      if (!messaging) {
        return;
      }
      
      const token = await messaging().getToken();
      
      if (token) {
        this.fcmToken = token;
        console.log('📱 FCM Token received:', token.substring(0, 20) + '...');
        
        // Store token locally
        await AsyncStorage.setItem('fcm_token', token);
        
        // Register token with backend
        await this.registerTokenWithBackend(token);
        
        // Listen for token refresh
        messaging().onTokenRefresh(async (newToken: string) => {
          console.log('🔄 FCM Token refreshed');
          this.fcmToken = newToken;
          await AsyncStorage.setItem('fcm_token', newToken);
          await this.registerTokenWithBackend(newToken);
        });
      } else {
        console.log('⚠️ No FCM token received');
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  }

  /**
   * Register FCM token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        registeredAt: new Date().toISOString(),
      };

      // Use fetch directly since makeRequest is private
      const validToken = await APIService.getValidAccessToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'}/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': validToken ? `Bearer ${validToken}` : '',
        },
        body: JSON.stringify({ token, deviceInfo }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ FCM token registered with backend');
      } else {
        console.log('⚠️ Failed to register FCM token with backend');
      }
    } catch (error) {
      console.error('Error registering FCM token with backend:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    if (!messaging) {
      return;
    }
    
    // Handle notification when app is in background/quit
    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('📱 Background notification received:', remoteMessage);
      // Background notifications are handled by the system
    });

    // Handle notification when app is in foreground
    messaging().onMessage(async (remoteMessage: any) => {
      console.log('📱 Foreground notification received:', remoteMessage);
      
      if (this.handlers.onNotificationReceived) {
        this.handlers.onNotificationReceived(remoteMessage);
      } else {
        // Show default alert if no handler
        this.showDefaultNotification(remoteMessage);
      }
    });

    // Handle notification opening (app launched from notification)
    messaging().onNotificationOpenedApp((remoteMessage: any) => {
      console.log('📱 App opened from notification:', remoteMessage);
      
      if (this.handlers.onNotificationOpened) {
        this.handlers.onNotificationOpened(remoteMessage);
      }
    });

    // Handle initial notification (app launched from quit state)
    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('📱 App launched from notification:', remoteMessage);
          
          if (this.handlers.onNotificationOpened) {
            this.handlers.onNotificationOpened(remoteMessage);
          }
        }
      });
  }

  /**
   * Show default notification alert
   */
  private showDefaultNotification(remoteMessage: any): void {
    const { notification } = remoteMessage;
    
    if (notification) {
      Alert.alert(
        notification.title || 'Notification',
        notification.body || 'You have a new notification',
        [
          { text: 'OK', style: 'default' },
        ]
      );
    }
  }

  /**
   * Set notification handlers
   */
  setHandlers(handlers: NotificationHandler): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Get current FCM token
   */
  async getCurrentToken(): Promise<string | null> {
    if (this.fcmToken) {
      return this.fcmToken;
    }

    try {
      if (!messaging) {
        return null;
      }
      
      const storedToken = await AsyncStorage.getItem('fcm_token');
      if (storedToken) {
        this.fcmToken = storedToken;
        return storedToken;
      }

      const token = await messaging().getToken();
      if (token) {
        this.fcmToken = token;
        await AsyncStorage.setItem('fcm_token', token);
      }
      
      return token;
    } catch (error) {
      console.error('Error getting current FCM token:', error);
      return null;
    }
  }

  /**
   * Unregister FCM token (logout)
   */
  async unregister(): Promise<void> {
    try {
      const token = await this.getCurrentToken();
      
      if (token) {
                 // Unregister from backend
         try {
           const validToken = await APIService.getValidAccessToken();
           const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'}/notifications/unregister-token`, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': validToken ? `Bearer ${validToken}` : '',
             },
             body: JSON.stringify({ token }),
           });
           const data = await response.json();
           if (data.success) {
             console.log('✅ FCM token unregistered from backend');
           }
         } catch (error) {
           console.error('Error unregistering FCM token from backend:', error);
         }
      }

      // Clear local storage
      await AsyncStorage.removeItem('fcm_token');
      this.fcmToken = null;
      
      console.log('✅ FCM token cleared locally');
    } catch (error) {
      console.error('Error unregistering FCM token:', error);
    }
  }

  /**
   * Open device settings (iOS)
   */
  private openSettings(): void {
    if (Platform.OS === 'ios') {
      // On iOS, we can't directly open notification settings
      // We can only open general settings
      Alert.alert(
        'Open Settings',
        'Go to Settings > Notifications > MeetOn to enable notifications',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Check if notifications are enabled
   */
  async isEnabled(): Promise<boolean> {
    try {
      if (!messaging) {
        return false;
      }
      
      const authStatus = await messaging().hasPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  /**
   * Get notification badge count (iOS)
   */
  async getBadgeCount(): Promise<number> {
    try {
      if (Platform.OS === 'ios' && messaging) {
        return await messaging().getAPNSToken() ? 0 : 0; // Placeholder
      }
      return 0;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set notification badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // Implementation would go here
        console.log('Setting badge count to:', count);
      }
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService; 