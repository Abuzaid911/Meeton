import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../../constants';

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const legalTextAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Tagline entrance
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
      // Button entrance
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay: 200,
        useNativeDriver: true,
      }),
      // Legal text entrance
      Animated.timing(legalTextAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Complex logo animations
    const createLogoAnimations = () => {
      // Gentle rotation animation
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 20000, // 20 seconds for full rotation
          useNativeDriver: true,
        })
      );

      // Floating animation (up and down)
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      );

      // Breathing pulse animation (more sophisticated)
      const breathingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      // Glow intensity animation
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 4000,
            useNativeDriver: false, // shadowOpacity doesn't support native driver
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 4000,
            useNativeDriver: false,
          }),
        ])
      );

      return {
        rotateAnimation,
        floatAnimation,
        breathingAnimation,
        glowAnimation,
      };
    };
    
    // Start logo animations after initial entrance
    setTimeout(() => {
      const animations = createLogoAnimations();
      animations.rotateAnimation.start();
      animations.floatAnimation.start();
      animations.breathingAnimation.start();
      animations.glowAnimation.start();
    }, 1500);

    return () => {
      // Cleanup would be handled here
    };
  }, []);

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
      
      <LinearGradient
        colors={['#000000', '#121212', '#000000']}
        style={styles.background}
      >
        {/* Decorative Curves and Light Effects */}
        <View style={styles.curvedOverlay}>
          <LinearGradient
            colors={['rgba(30,64,255,0.02)', 'rgba(65,105,225,0.04)', 'rgba(30,64,255,0.02)']}
            style={styles.curve1}
          />
          <LinearGradient
            colors={['rgba(111,66,193,0.03)', 'rgba(138,43,226,0.05)', 'rgba(111,66,193,0.03)']}
            style={styles.curve2}
          />
          <View style={styles.lightReflection1} />
          <View style={styles.lightReflection2} />
        </View>

        <View style={styles.content}>
          {/* Animated Logo */}
          <View style={styles.header}>
            <Animated.View style={[
              styles.logoContainer,
              {
                shadowOpacity: glowAnim, // Non-native driver animation
              }
            ]}>
              <Animated.View style={{
                opacity: fadeAnim,
                transform: [
                  { scale: Animated.multiply(scaleAnim, pulseAnim) },
                  { 
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    })
                  },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  },
                ]
              }}>
                <Animated.View style={{
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-360deg'], // Counter-rotate the logo itself
                      })
                    }
                  ]
                }}>
                  <Image 
                    source={require('../../../assets/meetlogo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </View>

          {/* Enhanced Animated Tagline */}
          <Animated.View style={[
            styles.taglineContainer,
            {
              opacity: taglineAnim,
              transform: [
                {
                  translateY: taglineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  })
                }
              ]
            }
          ]}>
            <BlurView intensity={15} tint="dark" style={styles.taglineBlur}>
              <View style={styles.taglineContent}>
                <Text style={styles.taglineMain}>Right Place, Right Time, Every Time</Text>
              </View>
            </BlurView>
          </Animated.View>

          {/* Animated Google Sign In Button */}
          <Animated.View style={{
            opacity: buttonAnim,
            transform: [
              {
                scale: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })
              }
            ]
          }}>
            <TouchableOpacity 
              style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading}
              activeOpacity={0.8}
            >
              <BlurView intensity={10} tint="dark" style={styles.googleButtonBlur}>
                <View style={styles.googleButtonContent}>
                  <View style={styles.googleIconContainer}>
                    <Image 
                      source={require('../../../assets/googlelogo1.png')} 
                      style={styles.googleIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.googleButtonText}>
                    {isGoogleLoading ? 'Loading...' : 'Sign in with Google'}
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>

          {/* Legal Links */}
          <Animated.View style={[
            styles.legalContainer,
            {
              opacity: legalTextAnim,
              transform: [
                {
                  translateY: legalTextAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })
                }
              ]
            }
          ]}>
            <TouchableOpacity>
              <Text style={styles.legalText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity>
              <Text style={styles.legalText}>Terms of Service</Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    flex: 1,
    width,
    height,
  },
  curvedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  curve1: {
    position: 'absolute',
    top: -100,
    left: -50,
    right: -50,
    height: 300,
    borderRadius: 200,
    transform: [{ rotate: '15deg' }],
  },
  curve2: {
    position: 'absolute',
    top: height * 0.6,
    left: -100,
    right: -100,
    height: 400,
    borderRadius: 250,
    transform: [{ rotate: '-10deg' }],
  },
  lightReflection1: {
    position: 'absolute',
    top: height * 0.1,
    right: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(65,105,225,0.03)',
    transform: [{ rotate: '25deg' }],
  },
  lightReflection2: {
    position: 'absolute',
    bottom: height * 0.15,
    left: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(138,43,226,0.03)',
    transform: [{ rotate: '-15deg' }],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: height * 0.1,
    paddingBottom: height * 0.15,
  },
  header: {
    alignItems: 'center',
    marginBottom: height * 0.08,
  },
  logoContainer: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    // Enhanced glow effect for better visibility
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 15,
    // Add background circle for more prominence
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  logo: {
    width: 180,
    height: 180,
    // Full opacity for maximum visibility
    opacity: 1,
    tintColor: '#ffffff',
  },

  // Enhanced tagline styles
  taglineContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: height * 0.12,
    width: width * 0.85,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  taglineBlur: {
    borderRadius: 24,
  },
  taglineContent: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  taglineMain: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 36,
  },

  googleButton: {
    width: width * 0.8,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  googleButtonBlur: {
    borderRadius: 30,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: Spacing.md,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  
  // Legal links at bottom
  legalContainer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  legalSeparator: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 8,
  }
});

export default LoginScreen;
