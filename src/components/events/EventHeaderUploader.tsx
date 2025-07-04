import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageService, { ImageUploadProgress, ImageType } from '../../services/imageService';

interface EventHeaderUploaderProps {
  eventId: string;
  onImageUploaded: (imageUrl: string) => void;
  onError?: (error: string) => void;
  currentImageUrl?: string;
  placeholder?: string;
  disabled?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const EventHeaderUploader: React.FC<EventHeaderUploaderProps> = ({
  eventId,
  onImageUploaded,
  onError,
  currentImageUrl,
  placeholder = 'Add event header image',
  disabled = false,
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
        aspect: [16, 9], // Landscape aspect ratio
        quality: 0.8,
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
        aspect: [16, 9], // Landscape aspect ratio
        quality: 0.8,
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
      const result = await ImageService.uploadEventHeaderImage(
        eventId,
        uri,
        handleProgress
      );

      onImageUploaded(result.imageUrl);
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to upload header image');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleProgress = (progress: ImageUploadProgress) => {
    setUploadProgress(progress);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.headerContainer, disabled && styles.disabled]}
        onPress={handleImagePicker}
        disabled={disabled || isUploading}
      >
        {currentImageUrl ? (
          <Image 
            source={{ uri: ImageService.getOptimizedImageUrl(currentImageUrl, 'large') }} 
            style={styles.headerImage} 
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={64} color="#666" />
            <Text style={styles.placeholderText}>{placeholder}</Text>
            <Text style={styles.placeholderSubtext}>
              Recommended: 1200x600px
            </Text>
          </View>
        )}

        {isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            {uploadProgress && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Uploading... {uploadProgress.percentage}%
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${uploadProgress.percentage}%` }
                    ]} 
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {!disabled && !isUploading && (
          <View style={styles.editIcon}>
            <Ionicons name="camera" size={24} color="#fff" />
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
            <Text style={styles.modalTitle}>Select Header Image</Text>
            <Text style={styles.modalSubtitle}>
              Choose a landscape image that represents your event
            </Text>
            
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
    width: '100%',
  },
  headerContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  headerImage: {
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
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  placeholderSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
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
  progressContainer: {
    marginTop: 16,
    alignItems: 'center',
    width: '80%',
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  editIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
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

export default EventHeaderUploader; 