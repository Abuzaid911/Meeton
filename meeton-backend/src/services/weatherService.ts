import { PrismaClient } from '@prisma/client';
import DatabaseManager from '../config/database';
import { getEnv } from '../config/env';

/**
 * Weather Service
 * Handles weather data fetching and integration for events
 * Now using RapidAPI OpenWeather13 for enhanced reliability
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
  private rapidApiKey: string;
  private rapidApiHost: string;
  private baseUrl: string;

  constructor() {
    this.prisma = DatabaseManager.getInstance();
    const env = getEnv();
    this.rapidApiKey = env.RAPIDAPI_WEATHER_KEY || '4f47665b2amshfa0f492676c70b7p19315bjsn4548b04ddc1b';
    this.rapidApiHost = env.RAPIDAPI_WEATHER_HOST;
    this.baseUrl = `https://${this.rapidApiHost}`;
    
    console.log('🌤️ Weather Service initialized with RapidAPI');
    console.log(`🔑 API Key: ${this.rapidApiKey ? '***configured***' : 'missing'}`);
    console.log(`🌐 Host: ${this.rapidApiHost}`);
  }

  /**
   * Get current weather for coordinates
   */
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData | null> {
    try {
      if (!this.rapidApiKey) {
        console.warn('RapidAPI Weather key not configured, using mock weather data');
        return this.getMockWeatherData(lat, lng);
      }

      const url = `${this.baseUrl}/city/fivedaysforcast`;
      const response = await fetch(`${url}?latitude=${lat}&longitude=${lng}&lang=EN`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': this.rapidApiHost,
          'x-rapidapi-key': this.rapidApiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`RapidAPI Weather error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseRapidApiWeatherData(data);
    } catch (error) {
      console.error('Error fetching current weather:', error);
      return this.getMockWeatherData(lat, lng);
    }
  }

  /**
   * Get weather forecast for coordinates
   */
  async getWeatherForecast(lat: number, lng: number): Promise<WeatherData | null> {
    try {
      if (!this.rapidApiKey) {
        console.warn('RapidAPI Weather key not configured, using mock weather data');
        return this.getMockWeatherData(lat, lng);
      }

      const url = `${this.baseUrl}/city/fivedaysforcast`;
      const response = await fetch(`${url}?latitude=${lat}&longitude=${lng}&lang=EN`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': this.rapidApiHost,
          'x-rapidapi-key': this.rapidApiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`RapidAPI Weather error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseRapidApiWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return this.getMockWeatherData(lat, lng);
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
        console.log(`Event ${eventId} has no location coordinates`);
        return null;
      }

      const eventDate = new Date(event.date);
      const now = new Date();
      const daysDifference = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let weatherData: WeatherData | null;

      if (daysDifference <= 0) {
        // Event is today or in the past, get current weather
        weatherData = await this.getCurrentWeather(event.lat, event.lng);
      } else if (daysDifference <= 5) {
        // Event is within 5 days, get forecast
        weatherData = await this.getWeatherForecast(event.lat, event.lng);
      } else {
        // Event is too far in the future, use historical averages or mock data
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

      console.log(`Weather updated for event ${eventId}`);
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
        select: { id: true }
      });

      console.log(`Refreshing weather for ${upcomingEvents.length} events`);

      for (const event of upcomingEvents) {
        await this.getEventWeather(event.id);
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('Weather refresh completed for all events');
    } catch (error) {
      console.error('Error refreshing weather for all events:', error);
    }
  }

  /**
   * Get weather alerts for location
   */
  async getWeatherAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
    try {
      if (!this.rapidApiKey) {
        return [];
      }

      // Note: Weather alerts may not be available in this RapidAPI endpoint
      // This is a placeholder for future implementation
      console.log('Weather alerts not available in current RapidAPI endpoint');
      return [];
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      return [];
    }
  }

  /**
   * Parse RapidAPI weather response
   */
  private parseRapidApiWeatherData(data: any): WeatherData {
    try {
      // RapidAPI returns different structure, adapt accordingly
      const current = data.list?.[0] || data;
      const weather = current.weather?.[0] || {};
      const main = current.main || {};
      const wind = current.wind || {};
      const sys = current.sys || {};

      return {
        temperature: Math.round(main.temp || 20),
        condition: weather.main || 'Clear',
        description: weather.description || 'clear sky',
        humidity: main.humidity || 50,
        windSpeed: wind.speed || 0,
        windDirection: wind.deg || 0,
        visibility: current.visibility ? current.visibility / 1000 : 10,
        uvIndex: 0, // May not be available in this endpoint
        pressure: main.pressure || 1013,
        feelsLike: Math.round(main.feels_like || main.temp || 20),
        icon: weather.icon || '01d',
        sunrise: sys.sunrise ? new Date(sys.sunrise * 1000).toISOString() : undefined,
        sunset: sys.sunset ? new Date(sys.sunset * 1000).toISOString() : undefined,
        hourlyForecast: this.parseRapidApiHourlyForecast(data),
      };
    } catch (error) {
      console.error('Error parsing RapidAPI weather data:', error);
      // Return mock data as fallback
      return this.getMockWeatherData(0, 0);
    }
  }

  /**
   * Parse hourly forecast from RapidAPI response
   */
  private parseRapidApiHourlyForecast(data: any): HourlyForecast[] {
    try {
      if (!data.list || !Array.isArray(data.list)) {
        return [];
      }

      return data.list.slice(0, 24).map((item: any) => ({
        time: new Date((item.dt || Date.now() / 1000) * 1000).toISOString(),
        temperature: Math.round(item.main?.temp || 20),
        condition: item.weather?.[0]?.main || 'Clear',
        icon: item.weather?.[0]?.icon || '01d',
        precipitationChance: Math.round((item.pop || 0) * 100),
      }));
    } catch (error) {
      console.error('Error parsing hourly forecast:', error);
      return [];
    }
  }

  /**
   * Parse current weather API response (legacy method for reference)
   */
  private parseCurrentWeatherData(data: any): WeatherData {
    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind?.speed || 0,
      windDirection: data.wind?.deg || 0,
      visibility: data.visibility ? data.visibility / 1000 : 10, // Convert to km
      uvIndex: 0, // Not available in current weather API
      pressure: data.main.pressure,
      feelsLike: Math.round(data.main.feels_like),
      icon: data.weather[0].icon,
      sunrise: data.sys.sunrise ? new Date(data.sys.sunrise * 1000).toISOString() : undefined,
      sunset: data.sys.sunset ? new Date(data.sys.sunset * 1000).toISOString() : undefined,
    };
  }

  /**
   * Parse forecast weather API response
   */
  private parseForecastWeatherData(data: any): WeatherData {
    const current = data.list[0];
    const hourlyForecast: HourlyForecast[] = data.list.slice(0, 24).map((item: any) => ({
      time: new Date(item.dt * 1000).toISOString(),
      temperature: Math.round(item.main.temp),
      condition: item.weather[0].main,
      icon: item.weather[0].icon,
      precipitationChance: (item.pop || 0) * 100,
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
   * Generate mock weather data when API is not available
   */
  private getMockWeatherData(lat: number, lng: number): WeatherData {
    const now = new Date();
    const month = now.getMonth();
    const baseTemp = this.getSeasonalBaseTemperature(lat, month);
    
    const conditions = ['Clear', 'Clouds', 'Rain', 'Drizzle'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
      temperature: Math.round(baseTemp + (Math.random() - 0.5) * 10),
      condition,
      description: this.getConditionDescription(condition),
      humidity: Math.round(30 + Math.random() * 60),
      windSpeed: Math.round(Math.random() * 25),
      windDirection: Math.round(Math.random() * 360),
      visibility: Math.round(5 + Math.random() * 15),
      uvIndex: Math.floor(Math.random() * 11),
      pressure: Math.round(980 + Math.random() * 60),
      feelsLike: Math.round(baseTemp + (Math.random() - 0.5) * 8),
      icon: this.getWeatherIcon(condition),
      hourlyForecast: this.generateMockHourlyForecast(),
    };
  }

  /**
   * Generate mock hourly forecast
   */
  private generateMockHourlyForecast(): HourlyForecast[] {
    const forecast: HourlyForecast[] = [];
    const baseTemp = 20;

    for (let i = 0; i < 24; i++) {
      const time = new Date();
      time.setHours(time.getHours() + i);

      const conditions = ['Clear', 'Clouds', 'Rain'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];

      forecast.push({
        time: time.toISOString(),
        temperature: Math.round(baseTemp + (Math.random() - 0.5) * 15),
        condition,
        icon: this.getWeatherIcon(condition),
        precipitationChance: Math.round(Math.random() * 100),
      });
    }

    return forecast;
  }

  /**
   * Check if weather data needs refresh
   */
  async shouldRefreshWeather(eventId: string): Promise<boolean> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          weather: true,
          updatedAt: true,
          date: true,
        }
      });

      if (!event || !event.weather) {
        return true; // No weather data, needs refresh
      }

      const lastUpdate = new Date(event.updatedAt);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      // Refresh if data is older than 6 hours
      return hoursSinceUpdate > 6;
    } catch (error) {
      console.error('Error checking weather refresh status:', error);
      return true;
    }
  }
}

export const weatherService = new WeatherService(); 