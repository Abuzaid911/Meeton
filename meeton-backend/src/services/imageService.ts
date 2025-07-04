import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { prisma } from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errors';
import { CloudinaryManager } from '../config/cloudinary';

/**
 * Image Upload Service - Handles all image uploads to Cloudinary
 * Following strict service layer pattern from implementation rules
 */

export interface ImageUploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  folder: string;
}

export interface ImageUploadOptions {
  folder: string;
  transformation?: any[];
  tags?: string[];
  context?: Record<string, string>;
  eager?: any[];
  overwrite?: boolean;
  invalidate?: boolean;
}

export enum ImageType {
  PROFILE = 'profile',
  EVENT_HEADER = 'event_header',
  EVENT_PHOTO = 'event_photo',
  AVATAR = 'avatar',
  COVER = 'cover',
  THUMBNAIL = 'thumbnail'
}

export enum ImageFolder {
  PROFILES = 'meeton/profiles',
  EVENT_HEADERS = 'meeton/event_headers',
  EVENT_PHOTOS = 'meeton/event_photos',
  AVATARS = 'meeton/avatars',
  COVERS = 'meeton/covers',
  THUMBNAILS = 'meeton/thumbnails'
}

class ImageService {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  private readonly transformations = {
    profile: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good', fetch_format: 'auto' }
    ],
    avatar: [
      { width: 150, height: 150, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good', fetch_format: 'auto' }
    ],
    eventHeader: [
      { width: 800, height: 400, crop: 'fill', gravity: 'center' },
      { quality: 'auto:good', fetch_format: 'auto' }
    ],
    eventPhoto: [
      { width: 1200, height: 800, crop: 'limit' },
      { quality: 'auto:good', fetch_format: 'auto' }
    ],
    thumbnail: [
      { width: 300, height: 200, crop: 'fill', gravity: 'center' },
      { quality: 'auto:good', fetch_format: 'auto' }
    ]
  };

