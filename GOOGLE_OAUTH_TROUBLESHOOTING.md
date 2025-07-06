# Google OAuth Troubleshooting Guide

## Current Configuration
- **SHA-1 Fingerprint**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- **Package Name**: `com.meeton.app`
- **Project Number**: `38702126641`

## If Still Getting DEVELOPER_ERROR

### Option 1: Verify Current OAuth Client
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project with number `38702126641`
3. Go to **APIs & Services** → **Credentials**
4. Find Android OAuth client: `38702126641-rn0e5nm88jrnm4cohi9m7dhnavuprmon.apps.googleusercontent.com`
5. Verify:
   - **Package name**: `com.meeton.app`
   - **SHA-1**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

### Option 2: Create New OAuth Client
1. In **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Android**
4. Enter:
   - **Name**: `MeetOn Android`
   - **Package name**: `com.meeton.app`
   - **SHA-1**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
5. Click **CREATE**
6. Copy the new client ID
7. Update `src/config/googleAuth.ts` with the new client ID

### Required APIs to Enable
1. **Google+ API** or **People API**
2. **Google Sign-In API**

### OAuth Consent Screen Requirements
- **User Type**: External
- **App name**: MeetOn
- **Support email**: Required
- **Status**: Published or Testing

## Testing Steps
1. Clean app cache: `npx expo start --clear`
2. Test Google Sign-In
3. Check logs for any remaining errors

## Common Issues
- **DEVELOPER_ERROR**: SHA-1 or package name mismatch
- **Configuration Error**: OAuth client not properly saved
- **API Not Enabled**: Required Google APIs not enabled
- **Consent Screen**: Not properly configured or under review 