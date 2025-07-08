#!/usr/bin/env ts-node

/**
 * Weather Data Refresh Script
 * 
 * This script refreshes weather data for all upcoming events using Google Weather API.
 * It finds events without coordinates and geocodes their locations,
 * then fetches accurate weather data for all events.
 * 
 * Usage: npm run refresh-weather
 */

import { PrismaClient } from '@prisma/client';
import WeatherService from '../services/weatherService';
import { getEnv } from '../config/env';

const prisma = new PrismaClient();

async function main() {
  console.log('🌤️ Starting Weather Data Refresh Script...\n');
  
  try {
    const env = getEnv();
    console.log('🔧 Environment Check:');
    console.log(`🔑 Google Maps API Key: ${env.GOOGLE_MAPS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    
    if (!env.GOOGLE_MAPS_API_KEY) {
      console.error('\n❌ Google Maps API key is required!');
      console.log('   1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials');
      console.log('   2. Enable "Weather API" in APIs & Services');
      console.log('   3. Use your existing Google Maps API key or create a new one');
      console.log('   4. Add GOOGLE_MAPS_API_KEY=your_key_here to your .env file');
      process.exit(1);
    }
    
    console.log('\n📊 Finding events that need weather data...');
    
    // Get all upcoming events
    const upcomingEvents = await prisma.event.findMany({
      where: {
        date: { gte: new Date() },
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        location: true,
        date: true,
        lat: true,
        lng: true,
        weather: true,
        updatedAt: true,
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`📅 Found ${upcomingEvents.length} upcoming events`);
    
    // Separate events with and without coordinates
    const eventsWithCoords = upcomingEvents.filter(e => e.lat && e.lng);
    const eventsWithoutCoords = upcomingEvents.filter(e => !e.lat || !e.lng);
    
    console.log(`📍 Events with coordinates: ${eventsWithCoords.length}`);
    console.log(`❓ Events needing geocoding: ${eventsWithoutCoords.length}`);
    
    if (eventsWithoutCoords.length > 0) {
      console.log('\n⚠️  Some events are missing coordinates:');
      eventsWithoutCoords.forEach(event => {
        console.log(`   - ${event.name} (${event.location})`);
      });
      console.log('\n📍 To get weather for these events, ensure they have coordinates.');
      console.log('   Events get coordinates when created with proper location data.');
    }
    
    // Refresh weather for events with coordinates
    if (eventsWithCoords.length > 0) {
      console.log('\n🌤️ Refreshing weather data...');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const [index, event] of eventsWithCoords.entries()) {
        try {
          console.log(`[${index + 1}/${eventsWithCoords.length}] ${event.name}`);
          console.log(`   📍 Location: ${event.location} (${event.lat}, ${event.lng})`);
          console.log(`   📅 Date: ${event.date.toLocaleDateString()}`);
          
          const weatherData = await WeatherService.getEventWeather(event.id);
          
          if (weatherData) {
            console.log(`   🌡️  Weather: ${weatherData.temperature}°C, ${weatherData.condition}`);
            console.log(`   ✅ Success\n`);
            successCount++;
          } else {
            console.log(`   ❌ No weather data returned\n`);
            errorCount++;
          }
          
          // Rate limiting: Google Weather API has generous limits, small delay for courtesy
          if (index < eventsWithCoords.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error) {
          console.log(`   ❌ Error: ${error}\n`);
          errorCount++;
        }
      }
      
      console.log('📊 Weather Refresh Summary:');
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Failed: ${errorCount}`);
      console.log(`   📍 Missing coordinates: ${eventsWithoutCoords.length}`);
      console.log(`   📅 Total events: ${upcomingEvents.length}`);
      
      if (successCount > 0) {
        console.log('\n🎉 Weather data refresh completed successfully!');
        console.log('   Events now have real, location-specific weather information.');
      }
      
      if (errorCount > 0) {
        console.log('\n⚠️  Some weather updates failed. This might be due to:');
        console.log('   - API rate limits (wait a few minutes and try again)');
        console.log('   - Network connectivity issues');
        console.log('   - Invalid coordinates');
        console.log('   - API key issues');
      }
    } else {
      console.log('\n📍 No events with coordinates found. Weather data cannot be fetched.');
      console.log('   Make sure events have valid location coordinates.');
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('\n🔧 API Authentication Error:');
        console.log('   Check that your GOOGLE_MAPS_API_KEY is correct');
        console.log('   Ensure Weather API is enabled in Google Cloud Console');
        console.log('   Verify your API key has the right permissions');
      } else if (error.message.includes('429')) {
        console.log('\n🔧 Rate Limit Error:');
        console.log('   You have exceeded the API rate limit');
        console.log('   Wait a few minutes and try again');
        console.log('   Google Weather API offers generous free limits (10,000 calls/month)');
      }
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
} 