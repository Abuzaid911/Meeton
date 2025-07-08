# Google Weather API Setup Guide

Your MeetOn app now uses **Google Weather API** for real-time weather data! This guide will help you set it up.

## ✅ What Changed

✨ **Switched from OpenWeatherMap to Google Weather API** - launched in 2025 as part of Google Maps Platform

### Benefits:
- **Same API Key**: Uses your existing Google Maps API key
- **Better Integration**: Seamless with your Google Maps setup
- **Generous Limits**: 10,000 free calls/month (vs 1,000 with OpenWeather)
- **Lower Cost**: $0.15 per 1,000 calls (cheapest Google API ever!)
- **More Reliable**: Google's infrastructure and accuracy

## 🚀 Quick Setup

### 1. Enable Google Weather API
```bash
# Go to Google Cloud Console
https://console.cloud.google.com/apis/library/weather.googleapis.com

# Click "Enable" for Weather API
```

### 2. Update Your Environment
```bash
# In your .env file, keep your existing:
GOOGLE_MAPS_API_KEY=your_existing_key_here

# Remove this line if you have it:
# OPENWEATHER_API_KEY=...  (no longer needed)
```

### 3. Test the Integration
```bash
# Run the test script to verify everything works
npx ts-node src/scripts/test-google-weather.ts
```

That's it! 🎉

## 📋 Detailed Setup

### Step 1: Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project (same one with your Google Maps key)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Weather API"
5. Click **Enable**

### Step 2: Verify API Key Permissions
Your existing Google Maps API key should work automatically. If you have restrictions:

1. Go to **APIs & Services** → **Credentials**
2. Click on your API key
3. Under **API restrictions**, ensure these are enabled:
   - ✅ Weather API
   - ✅ Geocoding API (for event locations)
   - ✅ Maps JavaScript API (if using frontend maps)

### Step 3: Test Everything
```bash
# Test Google Weather API
npx ts-node src/scripts/test-google-weather.ts

# Refresh weather for all existing events
npx ts-node src/scripts/refresh-weather-data.ts

# Start your backend
npm run dev
```

## 🌤️ How It Works

### Real Weather Data Flow:
1. **Event Creation** → Gets coordinates via Google Geocoding
2. **Weather Fetching** → Calls Google Weather API with coordinates
3. **Smart Logic**:
   - Events today/past: Current weather
   - Events within 10 days: Weather forecast
   - Future events: Seasonal estimation (not mock data)

### API Endpoints Used:
- `currentConditions:lookup` - Current weather
- `forecast/days:lookup` - 10-day forecast
- Both use same Google Maps API key

## 🎯 Expected Results

After setup, your events will show:
- ✅ **Real temperatures** (no more "22°C" for everything!)
- ✅ **Accurate weather conditions** (rain, sunny, cloudy, etc.)
- ✅ **Location-specific data** (NYC vs London vs Tokyo)
- ✅ **Date-aware forecasts** (current vs future weather)

## 🛠️ Troubleshooting

### ❌ "API key not valid" Error
**Problem**: Weather API not enabled or wrong key
**Solution**:
```bash
1. Check: https://console.cloud.google.com/apis/library/weather.googleapis.com
2. Ensure "Weather API" shows as "Enabled"
3. Verify GOOGLE_MAPS_API_KEY in .env file
4. Restart backend: npm run dev
```

### ❌ "403 Forbidden" Error
**Problem**: API key restrictions blocking weather.googleapis.com
**Solution**:
```bash
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your API key → Edit
3. Under "API restrictions", add "Weather API"
4. Or remove restrictions for testing
```

### ❌ All Events Still Show Same Weather
**Problem**: Old weather data cached in database
**Solution**:
```bash
# Refresh all event weather data
npx ts-node src/scripts/refresh-weather-data.ts
```

## 💰 Pricing

### Free Tier (Perfect for Development):
- **10,000 calls/month** completely free
- **$0.15 per 1,000 calls** after that

### Example Usage:
- **100 events/month** = ~200 API calls = **FREE**
- **1,000 events/month** = ~2,000 API calls = **FREE**
- **50,000 events/month** = ~100,000 API calls = **$13.50/month**

Much cheaper than most weather APIs! 🎉

## 🔗 Useful Links

- [Google Weather API Docs](https://developers.google.com/maps/documentation/weather)
- [Enable Weather API](https://console.cloud.google.com/apis/library/weather.googleapis.com)
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [Weather API Pricing](https://mapsplatform.google.com/pricing/)

## ⚡ Quick Test

```bash
# Test with curl (replace YOUR_KEY)
curl "https://weather.googleapis.com/v1/currentConditions:lookup?key=YOUR_GOOGLE_MAPS_API_KEY&location.latitude=40.7128&location.longitude=-74.0060"

# Should return real weather data for NYC!
```

---

🎉 **You're all set!** Your MeetOn app now has real, accurate weather data for every event. 