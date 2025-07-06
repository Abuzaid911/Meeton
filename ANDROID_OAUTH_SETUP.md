# Android OAuth Setup Guide

## Current Configuration
- **Package Name**: `com.meeton.app`
- **SHA-1 Fingerprint**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

## Issue
Your `google-services.json` file contains placeholder values instead of actual Firebase configuration.

## Step-by-Step Fix

### 1. Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `meeton-9a49c`
3. Go to Project Settings (gear icon)

### 2. Configure Android App
1. In "Your apps" section, find your Android app or click "Add app" > Android
2. Enter package name: `com.meeton.app`
3. Add SHA-1 fingerprint: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
4. Click "Register app"

### 3. Enable Google Sign-In
1. Go to Authentication > Sign-in method
2. Click on Google
3. Enable Google sign-in
4. Set your support email
5. Save

### 4. Download New Configuration
1. Back in Project Settings, find your Android app
2. Click "Download google-services.json"
3. Replace the file at `android/app/google-services.json`

### 5. Verify Configuration
The new `google-services.json` should have:
- Real project_number (not "123456789")
- Real mobilesdk_app_id (not "1:123456789:android:placeholder")
- Real API key (not "placeholder-api-key")

### 6. Test
1. Clean and rebuild your app
2. Test Google Sign-In

## Commands to Get SHA-1 Fingerprint
For debug keystore:
```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

For release keystore (when building for production):
```bash
keytool -list -v -keystore path/to/your/release.keystore -alias your-key-alias
```

## Troubleshooting
- Make sure package name matches exactly: `com.meeton.app`
- Make sure SHA-1 fingerprint is added to Firebase Console
- Make sure Google Sign-In is enabled in Firebase Authentication
- Clean and rebuild after replacing google-services.json

## Files Modified
- `android/app/google-services.json` - Replace with downloaded file from Firebase
- Backup created at: `android/app/google-services.json.backup`
