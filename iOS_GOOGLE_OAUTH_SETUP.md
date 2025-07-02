# Google OAuth iOS Setup Guide for MeetOn

## 🍎 iOS Google OAuth Configuration

This guide will help you set up Google OAuth specifically for iOS in your MeetOn React Native app.

## 📋 Prerequisites

- Google Cloud Console project already created
- Backend OAuth already configured (✅ Complete)
- iOS development environment set up
- Xcode installed

## 🔧 Step 1: Create iOS OAuth Client

### 1.1 Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your MeetOn project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**
5. Choose **Application type**: **iOS**

### 1.2 iOS Client Configuration

Fill in the following information:

**Name**: `MeetOn iOS App`

**Bundle ID**: Your iOS app bundle identifier (e.g., `com.yourcompany.meeton`)
- ⚠️ This must match exactly with your Expo/React Native app bundle ID
- You can find this in your `app.json` or `app.config.js`

**App Store ID** (Optional): Leave blank for development

**Team ID**: Your Apple Developer Team ID
- Find this in your Apple Developer account
- Or run: `xcrun security find-identity -v -p codesigning`

### 1.3 Get Your iOS Client Credentials

After creating the iOS client, you'll get:

1. **iOS Client ID**: `XXXXXXXX-XXXXXXXX.apps.googleusercontent.com`
2. **iOS URL Scheme**: Same as client ID (for URL schemes)

⚠️ **Important**: Keep both the **Web Client ID** (for backend) and **iOS Client ID** (for app)

## 📱 Step 2: Configure React Native App

### 2.1 Install Required Dependencies

```bash
cd /Users/abuzaid/Desktop/MeetOn
npm install @react-native-google-signin/google-signin
npx expo install expo-auth-session expo-crypto expo-web-browser
```

### 2.2 Update app.json Configuration

```json
{
  "expo": {
    "name": "MeetOn",
    "slug": "meeton",
    "scheme": "meeton",
    "ios": {
      "bundleIdentifier": "com.yourcompany.meeton",
      "googleServicesFile": "./GoogleService-Info.plist",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLName": "google",
            "CFBundleURLSchemes": ["YOUR_IOS_CLIENT_ID"]
          },
          {
            "CFBundleURLName": "meeton",
            "CFBundleURLSchemes": ["meeton"]
          }
        ]
      }
    },
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "YOUR_IOS_CLIENT_ID"
        }
      ]
    ]
  }
}
```

### 2.3 Download GoogleService-Info.plist

1. In Google Cloud Console, go to **Project Settings**
2. Scroll down to **Your apps** section
3. Click on the iOS app you just created
4. Download `GoogleService-Info.plist`
5. Place it in your project root: `/Users/abuzaid/Desktop/MeetOn/GoogleService-Info.plist`

## 🔐 Step 3: Environment Configuration

### 3.1 Create iOS Environment Config

Create a new file for iOS-specific configuration:

```typescript
// src/config/googleAuth.ts
import { Platform } from 'react-native';

export const GOOGLE_CONFIG = {
  // iOS Configuration
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  
  // Web Configuration (for backend)
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  
  // Backend endpoints
  backendBaseUrl: __DEV__ 
    ? 'http://localhost:3000/api' 
    : 'https://your-production-api.com/api',
    
  // OAuth endpoints
  authEndpoint: '/auth/google',
  callbackEndpoint: '/auth/google/callback',
  
  // App scheme
  appScheme: 'meeton',
  
  // Scopes
  scopes: ['openid', 'profile', 'email'],
};

// iOS-specific configuration
export const getGoogleSignInConfig = () => {
  if (Platform.OS === 'ios') {
    return {
      iosClientId: GOOGLE_CONFIG.iosClientId,
      webClientId: GOOGLE_CONFIG.webClientId,
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    };
  }
  
  // Android configuration (for future)
  return {
    webClientId: GOOGLE_CONFIG.webClientId,
    offlineAccess: true,
  };
};
```

## 🔄 Step 4: Update Google Auth Service

### 4.1 Enhanced iOS Google Auth Implementation

Update your `src/services/googleAuth.ts`:

```typescript
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform, Alert } from 'react-native';
import { GOOGLE_CONFIG, getGoogleSignInConfig } from '../config/googleAuth';
import APIService from './api';

class GoogleAuthService {
  private static isConfigured = false;

  /**
   * Initialize Google Sign-In configuration
   */
  static async configure(): Promise<void> {
    if (this.isConfigured) return;

    try {
      const config = getGoogleSignInConfig();
      
      await GoogleSignin.configure({
        ...config,
        scopes: GOOGLE_CONFIG.scopes,
      });
      
      this.isConfigured = true;
      console.log('✅ Google Sign-In configured for iOS');
    } catch (error) {
      console.error('❌ Google Sign-In configuration failed:', error);
      throw error;
    }
  }

  /**
   * iOS Native Google Sign-In
   */
  static async signInWithGoogle(): Promise<{
    success: boolean;
    user?: any;
    tokens?: any;
    error?: string;
  }> {
    try {
      // Ensure Google Sign-In is configured
      await this.configure();

      // Check if device supports Google Play Services (Android) or has Google app (iOS)
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In successful:', userInfo.user);

      // Get authentication tokens
      const tokens = await GoogleSignin.getTokens();
      console.log('✅ Google tokens obtained');

      // Exchange Google tokens with your backend
      const backendAuth = await this.exchangeTokensWithBackend(tokens.accessToken);
      
      if (backendAuth.success) {
        return {
          success: true,
          user: backendAuth.user,
          tokens: backendAuth.tokens,
        };
      } else {
        return {
          success: false,
          error: backendAuth.error || 'Backend authentication failed',
        };
      }

    } catch (error: any) {
      console.error('❌ Google Sign-In failed:', error);
      
      let errorMessage = 'Sign in failed';
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in was cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in is already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Exchange Google access token with backend
   */
  private static async exchangeTokensWithBackend(googleAccessToken: string): Promise<{
    success: boolean;
    user?: any;
    tokens?: any;
    error?: string;
  }> {
    try {
      // Send Google access token to your backend
      const response = await fetch(`${GOOGLE_CONFIG.backendBaseUrl}/auth/google/mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: googleAccessToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store backend tokens
        await APIService.storeTokens({
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
        });

        return {
          success: true,
          user: data.user,
          tokens: data.tokens,
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Backend authentication failed',
        };
      }
    } catch (error) {
      console.error('❌ Backend token exchange failed:', error);
      return {
        success: false,
        error: 'Network error during authentication',
      };
    }
  }

  /**
   * Sign out from Google
   */
  static async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      await APIService.clearTokens();
      console.log('✅ Google Sign-Out successful');
    } catch (error) {
      console.error('❌ Google Sign-Out failed:', error);
    }
  }

  /**
   * Check if user is signed in
   */
  static async isSignedIn(): Promise<boolean> {
    try {
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      console.error('❌ Google Sign-In status check failed:', error);
      return false;
    }
  }
}

