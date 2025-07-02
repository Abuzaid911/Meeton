import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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

const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);





  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const result = await signInWithGoogle();
    setIsGoogleLoading(false);

    if (!result.success) {
      Alert.alert('Google Sign In Failed', result.error || 'Authentication failed');
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop' }}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        {/* Dark overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
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
              <View style={styles.logoContainer}>
                <BlurView intensity={60} style={styles.logoBlur}>
                  <View style={styles.logoContent}>
                    <Ionicons name="calendar" size={32} color={Colors.white} />
                  </View>
                </BlurView>
              </View>
              <Text style={styles.title}>Welcome to MeetOn</Text>
              <Text style={styles.subtitle}>Connect with friends and create amazing events together</Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              <BlurView intensity={100} tint="dark" style={styles.formBlur}>
                <View style={styles.formContent}>


                  {/* Enhanced Google Sign In Button */}
                  <TouchableOpacity 
                    style={[styles.googleButton, isGoogleLoading && styles.loginButtonDisabled]}
                    onPress={handleGoogleLogin}
                    disabled={isGoogleLoading}
                  >
                    <BlurView intensity={100} style={styles.googleButtonBlur}>
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                        style={styles.googleButtonGradient}
                      >
                        <View style={styles.googleIconContainer}>
                          <Ionicons name="logo-google" size={24} color="#4285F4" />
                        </View>
                        <Text style={styles.googleButtonText}>
                          {isGoogleLoading ? 'Signing In...' : 'Continue with Google'}
                        </Text>
                        {!isGoogleLoading && (
                          <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
                        )}
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>

                  {/* Security & Privacy Notice */}
                  <View style={styles.privacyNotice}>
                    <Ionicons name="shield-checkmark" size={16} color={Colors.systemGreen} />
                    <Text style={styles.privacyText}>
                      We protect your privacy and never share your personal information
                    </Text>
                  </View>




                </View>
              </BlurView>
            </View>

            {/* Additional Features */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Join thousands of event creators</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="calendar" size={20} color={Colors.primary} />
                  <Text style={styles.featureText}>Create and manage events easily</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="people" size={20} color={Colors.primary} />
                  <Text style={styles.featureText}>Connect with friends and communities</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="notifications" size={20} color={Colors.primary} />
                  <Text style={styles.featureText}>Stay updated with smart notifications</Text>
                </View>
              </View>
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoBlur: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  logoContent: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
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
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 50,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  passwordToggle: {
    paddingHorizontal: Spacing.md,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: Spacing.xl,
  },
  forgotPasswordText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  loginButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonBlur: {
    borderRadius: BorderRadius.lg,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  loginButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  googleButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  googleButtonBlur: {
    borderRadius: BorderRadius.lg,
  },
  googleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.black,
    flex: 1,
    textAlign: 'center',
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  privacyText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    flex: 1,
    lineHeight: 18,
  },
  featuresContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  featuresTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  featuresList: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: Spacing.lg,
    fontWeight: FontWeight.medium,
  },

  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  signUpLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
});

export default LoginScreen; 