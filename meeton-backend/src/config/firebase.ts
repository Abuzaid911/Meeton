import * as admin from 'firebase-admin';
import { getEnv } from './env';

/**
 * Firebase Admin SDK Configuration
 * Used for sending push notifications, managing user tokens, etc.
 */

class FirebaseManager {
  private static instance: admin.app.App | null = null;

  static initialize(): void {
    try {
      const env = getEnv();
      
      // Only initialize if not already initialized
      if (!this.instance && !admin.apps.length) {
        // For development, you can use a service account key file
        // For production, use environment variables or Google Cloud default credentials
        
        if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          // Parse the service account key from environment variable
          const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
          
          this.instance = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: env.FIREBASE_PROJECT_ID,
          });
        } else if (env.NODE_ENV === 'production') {
          // Use default credentials in production (Google Cloud environment)
          this.instance = admin.initializeApp({
            projectId: env.FIREBASE_PROJECT_ID,
          });
        } else {
          console.log('⚠️ Firebase not configured - notifications will be disabled');
          return;
        }
        
        console.log('✅ Firebase Admin SDK initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    }
  }

  static getApp(): admin.app.App | null {
    return this.instance;
  }

  static getMessaging(): admin.messaging.Messaging | null {
    if (this.instance) {
      return admin.messaging(this.instance);
    }
    return null;
  }

  static isInitialized(): boolean {
    return !!this.instance;
  }
}

export default FirebaseManager; 