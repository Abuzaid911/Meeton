import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { API_BASE_URL } from '../config/api';

/**
 * ============================================================================
 * MeetOn Image Service - React Native Frontend
 * ============================================================================
 * 
 * Comprehensive image handling service that provides:
 * • Image picking from camera/gallery
 * • Image compression and optimization
 * • Upload to Cloudinary via backend API
 * • Progress tracking and error handling
 * • Multiple image types (profile, event header, event photos)
 * 
 * Features:
 * • Automatic image compression to reduce file size
 * • Support for multiple image sources (camera, gallery)
 * • Real-time upload progress tracking
 * • Comprehensive error handling
 * • Image validation and preprocessing
 * ============================================================================
 */

export interface ImagePickerOptions {
  mediaTypes?: ImagePicker.MediaTypeOptions;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
}

export interface ImageUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ImageUploadResult {
  imageUrl: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface EventPhoto {
  id: string;
  imageUrl: string;
  caption?: string;
  uploadedAt: string;
  likeCount: number;
  user: {
    id: string;
    name?: string;
    username: string;
    image?: string;
  };
}

export interface EventPhotosResponse {
  photos: EventPhoto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ImageVariations {
  original: string;
  large: string;
  medium: string;
  small: string;
  thumbnail: string;
}

export enum ImageType {
  PROFILE = 'profile',
  EVENT_HEADER = 'event_header',
  EVENT_PHOTO = 'event_photo',
}

class ImageService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (reduced from backend's 10MB for better UX)
  private static readonly COMPRESSION_QUALITY = 0.8;
  private static readonly MAX_DIMENSIONS = {
    [ImageType.PROFILE]: { width: 800, height: 800 },
    [ImageType.EVENT_HEADER]: { width: 1200, height: 600 },
    [ImageType.EVENT_PHOTO]: { width: 1200, height: 1200 },
  };

  /**
   * Request camera and media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraStatus === 'granted' && mediaLibraryStatus === 'granted';
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * Pick image from camera
   */
  static async pickFromCamera(options: ImagePickerOptions = {}): Promise<ImagePicker.ImagePickerResult> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Camera permissions are required to take photos');
    }

    const defaultOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: this.COMPRESSION_QUALITY,
      ...options,
    };

