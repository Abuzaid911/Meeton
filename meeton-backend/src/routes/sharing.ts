import { Router } from 'express';
import { sharingController } from '../controllers/sharingController';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

/**
 * Sharing Routes
 * Event sharing and invite link endpoints
 */
const router = Router();

// Apply rate limiting to all sharing routes
router.use(apiLimiter);

/**
 * Public routes (no authentication required)
 */

/**
 * Get invite link by token (public for sharing)
 * GET /api/sharing/invite/:token
 */
router.get('/invite/:token', sharingController.getInviteLink);

/**
 * Use an invite link (track usage)
 * POST /api/sharing/invite/:token/use
 */
router.post('/invite/:token/use', sharingController.useInviteLink);

/**
 * Get available social platforms
 * GET /api/sharing/platforms
 */
router.get('/platforms', sharingController.getSocialPlatforms);

/**
 * Get share content for an event (public for meta tags)
 * GET /api/sharing/events/:eventId/content
 */
router.get('/events/:eventId/content', sharingController.getShareContent);

/**
 * Get event summary for sharing (public)
 * GET /api/sharing/events/:eventId/summary
 */
router.get('/events/:eventId/summary', sharingController.getEventSummary);

/**
 * Generate QR code for event (public)
 * GET /api/sharing/events/:eventId/qr-code
 */
router.get('/events/:eventId/qr-code', sharingController.generateQRCode);

/**
 * Authenticated routes
 */
router.use(authenticate);

/**
 * Generate invite link for an event
 * POST /api/sharing/events/:eventId/invite-links
 */
router.post('/events/:eventId/invite-links', sharingController.generateInviteLink);

/**
 * Get all invite links for an event
 * GET /api/sharing/events/:eventId/invite-links
 */
router.get('/events/:eventId/invite-links', sharingController.getEventInviteLinks);

/**
 * Deactivate an invite link
 * DELETE /api/sharing/invite-links/:linkId
 */
router.delete('/invite-links/:linkId', sharingController.deactivateInviteLink);

/**
 * Generate social media share URL
 * GET /api/sharing/events/:eventId/share/:platform
 */
router.get('/events/:eventId/share/:platform', sharingController.generateShareUrl);

/**
 * Get sharing analytics for an event
 * GET /api/sharing/events/:eventId/stats
 */
router.get('/events/:eventId/stats', sharingController.getSharingStats);

export default router; 