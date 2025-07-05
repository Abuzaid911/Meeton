import { Router } from 'express';
import { locationController } from '../controllers/locationController';
import { apiLimiter } from '../middleware/rateLimit';

/**
 * Location Routes
 * Public endpoints for location services
 */
const router = Router();

// Apply rate limiting to all location routes
router.use(apiLimiter);

/**
 * Geocode an address to coordinates
 * GET /api/location/geocode?address=123 Main St, New York, NY
 */
router.get('/geocode', locationController.geocodeAddress);

/**
 * Reverse geocode coordinates to address
 * GET /api/location/reverse-geocode?lat=40.7128&lng=-74.0060
 */
router.get('/reverse-geocode', locationController.reverseGeocode);

/**
 * Get location suggestions/autocomplete
 * GET /api/location/suggestions?query=New York&limit=5
 */
router.get('/suggestions', locationController.getLocationSuggestions);

/**
 * Find nearby events
 * GET /api/location/nearby-events?lat=40.7128&lng=-74.0060&radius=10&limit=20
 */
router.get('/nearby-events', locationController.findNearbyEvents);

/**
 * Get popular locations for events
 * GET /api/location/popular?limit=10
 */
router.get('/popular', locationController.getPopularLocations);

/**
 * Get events by city
 * GET /api/location/events-by-city?city=New York&limit=20
 */
router.get('/events-by-city', locationController.getEventsByCity);

/**
 * Get timezone for coordinates
 * GET /api/location/timezone?lat=40.7128&lng=-74.0060
 */
router.get('/timezone', locationController.getTimezone);

export default router; 