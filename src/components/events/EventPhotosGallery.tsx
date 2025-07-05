import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageService, { EventPhoto, ImageUploadProgress } from '../../services/imageService';

interface EventPhotosGalleryProps {
  eventId: string;
  canUpload?: boolean;
  onPhotoUploaded?: (photo: EventPhoto) => void;
  onError?: (error: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const photoWidth = (screenWidth - 60) / 3; // 3 photos per row with margins

const EventPhotosGallery: React.FC<EventPhotosGalleryProps> = ({
  eventId,
  canUpload = false,
  onPhotoUploaded,
  onError,
}) => {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ImageUploadProgress | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [eventId]);

  const loadPhotos = async (pageNumber: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      }

      const response = await ImageService.getEventPhotos(eventId, pageNumber, 20);
      
      if (append) {
        setPhotos(prev => [...prev, ...response.photos]);
      } else {
        setPhotos(response.photos);
      }

      setHasMore(pageNumber < response.pagination.totalPages);
      setPage(pageNumber);
    } catch (error) {
      console.error('Failed to load photos:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to load photos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPhotos(1, false);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadPhotos(page + 1, true);
    }
  };

  const handleAddPhoto = () => {
    if (!canUpload) return;
    setShowImagePicker(true);
  };

  const pickFromCamera = async () => {
    setShowImagePicker(false);
    try {
      const result = await ImageService.pickFromCamera({
        allowsEditing: true,
        aspect: undefined, // Remove fixed aspect ratio to allow natural ratios
        quality: 0.9, // Increase quality from 0.8 to 0.9
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
        setShowCaptionModal(true);
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
        aspect: undefined, // Remove fixed aspect ratio to allow natural ratios
        quality: 0.9, // Increase quality from 0.8 to 0.9
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
        setShowCaptionModal(true);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to select photo');
    }
  };

  const uploadPhoto = async () => {
    if (!selectedImageUri) return;

    setShowCaptionModal(false);
    setUploading(true);
    setUploadProgress(null);

    try {
      const result = await ImageService.uploadEventPhoto(
        eventId,
        selectedImageUri,
        caption.trim() || undefined,
        handleProgress
      );

      // Add the new photo to the beginning of the list
      setPhotos(prev => [result, ...prev]);
      onPhotoUploaded?.(result);
      
      // Reset form
      setSelectedImageUri(null);
      setCaption('');
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleProgress = (progress: ImageUploadProgress) => {
    setUploadProgress(progress);
  };

  const handleDeletePhoto = (photo: EventPhoto) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePhoto(photo.id),
        },
      ]
    );
  };

  const deletePhoto = async (photoId: string) => {
    try {
      const success = await ImageService.deleteEventPhoto(photoId);
      if (success) {
        setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      }
    } catch (error) {
      console.error('Delete error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to delete photo');
    }
  };

  const renderPhoto = ({ item }: { item: EventPhoto }) => (
    <TouchableOpacity style={styles.photoContainer}>
      <Image
        source={{ uri: ImageService.getOptimizedImageUrl(item.imageUrl, 'small') }}
        style={styles.photo}
        resizeMode="cover"
      />
      
      {/* Photo overlay with user info */}
      <View style={styles.photoOverlay}>
        <View style={styles.userInfo}>
          <Image
            source={{ 
              uri: item.user.image 
                ? ImageService.getOptimizedImageUrl(item.user.image, 'thumbnail')
                : 'https://via.placeholder.com/30x30?text=U'
            }}
            style={styles.userAvatar}
          />
          <Text style={styles.username} numberOfLines={1}>
            {item.user.name || item.user.username}
          </Text>
        </View>
        
        {/* Delete button for own photos */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePhoto(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {item.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption} numberOfLines={2}>
            {item.caption}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderAddButton = () => {
    if (!canUpload) return null;

    return (
      <TouchableOpacity 
        style={[styles.photoContainer, styles.addButton]}
        onPress={handleAddPhoto}
        disabled={uploading}
      >
        {uploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            {uploadProgress && (
              <Text style={styles.uploadText}>
                {uploadProgress.percentage}%
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.addButtonContent}>
            <Ionicons name="add" size={32} color="#007AFF" />
            <Text style={styles.addButtonText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading || photos.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  if (loading && photos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Photos</Text>
        <Text style={styles.count}>{photos.length} photos</Text>
      </View>

      <FlatList
        data={[...(canUpload ? ['add-button'] : []), ...photos]}
        renderItem={({ item }) => {
          if (item === 'add-button') {
            return renderAddButton();
          }
          return renderPhoto({ item: item as EventPhoto });
        }}
        keyExtractor={(item) => 
          item === 'add-button' ? 'add-button' : (item as EventPhoto).id
        }
        numColumns={3}
        contentContainerStyle={styles.grid}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Event Photo</Text>
            
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

      {/* Caption Modal */}
      <Modal
        visible={showCaptionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCaptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Caption</Text>
            
            {selectedImageUri && (
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}
            
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption for your photo..."
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowCaptionModal(false);
                  setSelectedImageUri(null);
                  setCaption('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.uploadButton]} 
                onPress={uploadPhoto}
              >
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  count: {
    fontSize: 14,
    color: '#666',
  },
  grid: {
    padding: 15,
  },
  photoContainer: {
    width: photoWidth,
    height: photoWidth * 0.8, // Use a more natural aspect ratio instead of square
    marginHorizontal: 5,
    marginVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0', // Add background color for loading state
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  username: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  caption: {
    fontSize: 12,
    color: '#fff',
  },
  addButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    backgroundColor: '#f8f9fa',
  },
  addButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    textAlign: 'center',
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
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
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    height: 100,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default EventPhotosGallery; 