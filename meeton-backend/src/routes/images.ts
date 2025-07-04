import { Router } from 'express';
import imageController, { ImageController } from '../controllers/imageController';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';

/**
 * Image Upload Routes
 * Following implementation rules for route organization
 */
const router = Router();

// ============================================================================
// Profile Image Routes
// ============================================================================

/**
 * Upload profile image
 * POST /api/images/profile
 */
router.post(
  '/profile',
  uploadLimiter,
  authenticate,
  ImageController.getSingleUploadMiddleware(),
  imageController.uploadProfileImage
);

// ============================================================================
// Event Image Routes
// ============================================================================

/**
 * Upload event header image
 * POST /api/images/event/:eventId/header
 */
router.post(
  '/event/:eventId/header',
  uploadLimiter,
  authenticate,
  ImageController.getSingleUploadMiddleware(),
  imageController.uploadEventHeaderImage
);

/**
 * Upload event photo to album
 * POST /api/images/event/:eventId/photos
 */
router.post(
  '/event/:eventId/photos',
  uploadLimiter,
  authenticate,
  ImageController.getSingleUploadMiddleware(),
  imageController.uploadEventPhoto
);

/**
 * Get event photos with pagination
 * GET /api/images/event/:eventId/photos
 */
router.get(
  '/event/:eventId/photos',
  imageController.getEventPhotos
);

/**
 * Delete event photo
 * DELETE /api/images/event/photos/:photoId
 */
router.delete(
  '/event/photos/:photoId',
  authenticate,
  imageController.deleteEventPhoto
);

// ============================================================================
// Image Utility Routes
// ============================================================================

/**
 * Generate image variations for different sizes
 * GET /api/images/variations/:publicId
 */
router.get(
  '/variations/:publicId',
  imageController.generateImageVariations
);

/**
 * Clean up orphaned images (Admin only)
 * POST /api/images/cleanup
 */
router.post(
  '/cleanup',
  authenticate,
  imageController.cleanupOrphanedImages
);

export default router; 