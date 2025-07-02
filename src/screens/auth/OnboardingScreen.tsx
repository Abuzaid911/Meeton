import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';

const { width, height } = Dimensions.get('window');

const INTERESTS_OPTIONS = [
  'Technology', 'Music', 'Food', 'Photography', 'Sports', 'Travel',
  'Art', 'Books', 'Gaming', 'Movies', 'Fitness', 'Nature',
  'Cooking', 'Dancing', 'Networking', 'Learning', 'Parties', 'Business'
];

const OnboardingScreen: React.FC = () => {
  const { completeOnboarding, user } = useAuth();
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInterestToggle = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else if (selectedInterests.length < 6) {
      setSelectedInterests([...selectedInterests, interest]);
    } else {
      Alert.alert('Limit Reached', 'You can select up to 6 interests');
    }
  };

  const handleComplete = async () => {
    if (selectedInterests.length === 0) {
      Alert.alert('Select Interests', 'Please select at least one interest to continue');
      return;
    }

    setIsLoading(true);
    const result = await completeOnboarding({
      interests: selectedInterests,
      bio: bio.trim() || undefined,
      location: location.trim() || undefined,
    });
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to complete onboarding');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop' }}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        {/* Dark overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
          style={styles.overlay}
        />

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeText}>Welcome to MeetOn!</Text>
                <Text style={styles.userNameText}>Hi {user?.name}! 👋</Text>
              </View>
              <Text style={styles.subtitle}>
                Let's personalize your experience by setting up your profile
              </Text>
            </View>

            {/* Onboarding Form */}
            <View style={styles.formContainer}>
              <BlurView intensity={100} tint="dark" style={styles.formBlur}>
                <View style={styles.formContent}>
                  
                  {/* Interests Section */}
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="heart" size={18} color={Colors.primary} />
                      <Text style={styles.sectionTitle}>
                        Select Your Interests ({selectedInterests.length}/6)
                      </Text>
                    </View>
                    <Text style={styles.sectionDescription}>
                      Choose topics you're passionate about to help us recommend relevant events
                    </Text>
                    
                    <View style={styles.interestsGrid}>
                      {INTERESTS_OPTIONS.map((interest) => (
                        <TouchableOpacity
                          key={interest}
                          style={[
                            styles.interestChip,
                            selectedInterests.includes(interest) && styles.interestChipSelected,
                          ]}
                          onPress={() => handleInterestToggle(interest)}
                        >
                          <Text style={[
                            styles.interestChipText,
                            selectedInterests.includes(interest) && styles.interestChipTextSelected,
                          ]}>
                            {interest}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Bio Section */}
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="person" size={18} color={Colors.primary} />
                      <Text style={styles.sectionTitle}>Bio (Optional)</Text>
                    </View>
                    <BlurView intensity={80} style={styles.inputBlur}>
                      <TextInput
                        style={styles.textAreaInput}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Tell others about yourself..."
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                      />
                    </BlurView>
                    <Text style={styles.characterCount}>{bio.length}/200</Text>
                  </View>

                  {/* Location Section */}
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="location" size={18} color={Colors.primary} />
                      <Text style={styles.sectionTitle}>Location (Optional)</Text>
                    </View>
                    <BlurView intensity={80} style={styles.inputBlur}>
                      <TextInput
                        style={styles.textInput}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="e.g., San Francisco, CA"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        maxLength={50}
                      />
                    </BlurView>
                  </View>

                  {/* Complete Button */}
                  <TouchableOpacity 
                    style={[styles.completeButton, isLoading && styles.completeButtonDisabled]}
                    onPress={handleComplete}
                    disabled={isLoading || selectedInterests.length === 0}
                  >
                    <BlurView intensity={100} style={styles.completeButtonBlur}>
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.completeButtonGradient}
                      >
                        <Text style={styles.completeButtonText}>
                          {isLoading ? 'Setting Up...' : 'Complete Setup'}
                        </Text>
                        {!isLoading && (
                          <Ionicons name="checkmark" size={20} color={Colors.white} />
                        )}
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  background: {
    flex: 1,
    width,
    height,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  welcomeText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  userNameText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  formContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  formBlur: {
    borderRadius: 20,
  },
  formContent: {
    padding: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionContainer: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  sectionDescription: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  interestChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  interestChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  interestChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  interestChipTextSelected: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  inputBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.white,
    minHeight: 50,
  },
  textAreaInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  completeButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.lg,
    ...Shadows.medium,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonBlur: {
    borderRadius: BorderRadius.lg,
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  completeButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});

export default OnboardingScreen; 