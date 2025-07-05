import { Request, Response, NextFunction } from 'express';
import { weatherService } from '../services/weatherService';
import { ValidationError, NotFoundError } from '../utils/errors';

/**
 * Weather Controller
 * Handles weather-related HTTP requests
 */
export class WeatherController {
  /**
   * Get current weather for coordinates
   * GET /api/weather/current?lat=40.7128&lng=-74.0060
   */
  async getCurrentWeather(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        throw new ValidationError('Latitude and longitude are required');
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new ValidationError('Invalid latitude or longitude');
      }

      const weather = await weatherService.getCurrentWeather(latitude, longitude);

      if (!weather) {
        throw new NotFoundError('Weather data not available');
      }

      res.status(200).json({
        success: true,
        data: weather
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get weather forecast for coordinates
   * GET /api/weather/forecast?lat=40.7128&lng=-74.0060
   */
  async getWeatherForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        throw new ValidationError('Latitude and longitude are required');
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new ValidationError('Invalid latitude or longitude');
      }

      const weather = await weatherService.getWeatherForecast(latitude, longitude);

      if (!weather) {
        throw new NotFoundError('Weather forecast not available');
      }

      res.status(200).json({
        success: true,
        data: weather
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get weather for specific event
   * GET /api/weather/events/:eventId
   */
  async getEventWeather(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      const weather = await weatherService.getEventWeather(eventId);

      if (!weather) {
        throw new NotFoundError('Weather data not available for this event');
      }

      res.status(200).json({
        success: true,
        data: weather
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh weather for all events (admin/maintenance endpoint)
   * POST /api/weather/refresh-all
   */
  async refreshAllWeather(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Add admin authentication when roles are implemented
      await weatherService.refreshAllEventWeather();

      res.status(200).json({
        success: true,
        message: 'Weather refresh initiated for all events'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get weather alerts for coordinates
   * GET /api/weather/alerts?lat=40.7128&lng=-74.0060
   */
  async getWeatherAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        throw new ValidationError('Latitude and longitude are required');
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new ValidationError('Invalid latitude or longitude');
      }

      const alerts = await weatherService.getWeatherAlerts(latitude, longitude);

      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      next(error);
    }
  }
}

export const weatherController = new WeatherController(); 