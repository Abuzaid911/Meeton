#!/usr/bin/env node

/**
 * Weather Data Refresh Utility
 * 
 * This script will:
 * 1. Find all events that don't have coordinates and geocode their locations
 * 2. Refresh weather data for all upcoming events using real RapidAPI
 * 3. Report on events that couldn't be geocoded or get weather data
 */

import { prisma } from '../config/database';
import { locationService } from '../services/locationService';
import { weatherService } from '../services/weatherService';
import { getEnv } from '../config/env';

interface EventReport {
  total: number;
  withCoordinates: number;
  withoutCoordinates: number;
  geocoded: number;
  weatherUpdated: number;
  errors: string[];
}

async function refreshWeatherData(): Promise<void> {
  console.log('🌤️ Starting weather data refresh for all events...\n');

  const report: EventReport = {
    total: 0,
    withCoordinates: 0,
    withoutCoordinates: 0,
    geocoded: 0,
    weatherUpdated: 0,
    errors: []
  };

  try {
    // Get environment configuration
    const env = getEnv();
    console.log(`🔑 RapidAPI Weather Key: ${env.RAPIDAPI_WEATHER_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🗺️  Google Maps API Key: ${env.GOOGLE_MAPS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log();

    // Get all upcoming events
    const events = await prisma.event.findMany({
      where: {
        date: { gte: new Date() }, // Only upcoming events
        isArchived: false
      },
      select: {
        id: true,
        name: true,
        location: true,
        lat: true,
        lng: true,
        date: true,
        time: true
      },
      orderBy: { date: 'asc' }
    });

    report.total = events.length;
    console.log(`📊 Found ${events.length} upcoming events to process\n`);

    for (const event of events) {
      console.log(`🎯 Processing: "${event.name}" (${event.date.toDateString()})`);
      console.log(`   📍 Location: ${event.location}`);
      
      let lat = event.lat;
      let lng = event.lng;

      // Check if coordinates exist
      if (!lat || !lng) {
        report.withoutCoordinates++;
        console.log(`   🗺️  Missing coordinates, attempting to geocode...`);
        
        try {
          const geocodeResult = await locationService.geocodeAddress(event.location);
          if (geocodeResult) {
            lat = geocodeResult.coordinates.lat;
            lng = geocodeResult.coordinates.lng;
            
            // Update event with coordinates
            await prisma.event.update({
              where: { id: event.id },
              data: {
                lat,
                lng,
                locationDetails: geocodeResult as any
              }
            });
            
            report.geocoded++;
            console.log(`   ✅ Geocoded: (${lat}, ${lng})`);
          } else {
            const error = `Failed to geocode location: ${event.location}`;
            report.errors.push(`${event.name}: ${error}`);
            console.log(`   ❌ ${error}`);
            continue;
          }
        } catch (error) {
          const errorMsg = `Geocoding error for ${event.name}: ${error instanceof Error ? error.message : String(error)}`;
          report.errors.push(errorMsg);
          console.log(`   ❌ ${errorMsg}`);
          continue;
        }
      } else {
        report.withCoordinates++;
        console.log(`   ✅ Has coordinates: (${lat}, ${lng})`);
      }

      // Fetch weather data
      try {
        console.log(`   🌤️  Fetching weather data...`);
        const weatherData = await weatherService.getEventWeather(event.id);
        
        if (weatherData) {
          report.weatherUpdated++;
          console.log(`   ✅ Weather updated: ${weatherData.temperature}°C, ${weatherData.condition}`);
        } else {
          const error = `No weather data available`;
          report.errors.push(`${event.name}: ${error}`);
          console.log(`   ⚠️  ${error}`);
        }
      } catch (error) {
        const errorMsg = `Weather fetch error for ${event.name}: ${error instanceof Error ? error.message : String(error)}`;
        report.errors.push(errorMsg);
        console.log(`   ❌ ${errorMsg}`);
      }

      console.log(''); // Empty line for readability
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print final report
    console.log('\n📊 WEATHER DATA REFRESH COMPLETE');
    console.log('==========================================');
    console.log(`📈 Total Events Processed: ${report.total}`);
    console.log(`📍 Events with Coordinates: ${report.withCoordinates}`);
    console.log(`🗺️  Events without Coordinates: ${report.withoutCoordinates}`);
    console.log(`✅ Successfully Geocoded: ${report.geocoded}`);
    console.log(`🌤️  Weather Data Updated: ${report.weatherUpdated}`);
    console.log(`❌ Errors: ${report.errors.length}`);
    
    if (report.errors.length > 0) {
      console.log('\n❌ ERROR DETAILS:');
      report.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n🎉 Weather data refresh completed!');

  } catch (error) {
    console.error('❌ Fatal error during weather data refresh:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  refreshWeatherData()
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { refreshWeatherData }; 