#!/usr/bin/env ts-node

/**
 * Google Weather API Test Script
 * 
 * This script tests the Google Weather API integration using your Google Maps API key.
 * Run this to verify your setup before using weather features in the app.
 * 
 * Usage: npx ts-node src/scripts/test-google-weather.ts
 */

import WeatherService from '../services/weatherService';
import { getEnv } from '../config/env';

async function testGoogleWeatherAPI() {
  console.log('🌤️ Testing Google Weather API Integration...\n');
  
  try {
    const env = getEnv();
    
    console.log('🔧 Environment Check:');
    console.log(`🔑 Google Maps API Key: ${env.GOOGLE_MAPS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    
    if (!env.GOOGLE_MAPS_API_KEY) {
      console.error('\n❌ Google Maps API key is required!');
      console.log('');
      console.log('📋 Setup Instructions:');
      console.log('   1. Go to: https://console.cloud.google.com/apis/credentials');
      console.log('   2. Click "Create Credentials" → "API Key"');
      console.log('   3. Enable the following APIs:');
      console.log('      - Weather API');
      console.log('      - Maps JavaScript API (if not already enabled)');
      console.log('      - Geocoding API (if not already enabled)');
      console.log('   4. Add to your .env file: GOOGLE_MAPS_API_KEY=your_key_here');
      console.log('   5. Restart your backend server');
      console.log('');
      console.log('💡 Note: You can use your existing Google Maps API key for weather data!');
      return;
    }
    
    // Test coordinates for different cities
    const testLocations = [
      { name: 'New York City', lat: 40.7128, lng: -74.0060 },
      { name: 'London', lat: 51.5074, lng: -0.1278 },
      { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    ];
    
    console.log('\n🌍 Testing current weather for multiple locations...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const location of testLocations) {
      try {
        console.log(`📍 Testing: ${location.name} (${location.lat}, ${location.lng})`);
        
        const weatherData = await WeatherService.getCurrentWeather(location.lat, location.lng);
        
        if (weatherData) {
          console.log(`   🌡️  Temperature: ${weatherData.temperature}°C`);
          console.log(`   🌤️  Condition: ${weatherData.condition}`);
          console.log(`   📝 Description: ${weatherData.description}`);
          console.log(`   💧 Humidity: ${weatherData.humidity}%`);
          console.log(`   💨 Wind: ${weatherData.windSpeed} km/h`);
          console.log(`   ✅ Success!`);
          successCount++;
        } else {
          console.log(`   ❌ No weather data returned`);
          errorCount++;
        }
        
        console.log(''); // Empty line for spacing
        
        // Small delay between requests
        if (location !== testLocations[testLocations.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
        console.log(''); // Empty line for spacing
        errorCount++;
        
        // Check for specific error types
        if (error instanceof Error) {
          if (error.message.includes('403') || error.message.includes('API_KEY_INVALID')) {
            console.log('🔧 API Key Issue:');
            console.log('   - Check that your Google Maps API key is correct');
            console.log('   - Ensure Weather API is enabled in Google Cloud Console');
            console.log('   - Verify API key restrictions (if any) allow weather.googleapis.com');
            console.log('');
            break; // Stop testing if API key is invalid
          }
        }
      }
    }
    
    console.log('📊 Test Results:');
    console.log(`   ✅ Successful requests: ${successCount}`);
    console.log(`   ❌ Failed requests: ${errorCount}`);
    console.log(`   📍 Total locations tested: ${testLocations.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Google Weather API is working correctly!');
      console.log('   Your events will now display real weather data.');
      console.log('   Each event shows weather specific to its location and date.');
    } else if (errorCount > 0) {
      console.log('\n⚠️  All requests failed. Please check:');
      console.log('   1. Google Maps API key is valid');
      console.log('   2. Weather API is enabled in Google Cloud Console');
      console.log('   3. Your internet connection');
      console.log('   4. No API restrictions blocking weather.googleapis.com');
    }
    
    console.log('\n🔗 Useful Links:');
    console.log('   - Google Cloud Console: https://console.cloud.google.com/apis/credentials');
    console.log('   - Enable Weather API: https://console.cloud.google.com/apis/library/weather.googleapis.com');
    console.log('   - Weather API Documentation: https://developers.google.com/maps/documentation/weather');
    
  } catch (error) {
    console.error('\n❌ Test script failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testGoogleWeatherAPI();
} 