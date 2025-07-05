import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { imageService, ImageType } from '../services/imageService';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { AuthenticationError, ValidationError } from '../utils/errors';

/**
 * Image Controller - Controllers ONLY handle HTTP concerns
 * Following strict controller pattern from implementation rules
 */

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow single file upload
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  }
});

class ImageController {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.uploadGenericImage = this.uploadGenericImage.bind(this);
    this.uploadProfileImage = this.uploadProfileImage.bind(this);
    this.uploadEventHeaderImage = this.uploadEventHeaderImage.bind(this);
    this.uploadEventPhoto = this.uploadEventPhoto.bind(this);
    this.deleteEventPhoto = this.deleteEventPhoto.bind(this);
    this.getEventPhotos = this.getEventPhotos.bind(this);
    this.generateImageVariations = this.generateImageVariations.bind(this);
    this.cleanupOrphanedImages = this.cleanupOrphanedImages.bind(this);
  }

  /**
   * Upload generic image (for creation flows)
   * POST /api/images/upload
   */
  async uploadGenericImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!req.file) {
        throw new ValidationError('No image file provided');
      }

      const { imageType } = req.body;
      if (!imageType || !Object.values(ImageType).includes(imageType)) {
        throw new ValidationError('Valid image type is required (profile, event_header, event_photo)');
      }

      const result = await imageService.uploadGenericImage(
        req.file.buffer,
        imageType as ImageType
      );

      sendSuccess(res, result, 'Image uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload profile image
   * POST /api/images/profile
   */
  async uploadProfileImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!req.file) {
        throw new ValidationError('No image file provided');
      }

      const imageUrl = await imageService.updateUserProfileImage(
        req.user.id,
        req.file.buffer
      );

      sendSuccess(res, { imageUrl }, 'Profile image updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload event header image
   * POST /api/images/event/:eventId/header
   */
  async uploadEventHeaderImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!req.file) {
        throw new ValidationError('No image file provided');
      }

      const { eventId } = req.params;
      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      const imageUrl = await imageService.updateEventHeaderImage(
        eventId,
        req.user.id,
        req.file.buffer
      );

      sendSuccess(res, { imageUrl }, 'Event header image updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload event photo to album
   * POST /api/images/event/:eventId/photos
   */
  async uploadEventPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!req.file) {
        throw new ValidationError('No image file provided');
      }

      const { eventId } = req.params;
      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      const { caption } = req.body;

      const photo = await imageService.addEventPhoto(
        eventId,
        req.user.id,
        req.file.buffer,
        caption
      );

      sendSuccess(res, photo, 'Event photo uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete event photo
   * DELETE /api/images/event/photos/:photoId
   */
  async deleteEventPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const { photoId } = req.params;
      if (!photoId) {
        throw new ValidationError('Photo ID is required');
      }

      const success = await imageService.deleteEventPhoto(photoId, req.user.id);

      if (success) {
        sendSuccess(res, null, 'Event photo deleted successfully');
      } else {
        throw new ValidationError('Failed to delete event photo');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event photos with pagination
   * GET /api/images/event/:eventId/photos
   */
  async getEventPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await imageService.getEventPhotos(eventId, page, limit);

      sendSuccess(res, result, 'Event photos retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate image variations for different sizes
   * GET /api/images/variations/:publicId
   */
  async generateImageVariations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { publicId } = req.params;
      if (!publicId) {
        throw new ValidationError('Public ID is required');
      }

      // Decode the public ID (it might be URL encoded)
      const decodedPublicId = decodeURIComponent(publicId);

      const variations = imageService.generateImageVariations(decodedPublicId);

      sendSuccess(res, variations, 'Image variations generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clean up orphaned images (Admin only)
   * POST /api/images/cleanup
   */
  async cleanupOrphanedImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // TODO: Add admin role check when roles are implemented
      // For now, any authenticated user can trigger cleanup (should be restricted in production)

      const result = await imageService.cleanupOrphanedImages();

      sendSuccess(res, result, 'Image cleanup completed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get multer middleware for single file upload
   */
  static getSingleUploadMiddleware() {
    return upload.single('image');
  }

  /**
   * Get multer middleware for multiple file upload
   */
  static getMultipleUploadMiddleware(maxCount: number = 10) {
    return upload.array('images', maxCount);
  }
}

export const imageController = new ImageController();
export { ImageController };
export default imageController; 