    return await ImagePicker.launchCameraAsync(defaultOptions);
  }

  /**
   * Pick image from gallery
   */
  static async pickFromGallery(options: ImagePickerOptions = {}): Promise<ImagePicker.ImagePickerResult> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Media library permissions are required to select photos');
    }

    const defaultOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: this.COMPRESSION_QUALITY,
      allowsMultipleSelection: false,
      ...options,
    };

    return await ImagePicker.launchImageLibraryAsync(defaultOptions);
  }

  /**
   * Show image picker options (camera or gallery)
   */
  static async showImagePicker(options: ImagePickerOptions = {}): Promise<ImagePicker.ImagePickerResult> {
    // For now, we'll just use gallery. In a real app, you'd show an action sheet
    return await this.pickFromGallery(options);
  }

  /**
   * Compress and optimize image
   */
  static async compressImage(
    uri: string,
    imageType: ImageType,
    quality: number = this.COMPRESSION_QUALITY
  ): Promise<ImageManipulator.ImageResult> {
    try {
      const maxDimensions = this.MAX_DIMENSIONS[imageType];
      
      const manipulatorOptions: ImageManipulator.Action[] = [
        {
          resize: {
            width: maxDimensions.width,
            height: maxDimensions.height,
          },
        },
      ];

      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulatorOptions,
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result;
    } catch (error) {
      console.error('Image compression failed:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Validate image before upload
   */
  static async validateImage(uri: string): Promise<void> {
    try {
      // Check file size (approximate)
      const response = await fetch(uri);
      const blob = await response.blob();
      
      if (blob.size > this.MAX_FILE_SIZE) {
        throw new Error(`Image size (${(blob.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }
    } catch (error) {
      console.error('Image validation failed:', error);
      throw error;
    }
  }

  /**
   * Get valid access token
   */
  private static async getValidAccessToken(): Promise<string | null> {
    try {
      // Import APIService dynamically to avoid circular dependency
      const { APIService } = await import('./api');
      return await APIService.getValidAccessToken();
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(
    uri: string,
    onProgress?: (progress: ImageUploadProgress) => void
  ): Promise<ImageUploadResult> {
    try {
      // Validate image
      await this.validateImage(uri);

      // Compress image
      const compressedImage = await this.compressImage(uri, ImageType.PROFILE);

      // Create FormData
      const formData = new FormData();
      formData.append('image', {
        uri: compressedImage.uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      // Upload via API
      const response = await this.uploadWithProgress(
        '/api/images/profile',
        formData,
        onProgress
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to upload profile image');
      }

      return response.data as ImageUploadResult;
    } catch (error) {
      console.error('Profile image upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload event header image
   */
  static async uploadEventHeaderImage(
    eventId: string,
    uri: string,
    onProgress?: (progress: ImageUploadProgress) => void
  ): Promise<ImageUploadResult> {
    try {
      // Validate image
      await this.validateImage(uri);

      // Compress image
      const compressedImage = await this.compressImage(uri, ImageType.EVENT_HEADER);

      // Create FormData
      const formData = new FormData();
      formData.append('image', {
        uri: compressedImage.uri,
        type: 'image/jpeg',
        name: 'event_header.jpg',
      } as any);

      // Upload via API
      const response = await this.uploadWithProgress(
        `/api/images/event/${eventId}/header`,
        formData,
        onProgress
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to upload event header image');
      }

      return response.data as ImageUploadResult;
    } catch (error) {
      console.error('Event header image upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload event photo
   */
  static async uploadEventPhoto(
    eventId: string,
    uri: string,
    caption?: string,
    onProgress?: (progress: ImageUploadProgress) => void
  ): Promise<EventPhoto> {
    try {
      // Validate image
      await this.validateImage(uri);

      // Compress image
      const compressedImage = await this.compressImage(uri, ImageType.EVENT_PHOTO);

      // Create FormData
      const formData = new FormData();
      formData.append('image', {
        uri: compressedImage.uri,
        type: 'image/jpeg',
        name: 'event_photo.jpg',
      } as any);

      if (caption) {
        formData.append('caption', caption);
      }

      // Upload via API
      const response = await this.uploadWithProgress(
        `/api/images/event/${eventId}/photos`,
        formData,
        onProgress
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to upload event photo');
      }

      return response.data as EventPhoto;
    } catch (error) {
      console.error('Event photo upload failed:', error);
      throw error;
    }
  }

  /**
   * Get event photos with pagination
   */
  static async getEventPhotos(
    eventId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<EventPhotosResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/images/event/${eventId}/photos?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to get event photos');
      }

      return data.data as EventPhotosResponse;
    } catch (error) {
      console.error('Get event photos failed:', error);
      throw error;
    }
  }

  /**
   * Delete event photo
   */
  static async deleteEventPhoto(photoId: string): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/images/event/photos/${photoId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Delete event photo failed:', error);
      throw error;
    }
  }

  /**
   * Generate image variations
   */
  static async getImageVariations(publicId: string): Promise<ImageVariations> {
    try {
      const encodedPublicId = encodeURIComponent(publicId);
      const response = await fetch(
        `${API_BASE_URL}/api/images/variations/${encodedPublicId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to get image variations');
      }

      return data.data as ImageVariations;
    } catch (error) {
      console.error('Get image variations failed:', error);
      throw error;
    }
  }

  /**
   * Upload with progress tracking
   */
  private static async uploadWithProgress(
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: ImageUploadProgress) => void
  ): Promise<any> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress: ImageUploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(response);
            } else {
              reject(new Error(response.error?.message || `HTTP ${xhr.status}`));
            }
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'));
        });

        // Setup request
        xhr.open('POST', `${API_BASE_URL}${endpoint}`);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

        // Send request
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload with progress failed:', error);
      throw error;
    }
  }

  /**
   * Batch upload multiple images
   */
  static async uploadMultipleEventPhotos(
    eventId: string,
    imageUris: string[],
    captions?: string[],
    onProgress?: (overallProgress: number, currentIndex: number) => void
  ): Promise<EventPhoto[]> {
    try {
      const results: EventPhoto[] = [];
      const total = imageUris.length;

      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        const caption = captions?.[i];

        const result = await this.uploadEventPhoto(
          eventId,
          uri,
          caption,
          (progress) => {
            // Calculate overall progress
            const overallProgress = Math.round(((i + progress.percentage / 100) / total) * 100);
            onProgress?.(overallProgress, i);
          }
        );

        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Batch upload failed:', error);
      throw error;
    }
  }

  /**
   * Get optimized image URL for specific size
   */
  static getOptimizedImageUrl(
    imageUrl: string,
    size: 'thumbnail' | 'small' | 'medium' | 'large' = 'medium'
  ): string {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return imageUrl;
    }

    try {
      // Extract the base URL and public ID
      const urlParts = imageUrl.split('/upload/');
      if (urlParts.length !== 2) return imageUrl;

      const baseUrl = urlParts[0] + '/upload/';
      const publicIdWithVersion = urlParts[1];

      // Define transformations for each size
      const transformations = {
        thumbnail: 'w_150,h_150,c_fill,g_face,q_auto,f_auto',
        small: 'w_400,h_300,c_limit,q_auto,f_auto',
        medium: 'w_800,h_600,c_limit,q_auto,f_auto',
        large: 'w_1200,h_800,c_limit,q_auto,f_auto',
      };

      return `${baseUrl}${transformations[size]}/${publicIdWithVersion}`;
    } catch (error) {
      console.error('Failed to generate optimized URL:', error);
      return imageUrl;
    }
  }

  /**
   * Preload images for better performance
   */
  static async preloadImages(imageUrls: string[]): Promise<void> {
    try {
      const promises = imageUrls.map(url => {
        return new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          image.src = url;
        });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Image preloading failed:', error);
      // Don't throw - preloading is optional
    }
  }
}

export default ImageService; 