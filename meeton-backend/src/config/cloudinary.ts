import { v2 as cloudinary } from 'cloudinary';
import { getEnv } from './env';

/**
 * Cloudinary Configuration
 * Initialize Cloudinary with environment variables
 */
class CloudinaryManager {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      const env = getEnv();
      
      if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
        cloudinary.config({
          cloud_name: env.CLOUDINARY_CLOUD_NAME,
          api_key: env.CLOUDINARY_API_KEY,
          api_secret: env.CLOUDINARY_API_SECRET,
          secure: true,
        });

        this.initialized = true;
        console.log('✅ Cloudinary configured successfully');
      } else {
        console.log('⚠️ Cloudinary configuration incomplete - image uploads will be disabled');
      }
    } catch (error) {
      console.error('❌ Failed to configure Cloudinary:', error);
    }
  }

  static isConfigured(): boolean {
    return this.initialized;
  }

  static getCloudinary() {
    if (!this.initialized) {
      this.initialize();
    }
    return cloudinary;
  }
}

// Initialize on import
CloudinaryManager.initialize();

export { CloudinaryManager };
export default cloudinary; 