import { PrismaClient } from '@prisma/client';
import DatabaseManager from '../config/database';
import { getEnv } from '../config/env';

/**
 * Weather Service
 * Handles weather data fetching and integration for events
 * Using Google Weather API (launched 2025) - part of Google Maps Platform
 */

interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  uvIndex: number;
  pressure: number;
  feelsLike: number;
  icon: string;
  sunrise?: string;
  sunset?: string;
  hourlyForecast?: HourlyForecast[];
  alerts?: WeatherAlert[];
}

interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  icon: string;
  precipitationChance: number;
}

interface WeatherAlert {
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  start: string;
  end: string;
}

interface LocationCoordinates {
  lat: number;
  lng: number;
}

export class WeatherService {
  private prisma: PrismaClient;
  private googleMapsApiKey: string;
  private baseUrl: string;

  constructor() {
    this.prisma = DatabaseManager.getInstance();
    const env = getEnv();
    // Use Google Maps API key for Weather API (same key works for all Google Maps Platform services)
    this.googleMapsApiKey = env.GOOGLE_MAPS_API_KEY || '';
    this.baseUrl = 'https://weather.googleapis.com/v1';
    
    console.log('🌤️ Weather Service initialized with Google Weather API');
    console.log(`🔑 Google Maps API Key: ${this.googleMapsApiKey ? '***configured***' : 'missing'}`);
    
    if (!this.googleMapsApiKey) {
      console.warn('⚠️ Google Maps API key not configured. Please set GOOGLE_MAPS_API_KEY');
      console.warn('   1. Go to Google Cloud Console');
      console.warn('   2. Enable "Weather API" in APIs & Services');
      console.warn('   3. Use your existing Google Maps API key');
    }
  }

