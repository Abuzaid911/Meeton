# Google OAuth Setup Guide for MeetOn Backend

## 🚀 Overview

The MeetOn backend now supports Google OAuth as the primary authentication method. This provides a seamless login experience for users and eliminates the need for password management.

## 📋 What's Been Implemented

### ✅ Backend Components

1. **Passport.js Integration**
   - Google OAuth 2.0 strategy configured
   - Automatic user creation and login
   - JWT token generation after OAuth success

2. **Authentication Service**
   - `handleGoogleAuth()` method for OAuth users
   - Automatic username generation from email/name
   - Token creation and refresh functionality

3. **API Endpoints**
   - `GET /api/auth/google` - Initiate OAuth flow
   - `GET /api/auth/google/callback` - Handle OAuth callback
   - `GET /api/auth/me` - Get current user info
   - `POST /api/auth/refresh` - Refresh access token
   - `POST /api/auth/logout` - Logout user
   - `POST /api/auth/logout-all` - Logout from all devices
   - `POST /api/auth/onboarding` - Complete user onboarding

4. **Security Features**
   - Rate limiting on all auth endpoints
   - JWT with 15-minute access tokens
   - Refresh token rotation
   - Secure session management

## 🔧 Google Console Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google+ API** and **People API**

### Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - App name: `MeetOn`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users if needed

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Application type**: Web application
4. Add **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/google/callback
   https://yourdomain.com/api/auth/google/callback
   ```
5. Copy the **Client ID** and **Client Secret**

## 🔐 Environment Configuration

Update your `.env` file with the Google OAuth credentials:

```env
# Google OAuth (Required)
GOOGLE_CLIENT_ID="your-google-client-id-from-console.developers.google.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret-from-console"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# Session Management
SESSION_SECRET="meeton-session-secret-key-32chars-long"

# JWT Configuration (already configured)
JWT_SECRET="your-jwt-secret-key-32-characters-minimum"
JWT_REFRESH_SECRET="your-refresh-secret-key-32-characters-minimum"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
```

## 📱 Frontend Integration

### React Native/Expo Implementation

For your React Native app, you'll need to implement the OAuth flow:

```typescript
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Complete browser session for OAuth
WebBrowser.maybeCompleteAuthSession();

const useGoogleAuth = () => {
  const discovery = {
    authorizationEndpoint: 'http://localhost:3000/api/auth/google',
    // tokenEndpoint is handled by your backend
  };

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: 'not-needed-for-server-side-flow',
      scopes: ['openid', 'profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'your-app-scheme',
        path: '/auth',
      }),
    },
    discovery
  );

  const signInWithGoogle = () => {
    promptAsync();
  };

  // Handle the response
  React.useEffect(() => {
    if (response?.type === 'success') {
      // Extract tokens from the callback URL
      const { accessToken, refreshToken } = response.params;
      // Store tokens and navigate to main app
    }
  }, [response]);

  return { signInWithGoogle };
};
```

### Alternative: Deep Link Approach

1. User taps "Sign in with Google"
2. Open browser to: `http://localhost:3000/api/auth/google`
3. User completes OAuth flow
4. Backend redirects to: `yourapp://auth/callback?token=...&refresh=...`
5. App intercepts deep link and extracts tokens

## 🔄 Authentication Flow

### 1. User Initiates Login
```
User taps "Sign in with Google" 
→ App opens: GET /api/auth/google
```

### 2. Google OAuth Flow
```
User redirected to Google OAuth consent screen
→ User grants permissions
→ Google redirects to: GET /api/auth/google/callback
```

### 3. Backend Processing
```
Backend receives Google user profile
→ Check if user exists in database
→ Create new user OR update existing user
→ Generate JWT access & refresh tokens
→ Redirect to app with tokens
```

### 4. Token Usage
```javascript
// Store tokens securely
await AsyncStorage.setItem('accessToken', response.accessToken);
await AsyncStorage.setItem('refreshToken', response.refreshToken);

// Use in API requests
const apiCall = async () => {
  const token = await AsyncStorage.getItem('accessToken');
  const response = await fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};
```

## 📋 API Reference

### Authentication Endpoints

#### GET `/api/auth/google`
Initiates Google OAuth flow
- **Response**: Redirects to Google OAuth consent screen

#### GET `/api/auth/google/callback`
Handles Google OAuth callback
- **Response**: Redirects to app with tokens or error page

#### GET `/api/auth/me`
Get current user information
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: User profile data

#### POST `/api/auth/refresh`
Refresh access token
```json
{
  "refreshToken": "your-refresh-token"
}
```

#### POST `/api/auth/logout`
Logout user (invalidate refresh token)
```json
{
  "refreshToken": "your-refresh-token"
}
```

#### POST `/api/auth/onboarding`
Complete user onboarding
- **Headers**: `Authorization: Bearer <access_token>`
```json
{
  "interests": ["technology", "music"],
  "bio": "Software developer",
  "location": "San Francisco, CA",
  "dateOfBirth": "1990-01-01T00:00:00.000Z"
}
```

## 🔒 Security Considerations

### Token Security
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Refresh token rotation implemented
- Store tokens securely (Keychain/Keystore)

### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes
- Password reset: 3 requests per hour

### Data Protection
- User email verification from Google
- Automatic profile picture from Google
- Secure session management
- HTTPS required in production

## 🧪 Testing

### Test OAuth Flow
1. Start development server: `npm run dev`
2. Open browser: `http://localhost:3000/api/auth/google`
3. Complete Google OAuth flow
4. Check redirect with tokens

### Test API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# API documentation
curl http://localhost:3000/api

# Test authentication (replace TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/auth/me
```

## 🚀 Production Deployment

### Environment Variables
```env
NODE_ENV=production
GOOGLE_CLIENT_ID="your-production-client-id"
GOOGLE_CLIENT_SECRET="your-production-client-secret"
GOOGLE_CALLBACK_URL="https://api.yourdomain.com/api/auth/google/callback"
CORS_ORIGIN="https://yourdomain.com"
```

### Google Console Updates
1. Add production domain to authorized origins
2. Add production callback URL
3. Update OAuth consent screen for production
4. Remove test users restriction

## 🐛 Troubleshooting

### Common Issues

#### "Invalid redirect URI"
- Check Google Console authorized redirect URIs
- Ensure exact match including protocol and port
- Common mistake: missing `/api/auth/google/callback` path

#### "Access denied"
- OAuth consent screen not properly configured
- App not verified for production use
- User not added to test users list

#### "Invalid client ID"
- Wrong client ID in environment variables
- Client ID doesn't match the OAuth consent screen

#### Token expired errors
- Implement automatic token refresh
- Check token expiration times
- Ensure refresh token is stored and used

### Debug Mode
Set `NODE_ENV=development` to see detailed error messages.

## 📚 Next Steps

1. **Complete Frontend Integration**: Implement OAuth flow in React Native
2. **User Onboarding**: Create onboarding screens for new users
3. **Profile Management**: Allow users to update their profiles
4. **Event Integration**: Connect authenticated users to event functionality
5. **Push Notifications**: Set up FCM for authenticated users

## 🔗 Useful Links

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](https://www.passportjs.org/packages/passport-google-oauth20/)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [React Native Deep Linking](https://reactnative.dev/docs/linking)

---

**🎉 Your MeetOn backend now supports Google OAuth! Users can sign in seamlessly with their Google accounts.** 