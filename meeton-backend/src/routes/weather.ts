import { Router } from 'express';
import { weatherController } from '../controllers/weatherController';
import { apiLimiter } from '../middleware/rateLimit';

/**
 * Weather Routes
 * Public endpoints for weather data
 */
const router = Router();

// Apply rate limiting to all weather routes
router.use(apiLimiter);

/**
 * Get current weather for coordinates
 * GET /api/weather/current?lat=40.7128&lng=-74.0060
 */
router.get('/current', weatherController.getCurrentWeather);

/**
 * Get weather forecast for coordinates
 * GET /api/weather/forecast?lat=40.7128&lng=-74.0060
 */
router.get('/forecast', weatherController.getWeatherForecast);

/**
 * Get weather for specific event
 * GET /api/weather/events/:eventId
 */
router.get('/events/:eventId', weatherController.getEventWeather);

/**
 * Get weather alerts for coordinates
 * GET /api/weather/alerts?lat=40.7128&lng=-74.0060
 */
router.get('/alerts', weatherController.getWeatherAlerts);

/**
 * Refresh weather for all events (admin/maintenance endpoint)
 * POST /api/weather/refresh-all
 */
router.post('/refresh-all', weatherController.refreshAllWeather);

export default router; 