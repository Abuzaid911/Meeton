#!/usr/bin/env ts-node

import WeatherService from '../services/weatherService';

async function testWeatherAPI() {
  console.log('🌤️ Testing OpenWeatherMap API Integration...\n');
  
  // Test coordinates for New York City
  const testLat = 40.7128;
  const testLng = -74.0060;
  
  try {
    console.log(`Testing current weather for coordinates: (${testLat}, ${testLng})`);
    const currentWeather = await WeatherService.getCurrentWeather(testLat, testLng);
    
    if (currentWeather) {
      console.log('✅ Current Weather API working!');
      console.log(`   Temperature: ${currentWeather.temperature}°C`);
      console.log(`   Condition: ${currentWeather.condition}`);
      console.log(`   Description: ${currentWeather.description}`);
      console.log(`   Humidity: ${currentWeather.humidity}%`);
      console.log(`   Wind Speed: ${currentWeather.windSpeed} m/s`);
      console.log('');
    } else {
      console.log('❌ Current Weather API failed - no data returned');
      return;
    }
    
    console.log(`Testing weather forecast for coordinates: (${testLat}, ${testLng})`);
    const forecast = await WeatherService.getWeatherForecast(testLat, testLng);
    
    if (forecast) {
      console.log('✅ Weather Forecast API working!');
      console.log(`   Temperature: ${forecast.temperature}°C`);
      console.log(`   Condition: ${forecast.condition}`);
      console.log(`   Description: ${forecast.description}`);
      if (forecast.hourlyForecast && forecast.hourlyForecast.length > 0) {
        console.log(`   Hourly forecast available: ${forecast.hourlyForecast.length} hours`);
      }
      console.log('');
    } else {
      console.log('❌ Weather Forecast API failed - no data returned');
      return;
    }
    
    console.log('✅ All weather API tests passed!');
    console.log('🌤️ OpenWeatherMap integration is working correctly');
    
  } catch (error) {
    console.error('❌ Weather API Test Failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure OPENWEATHER_API_KEY is set in your .env file');
    console.log('2. Get a free API key at: https://openweathermap.org/api');
    console.log('3. Wait 10-15 minutes after signing up for the API key to become active');
    console.log('4. Check that your API key has the correct permissions');
  }
}

if (require.main === module) {
  testWeatherAPI().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export default testWeatherAPI; 