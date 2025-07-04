import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageUploader from './ImageUploader';
import { ImageType } from '../../services/imageService';

const ImageUploadDemo: React.FC = () => {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<string[]>([]);

  const handleProfileImageUpload = (imageUrl: string) => {
    setProfileImageUrl(imageUrl);
    setUploadResults(prev => [...prev, `Profile image uploaded: ${imageUrl}`]);
    Alert.alert('Success!', 'Profile image uploaded successfully');
  };

  const handleError = (error: string) => {
    setUploadResults(prev => [...prev, `Error: ${error}`]);
    Alert.alert('Upload Error', error);
  };

  const clearResults = () => {
    setUploadResults([]);
    setProfileImageUrl(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Image Upload Demo</Text>
        <Text style={styles.subtitle}>Test the image upload functionality</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Image Upload</Text>
        <ImageUploader
          imageType={ImageType.PROFILE}
          currentImageUrl={profileImageUrl || undefined}
          onImageUploaded={handleProfileImageUpload}
          onError={handleError}
          placeholder="Upload your profile photo"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Results</Text>
        <View style={styles.resultsContainer}>
          {uploadResults.length === 0 ? (
            <Text style={styles.noResults}>No uploads yet</Text>
          ) : (
            uploadResults.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <Ionicons 
                  name={result.startsWith('Error') ? 'alert-circle' : 'checkmark-circle'} 
                  size={16} 
                  color={result.startsWith('Error') ? '#ff4444' : '#00aa00'} 
                />
                <Text style={[
                  styles.resultText,
                  result.startsWith('Error') && styles.errorText
                ]}>
                  {result}
                </Text>
              </View>
            ))
          )}
        </View>
        
        {uploadResults.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
            <Text style={styles.clearButtonText}>Clear Results</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>
            1. Make sure your backend is running with Cloudinary configured
          </Text>
          <Text style={styles.instructionText}>
            2. Tap the profile image uploader above
          </Text>
          <Text style={styles.instructionText}>
            3. Choose an image from your gallery
          </Text>
          <Text style={styles.instructionText}>
            4. The image will be compressed and uploaded to Cloudinary
          </Text>
          <Text style={styles.instructionText}>
            5. Check the results section for upload status
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  resultsContainer: {
    minHeight: 100,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 30,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  resultText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  errorText: {
    color: '#ff4444',
  },
  clearButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  instructionsContainer: {
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  instructionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default ImageUploadDemo; 