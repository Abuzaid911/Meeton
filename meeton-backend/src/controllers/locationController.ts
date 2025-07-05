import { Request, Response, NextFunction } from 'express';
import { locationService } from '../services/locationService';
import { ValidationError, NotFoundError } from '../utils/errors';

/**
 * Location Controller
 * Handles location-related HTTP requests
 */
export class LocationController {
  /**
   * Geocode an address to coordinates
   * GET /api/location/geocode?address=123 Main St, New York, NY
   */
  async geocodeAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { address } = req.query;

      if (!address) {
        throw new ValidationError('Address is required');
      }

      const locationDetails = await locationService.geocodeAddress(address as string);

      if (!locationDetails) {
        throw new NotFoundError('Location not found');
      }

      res.status(200).json({
        success: true,
        data: locationDetails
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reverse geocode coordinates to address
   * GET /api/location/reverse-geocode?lat=40.7128&lng=-74.0060
   */
  async reverseGeocode(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const locationDetails = await locationService.reverseGeocode(latitude, longitude);

      if (!locationDetails) {
        throw new NotFoundError('Location not found');
      }

      res.status(200).json({
        success: true,
        data: locationDetails
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get location suggestions/autocomplete
   * GET /api/location/suggestions?query=New York&limit=5
   */
  async getLocationSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, limit } = req.query;

      if (!query) {
        throw new ValidationError('Query is required');
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 5;

      if (limitNum > 20) {
        throw new ValidationError('Limit cannot exceed 20');
      }

      const suggestions = await locationService.getLocationSuggestions(query as string, limitNum);

      res.status(200).json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find nearby events
   * GET /api/location/nearby-events?lat=40.7128&lng=-74.0060&radius=10&limit=20
   */
  async findNearbyEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, radius, limit, category, startDate, endDate } = req.query;

      if (!lat || !lng || !radius) {
        throw new ValidationError('Latitude, longitude, and radius are required');
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusNum = parseFloat(radius as string);

      if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusNum)) {
        throw new ValidationError('Invalid latitude, longitude, or radius');
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 20;

      if (limitNum > 100) {
        throw new ValidationError('Limit cannot exceed 100');
      }

      const options = {
        lat: latitude,
        lng: longitude,
        radius: radiusNum,
        limit: limitNum,
        category: category as string,
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        } : undefined,
      };

      const nearbyEvents = await locationService.findNearbyEvents(options);

      res.status(200).json({
        success: true,
        data: nearbyEvents,
        meta: {
          searchCenter: { lat: latitude, lng: longitude },
          radius: radiusNum,
          count: nearbyEvents.length,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get popular locations for events
   * GET /api/location/popular?limit=10
   */
  async getPopularLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string, 10) : 10;

      if (limitNum > 50) {
        throw new ValidationError('Limit cannot exceed 50');
      }

      const popularLocations = await locationService.getPopularLocations(limitNum);

      res.status(200).json({
        success: true,
        data: popularLocations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get events by city
   * GET /api/location/events-by-city?city=New York&limit=20
   */
  async getEventsByCity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { city, limit } = req.query;

      if (!city) {
        throw new ValidationError('City is required');
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 20;

      if (limitNum > 100) {
        throw new ValidationError('Limit cannot exceed 100');
      }

      const events = await locationService.getEventsByCity(city as string, limitNum);

      res.status(200).json({
        success: true,
        data: events,
        meta: {
          city: city as string,
          count: events.length,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get timezone for coordinates
   * GET /api/location/timezone?lat=40.7128&lng=-74.0060
   */
  async getTimezone(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const timezone = await locationService.getTimezone(latitude, longitude);

      res.status(200).json({
        success: true,
        data: {
          timezone: timezone || 'UTC',
          coordinates: { lat: latitude, lng: longitude }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const locationController = new LocationController(); 