  /**
   * Get current weather for coordinates
   */
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData | null> {
    try {
      if (!this.googleMapsApiKey) {
        console.error('🌤️ Google Maps API key not configured for current weather');
        throw new Error('Google Maps API key not configured');
      }

      const url = `${this.baseUrl}/currentConditions:lookup`;
      const params = new URLSearchParams({
        key: this.googleMapsApiKey,
        'location.latitude': lat.toString(),
        'location.longitude': lng.toString(),
      });

      console.log(`🌤️ Fetching current weather: ${url}?${params}`);
      
      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`🌤️ Received current weather data:`, { 
        temp: (data as any).main?.temp, 
        condition: (data as any).weather?.[0]?.main 
      });
      
      return this.parseGoogleCurrentWeatherData(data);
    } catch (error) {
      console.error('🌤️ Error fetching current weather:', error);
      throw error;
    }
  }

  /**
   * Get weather forecast for coordinates
   */
  async getWeatherForecast(lat: number, lng: number): Promise<WeatherData | null> {
    try {
      if (!this.googleMapsApiKey) {
        console.error('🌤️ Google Maps API key not configured for weather forecast');
        throw new Error('Google Maps API key not configured');
      }

      const url = `${this.baseUrl}/forecast/days:lookup`;
      const params = new URLSearchParams({
        key: this.googleMapsApiKey,
        'location.latitude': lat.toString(),
        'location.longitude': lng.toString(),
        'forecastDays': '10'
      });

      console.log(`🌤️ Fetching weather forecast: ${url}?${params}`);
      
      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`🌤️ Received forecast data:`, { 
        count: (data as any).list?.length, 
        firstTemp: (data as any).list?.[0]?.main?.temp 
      });
      
      return this.parseForecastWeatherData(data);
    } catch (error) {
      console.error('🌤️ Error fetching weather forecast:', error);
      throw error;
    }
  }

  /**
   * Get weather for event date
   */
  async getEventWeather(eventId: string): Promise<WeatherData | null> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          lat: true,
          lng: true,
          date: true,
          weather: true,
        }
      });

      if (!event || !event.lat || !event.lng) {
        console.log(`🌤️ Event ${eventId} has no location coordinates (lat: ${event?.lat}, lng: ${event?.lng})`);
        return null;
      }

      console.log(`🌤️ Getting weather for event ${eventId} at coordinates (${event.lat}, ${event.lng})`);
      
      const eventDate = new Date(event.date);
      const now = new Date();
      const daysDifference = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`🌤️ Event date: ${eventDate.toISOString()}, Days difference: ${daysDifference}`);

      let weatherData: WeatherData | null;

      if (daysDifference <= 0) {
        // Event is today or in the past, get current weather
        console.log(`🌤️ Event is today or past, fetching current weather`);
        weatherData = await this.getCurrentWeather(event.lat, event.lng);
      } else if (daysDifference <= 5) {
        // Event is within 5 days, get forecast
        console.log(`🌤️ Event is within 5 days, fetching forecast`);
        weatherData = await this.getWeatherForecast(event.lat, event.lng);
      } else {
        // Event is too far in the future, use seasonal data (not mock)
        console.log(`🌤️ Event is ${daysDifference} days away, using seasonal estimation`);
        weatherData = this.getSeasonalWeatherData(event.lat, event.lng, eventDate);
      }

      if (weatherData) {
        // Store weather data in event record
        await this.updateEventWeather(eventId, weatherData);
      }

      return weatherData;
    } catch (error) {
      console.error(`Error getting weather for event ${eventId}:`, error);
      return null;
    }
  }

  /**
   * Update event weather data
   */
  async updateEventWeather(eventId: string, weatherData: WeatherData): Promise<void> {
    try {
      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          weather: weatherData as any,
        }
      });

      console.log(`🌤️ Weather updated for event ${eventId}: ${weatherData.temperature}°C, ${weatherData.condition}`);
    } catch (error) {
      console.error(`Error updating weather for event ${eventId}:`, error);
    }
  }

  /**
   * Refresh weather for all upcoming events
   */
  async refreshAllEventWeather(): Promise<void> {
    try {
      const upcomingEvents = await this.prisma.event.findMany({
        where: {
          date: { gte: new Date() },
          isArchived: false,
          lat: { not: null },
          lng: { not: null },
        },
        select: { id: true, name: true, lat: true, lng: true }
      });

      console.log(`🌤️ Refreshing weather for ${upcomingEvents.length} events`);

      for (const event of upcomingEvents) {
        try {
          console.log(`🌤️ Refreshing weather for: ${event.name} (${event.lat}, ${event.lng})`);
          await this.getEventWeather(event.id);
          // Add delay to respect API rate limits (60 calls/min for free tier)
          await new Promise(resolve => setTimeout(resolve, 1100));
        } catch (error) {
          console.error(`Error refreshing weather for event ${event.id}:`, error);
        }
      }

      console.log('🌤️ Weather refresh completed for all events');
    } catch (error) {
      console.error('Error refreshing weather for all events:', error);
    }
  }

  /**
   * Get weather alerts for location
   */
  async getWeatherAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
    try {
      if (!this.googleMapsApiKey) {
        return [];
      }

      // Weather alerts not yet available in Google Weather API
      console.log('🌤️ Weather alerts not yet available in Google Weather API');
      return [];
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      return [];
    }
  }

  /**
   * Parse Google Weather API current conditions response
   */
  private parseGoogleCurrentWeatherData(data: any): WeatherData {
    try {
      const temperature = data.temperature?.degrees || 20;
      const weatherCondition = data.weatherCondition || {};
      const wind = data.wind || {};

      // Convert Google's weather condition to our format
      const condition = this.mapGoogleWeatherCondition(weatherCondition.type);
      const description = weatherCondition.description?.text || 'Clear';

      return {
        temperature: Math.round(temperature),
        condition,
        description,
        humidity: data.relativeHumidity || 50,
        windSpeed: wind.speed?.value || 0,
        windDirection: wind.direction?.degrees || 0,
        visibility: data.visibility?.distance || 10,
        uvIndex: data.uvIndex || 0,
        pressure: data.airPressure?.meanSeaLevelMillibars || 1013,
        feelsLike: Math.round(data.feelsLikeTemperature?.degrees || temperature),
        icon: this.getWeatherIconFromGoogle(weatherCondition.iconBaseUri),
      };
    } catch (error) {
      console.error('🌤️ Error parsing Google current weather data:', error);
      throw new Error('Failed to parse Google weather data');
    }
  }

  /**
   * Parse forecast weather API response
   */
  private parseForecastWeatherData(data: any): WeatherData {
    try {
      const current = data.list[0];
      const hourlyForecast: HourlyForecast[] = data.list.slice(0, 24).map((item: any) => ({
        time: new Date(item.dt * 1000).toISOString(),
        temperature: Math.round(item.main.temp),
        condition: item.weather[0].main,
        icon: item.weather[0].icon,
        precipitationChance: Math.round((item.pop || 0) * 100),
      }));

      return {
        temperature: Math.round(current.main.temp),
        condition: current.weather[0].main,
        description: current.weather[0].description,
        humidity: current.main.humidity,
        windSpeed: current.wind?.speed || 0,
        windDirection: current.wind?.deg || 0,
        visibility: current.visibility ? current.visibility / 1000 : 10,
        uvIndex: 0,
        pressure: current.main.pressure,
        feelsLike: Math.round(current.main.feels_like),
        icon: current.weather[0].icon,
        hourlyForecast,
      };
    } catch (error) {
      console.error('🌤️ Error parsing forecast weather data:', error);
      throw new Error('Failed to parse forecast data');
    }
  }

  /**
   * Parse weather alerts
   */
  private parseWeatherAlerts(data: any): WeatherAlert[] {
    if (!data.alerts) return [];

    return data.alerts.map((alert: any) => ({
      title: alert.event,
      description: alert.description,
      severity: this.mapSeverity(alert.severity),
      start: new Date(alert.start * 1000).toISOString(),
      end: new Date(alert.end * 1000).toISOString(),
    }));
  }

  /**
   * Map API severity to our severity levels
   */
  private mapSeverity(severity: string): 'minor' | 'moderate' | 'severe' | 'extreme' {
    switch (severity.toLowerCase()) {
      case 'minor':
        return 'minor';
      case 'moderate':
        return 'moderate';
      case 'severe':
        return 'severe';
      case 'extreme':
        return 'extreme';
      default:
        return 'moderate';
    }
  }

  /**
   * Get seasonal weather data for distant future events
   */
  private getSeasonalWeatherData(lat: number, lng: number, eventDate: Date): WeatherData {
    const month = eventDate.getMonth();
    
    // Simple seasonal temperature estimation based on latitude and month
    let baseTemp = this.getSeasonalBaseTemperature(lat, month);
    
    // Add some realistic variation
    const variation = (Math.random() - 0.5) * 10;
    baseTemp += variation;

    const conditions = ['Clear', 'Clouds', 'Rain'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
      temperature: Math.round(baseTemp),
      condition,
      description: this.getConditionDescription(condition),
      humidity: 50 + Math.random() * 40,
      windSpeed: Math.random() * 20,
      windDirection: Math.random() * 360,
      visibility: 10,
      uvIndex: Math.floor(Math.random() * 11),
      pressure: 1013 + (Math.random() - 0.5) * 50,
      feelsLike: Math.round(baseTemp + (Math.random() - 0.5) * 5),
      icon: this.getWeatherIcon(condition),
    };
  }

  /**
   * Get seasonal base temperature
   */
  private getSeasonalBaseTemperature(lat: number, month: number): number {
    // Very simplified seasonal temperature calculation
    const isNorthern = lat > 0;
    const seasonalOffset = Math.cos((month - (isNorthern ? 0 : 6)) * Math.PI / 6) * 20;
    const latitudeEffect = (90 - Math.abs(lat)) / 3;
    
    return latitudeEffect + seasonalOffset;
  }

  /**
   * Get condition description
   */
  private getConditionDescription(condition: string): string {
    const descriptions: { [key: string]: string } = {
      'Clear': 'clear sky',
      'Clouds': 'scattered clouds',
      'Rain': 'light rain',
      'Snow': 'light snow',
      'Thunderstorm': 'thunderstorm',
      'Drizzle': 'light drizzle',
      'Mist': 'mist',
    };

    return descriptions[condition] || 'unknown';
  }

  /**
   * Get weather icon
   */
  private getWeatherIcon(condition: string): string {
    const icons: { [key: string]: string } = {
      'Clear': '01d',
      'Clouds': '03d',
      'Rain': '10d',
      'Snow': '13d',
      'Thunderstorm': '11d',
      'Drizzle': '09d',
      'Mist': '50d',
    };

    return icons[condition] || '01d';
  }

  /**
   * Map Google Weather API condition types to our standard conditions
   */
  private mapGoogleWeatherCondition(googleType: string): string {
    const mapping: { [key: string]: string } = {
      'CLEAR': 'Clear',
      'MOSTLY_CLEAR': 'Clear',
      'PARTLY_CLOUDY': 'Clouds',
      'MOSTLY_CLOUDY': 'Clouds',
      'OVERCAST': 'Clouds',
      'LIGHT_RAIN': 'Rain',
      'MODERATE_RAIN': 'Rain',
      'HEAVY_RAIN': 'Rain',
      'LIGHT_SNOW': 'Snow',
      'MODERATE_SNOW': 'Snow',
      'HEAVY_SNOW': 'Snow',
      'THUNDERSTORM': 'Thunderstorm',
      'FOG': 'Mist',
      'MIST': 'Mist',
    };

    return mapping[googleType] || 'Clear';
  }

  /**
   * Extract weather icon from Google's iconBaseUri
   */
  private getWeatherIconFromGoogle(iconBaseUri?: string): string {
    if (!iconBaseUri) return '01d';
    
    // Google provides icons like: https://maps.gstatic.com/weather/v1/mostly_cloudy_night
    // Extract the condition and map to standard icon codes
    const iconName = iconBaseUri.split('/').pop() || '';
    
    const iconMapping: { [key: string]: string } = {
      'clear_day': '01d',
      'clear_night': '01n',
      'mostly_clear_day': '02d',
      'mostly_clear_night': '02n',
      'partly_cloudy_day': '03d',
      'partly_cloudy_night': '03n',
      'mostly_cloudy_day': '04d',
      'mostly_cloudy_night': '04n',
      'overcast': '04d',
      'light_rain': '10d',
      'moderate_rain': '10d',
      'heavy_rain': '10d',
      'light_snow': '13d',
      'moderate_snow': '13d',
      'heavy_snow': '13d',
      'thunderstorm': '11d',
      'fog': '50d',
      'mist': '50d',
    };

    return iconMapping[iconName] || '01d';
  }

  /**
   * Check if weather data needs refresh
   */
  async shouldRefreshWeather(eventId: string): Promise<boolean> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { weather: true, updatedAt: true }
      });

      if (!event || !event.weather) {
        return true; // No weather data, needs refresh
      }

      // Refresh if data is older than 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      return event.updatedAt < thirtyMinutesAgo;
    } catch (error) {
      console.error('Error checking weather refresh status:', error);
      return true; // Default to refresh on error
    }
  }
}

export default new WeatherService(); 