export default GoogleAuthService;
```

## 🔙 Step 5: Update Backend for Mobile Token Exchange

Add a new endpoint to handle mobile Google auth:

```typescript
// In your backend: src/controllers/authController.ts

/**
 * Handle Google OAuth for mobile apps
 * POST /api/auth/google/mobile
 */
async googleMobileAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      throw new ValidationError('Google access token is required');
    }

    // Verify Google access token
    const googleUser = await this.verifyGoogleToken(accessToken);
    
    // Create or get user
    const user = await authService.handleGoogleAuth({
      googleId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      image: googleUser.picture,
      emailVerified: googleUser.email_verified,
    });

    // Generate JWT tokens
    const tokens = authService.generateTokens(user);

    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      image: user.image,
      onboardingCompleted: user.onboardingCompleted,
    };

    sendSuccess(res, {
      user: userResponse,
      tokens,
    }, 'Google authentication successful');

  } catch (error) {
    next(error);
  }
}

private async verifyGoogleToken(accessToken: string): Promise<any> {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
    
    if (!response.ok) {
      throw new AuthenticationError('Invalid Google access token');
    }
    
    return await response.json();
  } catch (error) {
    throw new AuthenticationError('Google token verification failed');
  }
}
```

## 🔄 Step 6: Update AuthContext

```typescript
// src/contexts/AuthContext.tsx

const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    setIsLoading(true);
    
    const result = await GoogleAuthService.signInWithGoogle();
    
    if (result.success && result.user) {
      setUser(result.user);
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.error || 'Google sign in failed' 
      };
    }
  } catch (error) {
    console.error('Google sign in error:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  } finally {
    setIsLoading(false);
  }
};
```

## 🧪 Step 7: Testing

### 7.1 Test Checklist

- [ ] iOS simulator opens Google sign-in flow
- [ ] User can complete Google authentication
- [ ] App receives user data and tokens
- [ ] Backend creates/updates user successfully
- [ ] App navigates to correct screen based on onboarding status

### 7.2 Debug Commands

```bash
# Check Google Sign-In configuration
npx expo run:ios --clear

# Debug Google Services
npx expo run:ios --device

# View logs
npx expo logs --platform ios
```

## 🚀 Step 8: Build Configuration

### 8.1 EAS Build Setup

```json
// eas.json
{
  "build": {
    "development": {
      "ios": {
        "simulator": true,
        "bundleIdentifier": "com.yourcompany.meeton.dev"
      }
    },
    "preview": {
      "ios": {
        "bundleIdentifier": "com.yourcompany.meeton.preview"
      }
    },
    "production": {
      "ios": {
        "bundleIdentifier": "com.yourcompany.meeton"
      }
    }
  }
}
```

### 8.2 Production Considerations

1. **Update Google Console**:
   - Add production bundle IDs
   - Update OAuth consent screen
   - Add production domains

2. **App Store Configuration**:
   - Ensure bundle ID matches Google Console
   - Include GoogleService-Info.plist in build
   - Test on real devices

## 🔒 Security Best Practices

1. **Bundle ID Security**: Never expose your bundle ID in public repositories
2. **Client ID Protection**: iOS client ID can be public, but keep backend secrets secure
3. **Token Storage**: Use secure storage (Keychain) for tokens
4. **SSL Pinning**: Consider implementing for production

## 🐛 Common Issues & Solutions

### Issue: "Invalid iOS bundle ID"
**Solution**: Ensure bundle ID in Google Console exactly matches your app.json

### Issue: "Google Sign-In not working in simulator"
**Solution**: Test on real device, some Google services don't work in simulator

### Issue: "No Google Services configuration found"
**Solution**: Ensure GoogleService-Info.plist is in project root and properly configured

### Issue: "OAuth redirect not working"
**Solution**: Check URL schemes in app.json match your iOS client ID

## 📚 Next Steps

1. **Test on Real Device**: Google Sign-In works best on physical devices
2. **Add Error Handling**: Implement comprehensive error handling for all scenarios
3. **Add Loading States**: Show appropriate loading indicators during OAuth flow
4. **Configure Android**: Set up Android OAuth client when ready
5. **Production Deployment**: Configure production OAuth settings

---

**🎉 Your iOS Google OAuth is now configured! Users can sign in with their Google accounts natively on iOS devices.** 