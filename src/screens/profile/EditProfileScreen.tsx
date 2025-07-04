import React, { useState } from 'react';
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

  const handleInputChange = (field: keyof User, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
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
        'Success',
        'Your profile has been updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
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
  };

  const handleImageUpload = (imageUrl: string) => {
    // Update the form data with the new image URL
    setFormData(prev => ({
      ...prev,
      image: imageUrl,
    }));
  };

  const handleImageError = (error: string) => {
    Alert.alert('Upload Error', error);
  };

  const InputField: React.FC<{
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    multiline?: boolean;
    maxLength?: number;
    keyboardType?: any;
  }> = ({ label, value, onChangeText, placeholder, multiline = false, maxLength, keyboardType }) => (
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
        />
      </BlurView>
    </View>
  );

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
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <InputField
              label="Full Name"
              value={formData.name || ''}
              onChangeText={(text) => handleInputChange('name', text)}
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

            <InputField
              label="Bio"
              value={formData.bio || ''}
              onChangeText={(text) => handleInputChange('bio', text)}
              placeholder="Tell us about yourself..."
              multiline={true}
              maxLength={150}
            />

            <InputField
              label="Location"
              value={formData.location || ''}
              onChangeText={(text) => handleInputChange('location', text)}
              placeholder="City, State"
              maxLength={100}
            />


          </View>



          {/* Danger Zone */}
          <View style={styles.dangerSection}>
            <Text style={styles.sectionTitle}>Account</Text>
            <BlurView intensity={60} style={styles.dangerContainer}>
              <TouchableOpacity style={styles.dangerButton}>
                <Ionicons name="trash-outline" size={20} color={Colors.systemRed} />
                <Text style={styles.dangerButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </BlurView>
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerButton: {
    padding: Spacing.xs,
    minWidth: 60,
  },
  saveButton: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    flex: 1,
  },
  saveButtonText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  imageUploader: {
    marginVertical: Spacing.md,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    ...Shadows.large,
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
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.xs,
  },
  formSection: {
    paddingHorizontal: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  inputBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.white,
    minHeight: 50,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  disabledInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.6,
  },
  helperText: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  dangerSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  dangerContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  dangerButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: Colors.systemRed,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.sm,
  },
});

export default EditProfileScreen; 