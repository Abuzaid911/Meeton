import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';

import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';
import ImageUploader from '../../components/common/ImageUploader';
import { ImageType } from '../../services/imageService';

interface EditProfileScreenProps {
  navigation: any;
}

// Move InputField component outside to prevent re-creation
const InputField: React.FC<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: any;
}> = React.memo(({ label, value, onChangeText, placeholder, multiline = false, maxLength, keyboardType }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <BlurView intensity={60} style={styles.inputBlur}>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        multiline={multiline}
        maxLength={maxLength}
        keyboardType={keyboardType}
        selectionColor={Colors.primary}
        autoCorrect={false}
        autoCapitalize={multiline ? 'sentences' : 'words'}
      />
    </BlurView>
  </View>
));

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  
  // Use authenticated user data
  const initialUser = user;
  
  // Form state
  const [formData, setFormData] = useState<Partial<User>>({
    name: initialUser?.name || '',
    username: initialUser?.username || '',
    email: initialUser?.email || '',
    bio: initialUser?.bio || '',
    location: initialUser?.location || '',

  });

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = useCallback((field: keyof User, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Create stable callbacks for each field
  const handleNameChange = useCallback((text: string) => handleInputChange('name', text), [handleInputChange]);
  const handleBioChange = useCallback((text: string) => handleInputChange('bio', text), [handleInputChange]);
  const handleLocationChange = useCallback((text: string) => handleInputChange('location', text), [handleInputChange]);

  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }

    // Validate required fields
    if (!formData.name?.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      setIsSaving(true);
      
      // Prepare update data with only fields that can be updated
      const updateData = {
        name: formData.name?.trim(),
        bio: formData.bio?.trim() || '',
        location: formData.location?.trim() || '',
      };
      
      // Update the user profile through AuthContext (which calls the backend)
      await updateUser(updateData);
      
      Alert.alert(
        'Profile Updated! 🎉',
        'Your profile has been updated successfully and is now visible to other users.',
        [
          { 
            text: 'Great!', 
            onPress: () => navigation.goBack(),
            style: 'default'
          }
        ],
        { 
          cancelable: false,
          userInterfaceStyle: 'dark'
        }
      );
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert(
        'Error', 
        'Failed to update profile. Please check your connection and try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [user, formData, updateUser, navigation]);

  const handleImageUpload = async (imageUrl: string) => {
    // Update the form data with the new image URL
    setFormData(prev => ({
      ...prev,
      image: imageUrl,
    }));

    // Also update the auth context so the user data is refreshed throughout the app
    try {
      await updateUser({ image: imageUrl });
    } catch (error) {
      console.error('Failed to update user context with new image:', error);
      // Don't show error to user as the upload succeeded, just log it
    }
  };

  const handleImageError = (error: string) => {
    Alert.alert('Upload Error', error);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <BlurView intensity={80} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Edit Profile</Text>
          
          <TouchableOpacity 
            style={[styles.headerButton, styles.saveButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Photo Section */}
          <View style={styles.photoSection}>
            <ImageUploader
              imageType={ImageType.PROFILE}
              currentImageUrl={formData.image || initialUser?.image}
              onImageUploaded={handleImageUpload}
              onError={handleImageError}
              placeholder="Upload profile photo"
              style={styles.imageUploader}
            />
            <Text style={styles.photoSectionTitle}>Profile Photo</Text>
            <Text style={styles.photoSectionSubtitle}>
              Choose a photo that represents you. This will be visible to other users.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Personal Information Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <InputField
                label="Full Name"
                value={formData.name || ''}
                onChangeText={handleNameChange}
                placeholder="Enter your full name"
                maxLength={50}
              />

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <BlurView intensity={60} style={styles.inputBlur}>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={formData.username || ''}
                    placeholder="Username cannot be changed"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    editable={false}
                  />
                </BlurView>
                <Text style={styles.helperText}>Username cannot be changed after account creation</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <BlurView intensity={60} style={styles.inputBlur}>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={formData.email || ''}
                    placeholder="Email cannot be changed"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    editable={false}
                  />
                </BlurView>
                <Text style={styles.helperText}>Contact support to change your email address</Text>
              </View>
            </View>

            {/* Profile Details Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Profile Details</Text>
              
              <InputField
                label="Bio"
                value={formData.bio || ''}
                onChangeText={handleBioChange}
                placeholder="Tell us about yourself..."
                multiline={true}
                maxLength={150}
              />

              <InputField
                label="Location"
                value={formData.location || ''}
                onChangeText={handleLocationChange}
                placeholder="City, State"
                maxLength={100}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerButton: {
    padding: Spacing.xs,
    minWidth: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
      saveButton: {
      backgroundColor: Colors.primary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.round,
      ...Shadows.medium,
    },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    flex: 1,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  imageUploader: {
    marginVertical: Spacing.md,
  },
  photoContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    ...Shadows.large,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  photoOverlayBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  photoOverlayText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  photoSectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  photoSectionSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  formSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  inputBlur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.white,
    minHeight: 56,
    fontWeight: FontWeight.medium,
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: Spacing.lg,
  },
  disabledInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.7,
  },
  helperText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: Spacing.sm,
    marginLeft: Spacing.md,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.lg,
    marginLeft: Spacing.xs,
  },
  sectionContainer: {
    marginBottom: Spacing.xxl,
  },
});

export default EditProfileScreen; 