import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ImageService, { ImageUploadProgress, ImageType } from '../../services/imageService';

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  onError?: (error: string) => void;
  currentImageUrl?: string;
  imageType: ImageType;
  placeholder?: string;
  style?: any;
  disabled?: boolean;
  showProgress?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUploaded,
  onError,
  currentImageUrl,
  imageType,
  placeholder = 'Tap to add image',
  style,
  disabled = false,
  showProgress = true,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ImageUploadProgress | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const handleImagePicker = () => {
    if (disabled) return;
    setShowImagePicker(true);
  };

  const pickFromCamera = async () => {
    setShowImagePicker(false);
    try {
      const result = await ImageService.pickFromCamera({
        allowsEditing: true,
        aspect: getAspectRatio(),
        quality: 0.9, // Increased from 0.8 to 0.9
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to take photo');
    }
  };

  const pickFromGallery = async () => {
    setShowImagePicker(false);
    try {
      const result = await ImageService.pickFromGallery({
        allowsEditing: true,
        aspect: getAspectRatio(),
        quality: 0.9, // Increased from 0.8 to 0.9
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to select photo');
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    setUploadProgress(null);

    try {
      let result;
      
      switch (imageType) {
        case ImageType.PROFILE:
          result = await ImageService.uploadProfileImage(uri, handleProgress);
          break;
        case ImageType.EVENT_HEADER:
          // For event creation, we'll upload to a generic endpoint and store the URL
          result = await ImageService.uploadGenericImage(uri, imageType, handleProgress);
          break;
        case ImageType.EVENT_PHOTO:
          // For standalone photo uploads without event context
          result = await ImageService.uploadGenericImage(uri, imageType, handleProgress);
          break;
        default:
          throw new Error('Unsupported image type for this component');
      }

      onImageUploaded(result.imageUrl);
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleProgress = (progress: ImageUploadProgress) => {
    if (showProgress) {
      setUploadProgress(progress);
    }
  };

  const getAspectRatio = (): [number, number] => {
    switch (imageType) {
      case ImageType.PROFILE:
        return [1, 1]; // Square
      case ImageType.EVENT_HEADER:
        return [16, 9]; // Landscape
      case ImageType.EVENT_PHOTO:
        return [4, 3]; // Standard photo
      default:
        return [1, 1];
    }
  };

  const getImageStyle = () => {
    switch (imageType) {
      case ImageType.PROFILE:
        return styles.profileImage;
      case ImageType.EVENT_HEADER:
        return styles.headerImage;
      case ImageType.EVENT_PHOTO:
        return styles.photoImage;
      default:
        return styles.profileImage;
    }
  };

  const getPlaceholderIcon = () => {
    switch (imageType) {
      case ImageType.PROFILE:
        return 'person-circle-outline';
      case ImageType.EVENT_HEADER:
        return 'image-outline';
      case ImageType.EVENT_PHOTO:
        return 'camera-outline';
      default:
        return 'image-outline';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.imageContainer, getImageStyle(), disabled && styles.disabled]}
        onPress={handleImagePicker}
        disabled={disabled || isUploading}
      >
        {currentImageUrl ? (
          <Image 
            source={{ uri: ImageService.getOptimizedImageUrl(currentImageUrl, 'medium') }} 
            style={[styles.image, getImageStyle()]} 
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons 
              name={getPlaceholderIcon()} 
              size={48} 
              color="#666" 
            />
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        )}

        {isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            {uploadProgress && showProgress && (
              <Text style={styles.progressText}>
                {uploadProgress.percentage}%
              </Text>
            )}
          </View>
        )}

        {!disabled && !isUploading && (
          <View style={styles.editIcon}>
            <Ionicons name="camera" size={20} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Image Source</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={pickFromCamera}>
              <Ionicons name="camera" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalOption} onPress={pickFromGallery}>
              <Ionicons name="images" size={24} color="#007AFF" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalOption, styles.cancelOption]} 
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  imageContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  headerImage: {
    width: 300,
    height: 150,
    borderRadius: 8,
  },
  photoImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  editIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  cancelOption: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    flex: 1,
  },
});

export default ImageUploader; 