  /**
   * Upload image from buffer
   */
  async uploadFromBuffer(
    buffer: Buffer,
    imageType: ImageType,
    userId: string,
    options: Partial<ImageUploadOptions> = {}
  ): Promise<ImageUploadResult> {
    try {
      // Validate file size
      if (buffer.length > this.maxFileSize) {
        throw new ValidationError(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
      }

      // Get folder and transformations based on image type
      const folder = this.getFolderForType(imageType);
      const transformation = this.getTransformationForType(imageType);

      // Generate unique public ID
      const publicId = `${folder}/${userId}_${Date.now()}`;

      // Upload to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            folder: folder,
            transformation: transformation,
            tags: [imageType, userId, ...(options.tags || [])],
            context: {
              user_id: userId,
              image_type: imageType,
              uploaded_at: new Date().toISOString(),
              ...(options.context || {})
            },
            eager: [
              ...transformation,
              ...(options.eager || [])
            ],
            overwrite: options.overwrite || false,
            invalidate: options.invalidate || true,
            resource_type: 'auto',
            allowed_formats: this.allowedFormats
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        const stream = Readable.from(buffer);
        stream.pipe(uploadStream);
      });

      return {
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        folder: folder
      };
    } catch (error) {
      console.error('Image upload failed:', error);
      throw new ValidationError('Failed to upload image');
    }
  }

  /**
   * Upload image from URL
   */
  async uploadFromUrl(
    imageUrl: string,
    imageType: ImageType,
    userId: string,
    options: Partial<ImageUploadOptions> = {}
  ): Promise<ImageUploadResult> {
    try {
      const folder = this.getFolderForType(imageType);
      const transformation = this.getTransformationForType(imageType);
      const publicId = `${folder}/${userId}_${Date.now()}`;

      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        public_id: publicId,
        folder: folder,
        transformation: transformation,
        tags: [imageType, userId, ...(options.tags || [])],
        context: {
          user_id: userId,
          image_type: imageType,
          uploaded_at: new Date().toISOString(),
          ...(options.context || {})
        },
        eager: [
          ...transformation,
          ...(options.eager || [])
        ],
        overwrite: options.overwrite || false,
        invalidate: options.invalidate || true,
        resource_type: 'auto',
        allowed_formats: this.allowedFormats
      });

      return {
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        folder: folder
      };
    } catch (error) {
      console.error('Image upload from URL failed:', error);
      throw new ValidationError('Failed to upload image from URL');
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Image deletion failed:', error);
      return false;
    }
  }

  /**
   * Update user profile image
   */
  async updateUserProfileImage(userId: string, imageBuffer: Buffer): Promise<string> {
    try {
      // Get current user to check for existing image
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { image: true }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Upload new image
      const uploadResult = await this.uploadFromBuffer(
        imageBuffer,
        ImageType.PROFILE,
        userId,
        {
          tags: ['profile_image'],
          context: { purpose: 'profile_update' }
        }
      );

      // Update user record
      await prisma.user.update({
        where: { id: userId },
        data: { image: uploadResult.secureUrl }
      });

      // Delete old image if exists and is from Cloudinary
      if (user.image && user.image.includes('cloudinary.com')) {
        const oldPublicId = this.extractPublicIdFromUrl(user.image);
        if (oldPublicId) {
          await this.deleteImage(oldPublicId);
        }
      }

      return uploadResult.secureUrl;
    } catch (error) {
      console.error('Profile image update failed:', error);
      throw error;
    }
  }

  /**
   * Update event header image
   */
  async updateEventHeaderImage(eventId: string, userId: string, imageBuffer: Buffer): Promise<string> {
    try {
      // Verify user owns the event
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { hostId: true, headerImageUrl: true }
      });

      if (!event) {
        throw new NotFoundError('Event not found');
      }

      if (event.hostId !== userId) {
        throw new ValidationError('Only event host can update header image');
      }

      // Upload new image
      const uploadResult = await this.uploadFromBuffer(
        imageBuffer,
        ImageType.EVENT_HEADER,
        userId,
        {
          tags: ['event_header', eventId],
          context: { event_id: eventId, purpose: 'event_header' }
        }
      );

      // Update event record
      await prisma.event.update({
        where: { id: eventId },
        data: { 
          headerImageUrl: uploadResult.secureUrl,
          headerType: 'image'
        }
      });

      // Delete old image if exists and is from Cloudinary
      if (event.headerImageUrl && event.headerImageUrl.includes('cloudinary.com')) {
        const oldPublicId = this.extractPublicIdFromUrl(event.headerImageUrl);
        if (oldPublicId) {
          await this.deleteImage(oldPublicId);
        }
      }

      return uploadResult.secureUrl;
    } catch (error) {
      console.error('Event header image update failed:', error);
      throw error;
    }
  }

  /**
   * Add photo to event album
   */
  async addEventPhoto(
    eventId: string,
    userId: string,
    imageBuffer: Buffer,
    caption?: string
  ): Promise<{ id: string; imageUrl: string; caption?: string }> {
    try {
      // Verify user is attending the event
      const attendee = await prisma.attendee.findUnique({
        where: { 
          userId_eventId: { userId, eventId }
        },
        include: { event: true }
      });

      if (!attendee) {
        throw new ValidationError('Only event attendees can upload photos');
      }

      // Upload image
      const uploadResult = await this.uploadFromBuffer(
        imageBuffer,
        ImageType.EVENT_PHOTO,
        userId,
        {
          tags: ['event_photo', eventId, userId],
          context: { 
            event_id: eventId, 
            uploader_id: userId,
            purpose: 'event_album'
          }
        }
      );

      // Create event photo record
      const eventPhoto = await prisma.eventPhoto.create({
        data: {
          imageUrl: uploadResult.secureUrl,
          caption: caption || null,
          eventId,
          userId,
          storageKey: uploadResult.publicId
        }
      });

      return {
        id: eventPhoto.id,
        imageUrl: eventPhoto.imageUrl,
        caption: eventPhoto.caption || undefined
      };
    } catch (error) {
      console.error('Event photo upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete event photo
   */
  async deleteEventPhoto(photoId: string, userId: string): Promise<boolean> {
    try {
      // Get photo details
      const photo = await prisma.eventPhoto.findUnique({
        where: { id: photoId },
        include: { event: true }
      });

      if (!photo) {
        throw new NotFoundError('Photo not found');
      }

      // Check if user can delete (photo owner or event host)
      if (photo.userId !== userId && photo.event.hostId !== userId) {
        throw new ValidationError('You can only delete your own photos or photos from your events');
      }

      // Delete from Cloudinary
      if (photo.storageKey) {
        await this.deleteImage(photo.storageKey);
      }

      // Delete from database
      await prisma.eventPhoto.delete({
        where: { id: photoId }
      });

      return true;
    } catch (error) {
      console.error('Event photo deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get event photos with pagination
   */
  async getEventPhotos(
    eventId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    photos: Array<{
      id: string;
      imageUrl: string;
      caption?: string;
      uploadedAt: Date;
      likeCount: number;
      user: {
        id: string;
        name?: string;
        username: string;
        image?: string;
      };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const skip = (page - 1) * limit;

      const [photos, total] = await Promise.all([
        prisma.eventPhoto.findMany({
          where: { eventId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true
              }
            }
          },
          orderBy: { uploadedAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.eventPhoto.count({
          where: { eventId }
        })
      ]);

      return {
        photos: photos.map(photo => ({
          id: photo.id,
          imageUrl: photo.imageUrl,
          caption: photo.caption || undefined,
          uploadedAt: photo.uploadedAt,
          likeCount: photo.likeCount,
          user: {
            id: photo.user.id,
            name: photo.user.name || undefined,
            username: photo.user.username,
            image: photo.user.image || undefined
          }
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get event photos failed:', error);
      throw error;
    }
  }

  /**
   * Generate optimized image URLs for different sizes
   */
  generateImageVariations(publicId: string): {
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  } {
    const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    return {
      original: `${baseUrl}/${publicId}`,
      large: `${baseUrl}/w_1200,h_800,c_limit,q_auto,f_auto/${publicId}`,
      medium: `${baseUrl}/w_800,h_600,c_limit,q_auto,f_auto/${publicId}`,
      small: `${baseUrl}/w_400,h_300,c_limit,q_auto,f_auto/${publicId}`,
      thumbnail: `${baseUrl}/w_150,h_150,c_fill,g_face,q_auto,f_auto/${publicId}`
    };
  }

  /**
   * Get folder for image type
   */
  private getFolderForType(imageType: ImageType): string {
    switch (imageType) {
      case ImageType.PROFILE:
        return ImageFolder.PROFILES;
      case ImageType.EVENT_HEADER:
        return ImageFolder.EVENT_HEADERS;
      case ImageType.EVENT_PHOTO:
        return ImageFolder.EVENT_PHOTOS;
      case ImageType.AVATAR:
        return ImageFolder.AVATARS;
      case ImageType.COVER:
        return ImageFolder.COVERS;
      case ImageType.THUMBNAIL:
        return ImageFolder.THUMBNAILS;
      default:
        return ImageFolder.PROFILES;
    }
  }

  /**
   * Get transformation for image type
   */
  private getTransformationForType(imageType: ImageType): any[] {
    switch (imageType) {
      case ImageType.PROFILE:
        return this.transformations.profile;
      case ImageType.EVENT_HEADER:
        return this.transformations.eventHeader;
      case ImageType.EVENT_PHOTO:
        return this.transformations.eventPhoto;
      case ImageType.AVATAR:
        return this.transformations.avatar;
      case ImageType.THUMBNAIL:
        return this.transformations.thumbnail;
      default:
        return this.transformations.profile;
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex === -1) return null;
      
      // Get everything after 'upload' and any transformations
      const pathParts = urlParts.slice(uploadIndex + 1);
      
      // Remove version if present (starts with 'v' followed by numbers)
      const filteredParts = pathParts.filter(part => !part.match(/^v\d+$/));
      
      // Remove file extension
      const publicIdWithExt = filteredParts.join('/');
      const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
      
      return publicId;
    } catch (error) {
      console.error('Failed to extract public ID from URL:', error);
      return null;
    }
  }

  /**
   * Clean up orphaned images (images not referenced in database)
   */
  async cleanupOrphanedImages(): Promise<{ deleted: number; errors: string[] }> {
    try {
      const results = { deleted: 0, errors: [] as string[] };
      
      // Get all images from Cloudinary with MeetOn tags
      const cloudinaryImages = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'meeton/',
        max_results: 500,
        tags: true,
        context: true
      });

      for (const image of cloudinaryImages.resources) {
        try {
          const publicId = image.public_id;
          const context = image.context || {};
          
          // Check if image is referenced in database
          const isReferenced = await this.isImageReferenced(image.secure_url, context);
          
          if (!isReferenced) {
            await this.deleteImage(publicId);
            results.deleted++;
          }
        } catch (error) {
          results.errors.push(`Failed to process image ${image.public_id}: ${error}`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Cleanup orphaned images failed:', error);
      throw error;
    }
  }

  /**
   * Check if image is referenced in database
   */
  private async isImageReferenced(imageUrl: string, context: any): Promise<boolean> {
    try {
      // Check user profiles
      const userCount = await prisma.user.count({
        where: { image: imageUrl }
      });
      
      if (userCount > 0) return true;
      
      // Check event headers
      const eventCount = await prisma.event.count({
        where: { headerImageUrl: imageUrl }
      });
      
      if (eventCount > 0) return true;
      
      // Check event photos
      const photoCount = await prisma.eventPhoto.count({
        where: { imageUrl: imageUrl }
      });
      
      if (photoCount > 0) return true;
      
      return false;
    } catch (error) {
      console.error('Failed to check image reference:', error);
      return true; // Assume referenced to avoid accidental deletion
    }
  }
}

export const imageService = new ImageService();
export default imageService; 