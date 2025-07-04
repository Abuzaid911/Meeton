# Firebase Setup Guide for MeetOn Notifications

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in the MeetOn app.

## 🔥 Firebase Project Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Name your project "MeetOn" (or your preferred name)
4. Enable Google Analytics (optional but recommended)
5. Click "Create project"

### 2. Add Android App
1. In your Firebase project, click "Add app" and select Android
2. Android package name: `com.meeton.app` (must match your app.json applicationId)
3. App nickname: "MeetOn Android"
4. SHA-1 certificate fingerprint (optional for now, required for Google Sign-In)
5. Download `google-services.json`
6. Place the file in `android/app/google-services.json`

### 3. Add iOS App
1. Click "Add app" and select iOS
2. iOS bundle ID: `com.meeton.app` (must match your app.json bundleIdentifier)
3. App nickname: "MeetOn iOS"
4. Download `GoogleService-Info.plist`
5. Place the file in `ios/MeetOn/GoogleService-Info.plist`

## 📱 React Native Configuration

### 1. Install Firebase Packages (Already Done)
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### 2. Android Configuration

#### Update `android/app/build.gradle`:
```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services' // Add this line

dependencies {
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-messaging'
    // ... other dependencies
}
```

#### Update `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15' // Add this line
        // ... other classpaths
    }
}
```

#### Update `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <application android:name=".MainApplication">
        <!-- Firebase Messaging Service -->
        <service
            android:name="io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
        
        <!-- Firebase Messaging Headless Service -->
        <service android:name="io.invertase.firebase.messaging.ReactNativeFirebaseMessagingHeadlessService" />
        
        <!-- Default notification channel -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="meeton_notifications" />
        
        <!-- Default notification icon -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_stat_ic_notification" />
        
        <!-- Default notification color -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/colorAccent" />
            
        <!-- ... other config -->
    </application>
</manifest>
```

### 3. iOS Configuration

#### Add Firebase to iOS project:
1. Open `ios/MeetOn.xcworkspace` in Xcode
2. Right-click on "MeetOn" project in navigator
3. Select "Add Files to MeetOn"
4. Navigate to `ios/MeetOn/GoogleService-Info.plist` and add it
5. Make sure "Add to target" is checked for MeetOn target

#### Update `ios/MeetOn/AppDelegate.swift`:
```swift
import UIKit
import Firebase
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize Firebase
        FirebaseApp.configure()
        
        // Request notification permissions
        UNUserNotificationCenter.current().delegate = self
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(
            options: authOptions,
            completionHandler: { _, _ in }
        )
        
        application.registerForRemoteNotifications()
        
        // ... other setup
        return true
    }
    
    // Handle remote notifications
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }
    
    // Handle foreground notifications
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([[.alert, .sound]])
    }
    
    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        completionHandler()
    }
}
```

## 🛠️ Backend Firebase Configuration

### 1. Generate Service Account Key
1. In Firebase Console, go to Project Settings → Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Store it securely (DO NOT commit to git)

### 2. Environment Variables
Add to your backend `.env` file:
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...} # Full JSON as string

# Alternative: Use file path in development
# FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json
```

### 3. Production Deployment
For production on Google Cloud:
- Use Google Cloud default credentials
- Set only `FIREBASE_PROJECT_ID` environment variable
- The service will automatically authenticate using the instance credentials

## 🧪 Testing Notifications

### 1. Test from Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and text
4. Target: Select your app
5. Send test message

### 2. Test with Backend API
```bash
# Register a device token (from app logs)
curl -X POST http://localhost:3000/api/notifications/register-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"token":"FCM_DEVICE_TOKEN","deviceInfo":{"platform":"ios"}}'

# Test friend request notification
curl -X POST http://localhost:3000/api/friends/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"receiverId":"USER_ID"}'
```

## 🔧 Troubleshooting

### Common Issues:
1. **No FCM token received**: Check permissions and Firebase configuration
2. **Notifications not showing**: Verify notification channel setup (Android)
3. **Backend sending fails**: Check service account key and project ID
4. **iOS notifications not working**: Verify APNs configuration and certificates

### Debug Logs:
- Check React Native logs: `npx react-native log-android` or `npx react-native log-ios`
- Check backend logs for Firebase initialization messages
- Use Firebase Console → Cloud Messaging → Reports for delivery status

## 📋 Notification Types Implemented

### Friend Requests:
- **Trigger**: When someone sends a friend request
- **Action**: Opens Friends screen
- **Data**: `{ type: 'friend_request', requestId: 'xxx' }`

### Event Invitations:
- **Trigger**: When invited to an event
- **Action**: Opens Event Details screen
- **Data**: `{ type: 'event_invitation', eventId: 'xxx' }`

### Event Updates:
- **Trigger**: When event details change
- **Action**: Opens Event Details screen
- **Data**: `{ type: 'event_update', eventId: 'xxx' }`

## 🔐 Security Notes

1. **Service Account Key**: Never commit to version control
2. **Environment Variables**: Use secure environment variable management
3. **Token Validation**: Backend validates all FCM tokens before sending
4. **User Permissions**: Respect user notification preferences
5. **Rate Limiting**: Implemented to prevent notification spam

## 📚 Documentation Links

- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Firebase Cloud Messaging Guide](https://firebase.google.com/docs/cloud-messaging)
- [FCM HTTP v1 API Reference](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages) 