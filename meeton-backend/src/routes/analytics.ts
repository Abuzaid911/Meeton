import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

/**
 * Analytics Routes
 * Following implementation rules for route organization
 */
const router = Router();

// Apply rate limiting to all analytics routes
router.use(apiLimiter);

/**
 * Track event view (no auth required for anonymous tracking)
 * POST /api/analytics/events/:eventId/view
 */
router.post('/events/:eventId/view', analyticsController.trackEventView);

/**
 * Track event share (no auth required for anonymous tracking)
 * POST /api/analytics/events/:eventId/share
 */
router.post('/events/:eventId/share', analyticsController.trackEventShare);

/**
 * Get trending events (public endpoint)
 * GET /api/analytics/trending
 */
router.get('/trending', analyticsController.getTrendingEvents);

// All routes below require authentication
router.use(authenticate);

/**
 * Get event analytics
 * GET /api/analytics/events/:eventId
 */
router.get('/events/:eventId', analyticsController.getEventAnalytics);

/**
 * Get event insights (comprehensive analytics)
 * GET /api/analytics/events/:eventId/insights
 */
router.get('/events/:eventId/insights', analyticsController.getEventInsights);

/**
 * Get user analytics
 * GET /api/analytics/users/:userId
 */
router.get('/users/:userId', analyticsController.getUserAnalytics);

/**
 * Sync event analytics
 * POST /api/analytics/events/:eventId/sync
 */
router.post('/events/:eventId/sync', analyticsController.syncEventAnalytics);

/**
 * Sync all analytics
 * POST /api/analytics/sync-all
 */
router.post('/sync-all', analyticsController.syncAllAnalytics);

export default router; 