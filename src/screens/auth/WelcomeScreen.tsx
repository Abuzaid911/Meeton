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
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import APIService from '../../services/api';

interface WelcomeScreenProps {
  navigation: any;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    try {
      const response = await APIService.checkUsernameAvailability(username);
      setUsernameAvailable(response);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  const handleUsernameChange = (text: string) => {
    // Convert to lowercase and remove invalid characters
    const cleanedUsername = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setFormData(prev => ({ ...prev, username: cleanedUsername }));
    
    // Debounce username checking
    if (cleanedUsername !== user?.username && cleanedUsername.length >= 3) {
      setTimeout(() => {
        if (cleanedUsername === formData.username) {
          checkUsernameAvailability(cleanedUsername);
        }
      }, 500);
    } else {
      setUsernameAvailable(null);
    }
  };

  const handleComplete = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!formData.username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (formData.username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (usernameAvailable === false) {
      Alert.alert('Error', 'This username is already taken. Please choose another one.');
      return;
    }

    setIsLoading(true);
    try {
      // Call the welcome completion API
      const response = await APIService.completeWelcomeProfile({
        name: formData.name.trim(),
        username: formData.username.trim(),
      });

      if (response) {
        // Update the local user context
        await updateUser({
          name: formData.name.trim(),
          username: formData.username.trim(),
          onboardingCompleted: true,
        });

        Alert.alert(
          'Welcome to MeetOn!',
          'Your profile has been set up successfully.',
          [{ text: 'Continue', onPress: () => navigation.replace('Main') }]
        );
      } else {
        Alert.alert('Error', 'Failed to complete setup. Please try again.');
      }
    } catch (error: any) {
      console.error('Error completing welcome:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to complete setup. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderUsernameStatus = () => {
    if (usernameChecking) {
      return (
        <View style={styles.usernameStatus}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.usernameStatusText}>Checking availability...</Text>
        </View>
      );
    }

    if (formData.username.length >= 3) {
      if (usernameAvailable === true) {
        return (
          <View style={styles.usernameStatus}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.systemGreen} />
            <Text style={[styles.usernameStatusText, { color: Colors.systemGreen }]}>
              Username available!
            </Text>
          </View>
        );
      } else if (usernameAvailable === false) {
        return (
          <View style={styles.usernameStatus}>
            <Ionicons name="close-circle" size={16} color={Colors.systemRed} />
            <Text style={[styles.usernameStatusText, { color: Colors.systemRed }]}>
              Username already taken
            </Text>
          </View>
        );
      }
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        style={styles.backgroundGradient}
      />

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Welcome */}
          <View style={styles.headerSection}>
            {/* Glassmorphism Logo Container */}
            <View style={styles.logoContainer}>
              <BlurView intensity={40} style={styles.logoBlur}>
                <View style={styles.logoGlassEffect}>
                  <Image
                    source={require('../../../assets/meetlogo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </BlurView>
            </View>
            <Text style={styles.welcomeTitle}>Welcome to MeetOn!</Text>
            <Text style={styles.welcomeSubtitle}>
              Let's set up your profile so others can find and connect with you.
            </Text>
          </View>

          {/* Profile Setup Form */}
          <View style={styles.formSection}>
            <BlurView intensity={60} style={styles.formContainer}>
              <View style={styles.formContent}>
                <Text style={styles.sectionTitle}>Complete Your Profile</Text>

                {/* Profile Photo */}
                <View style={styles.profilePhotoSection}>
                  <View style={styles.profilePhotoContainer}>
                    <Image 
                      source={{ 
                        uri: user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=667eea&color=fff&size=120`
                      }} 
                      style={styles.profilePhoto}
                    />
                    <View style={styles.photoOverlay}>
                      <Ionicons name="camera" size={24} color={Colors.white} />
                    </View>
                  </View>
                </View>

                {/* Full Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <BlurView intensity={40} style={styles.inputBlur}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                      placeholder="Enter your full name"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      maxLength={50}
                      autoCapitalize="words"
                      selectionColor={Colors.primary}
                    />
                  </BlurView>
                </View>

                {/* Username Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Username *</Text>
                  <BlurView intensity={40} style={styles.inputBlur}>
                    <View style={styles.usernameInputContainer}>
                      <Text style={styles.usernamePrefix}>@</Text>
                      <TextInput
                        style={styles.usernameInput}
                        value={formData.username}
                        onChangeText={handleUsernameChange}
                        placeholder="choose_username"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        maxLength={30}
                        autoCapitalize="none"
                        autoCorrect={false}
                        selectionColor={Colors.primary}
                      />
                    </View>
                  </BlurView>
                  {renderUsernameStatus()}
                  <Text style={styles.helperText}>
                    Username can only contain letters, numbers, and underscores
                  </Text>
                </View>

                {/* Continue Button */}
                <TouchableOpacity 
                  style={[
                    styles.continueButton,
                    (!formData.name.trim() || !formData.username.trim() || usernameAvailable === false || isLoading) && styles.continueButtonDisabled
                  ]}
                  onPress={handleComplete}
                  disabled={!formData.name.trim() || !formData.username.trim() || usernameAvailable === false || isLoading}
                >
                  <LinearGradient
                    colors={(!formData.name.trim() || !formData.username.trim() || usernameAvailable === false || isLoading) 
                      ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] 
                      : [Colors.white, 'rgba(255,255,255,0.9)']}
                    style={styles.continueButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Text style={[
                          styles.continueButtonText,
                          (!formData.name.trim() || !formData.username.trim() || usernameAvailable === false) && styles.continueButtonTextDisabled
                        ]}>
                          Complete Setup
                        </Text>
                        <Ionicons 
                          name="arrow-forward" 
                          size={20} 
                          color={(!formData.name.trim() || !formData.username.trim() || usernameAvailable === false) ? 'rgba(255,255,255,0.5)' : Colors.primary} 
                        />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  logoBlur: {
    borderRadius: BorderRadius.xl,
  },
  logoGlassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
    minHeight: 100,
  },
  logo: {
    width: 240,
    height: 70,
    tintColor: Colors.white,
  },
  welcomeTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: FontSize.lg,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 400,
  },
  formContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  formContent: {
    padding: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  profilePhotoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    ...Shadows.medium,
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  inputBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  textInput: {
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
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.lg,
    minHeight: 50,
  },
  usernamePrefix: {
    fontSize: FontSize.md,
    color: Colors.white,
    paddingLeft: Spacing.lg,
    fontWeight: FontWeight.medium,
  },
  usernameInput: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  usernameStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
    gap: Spacing.xs,
  },
  usernameStatusText: {
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  helperText: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  continueButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.lg,
    ...Shadows.medium,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  continueButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  continueButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default WelcomeScreen; 