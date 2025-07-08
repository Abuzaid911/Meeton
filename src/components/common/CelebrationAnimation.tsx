import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../../constants';

const { width, height } = Dimensions.get('window');

interface CelebrationAnimationProps {
  visible: boolean;
  onComplete: () => void;
  title?: string;
  subtitle?: string;
  eventType?: string;
}

const CelebrationAnimation: React.FC<CelebrationAnimationProps> = ({
  visible,
  onComplete,
  title = "🎉 Event Created!",
  subtitle = "Your amazing event is ready to share",
  eventType = 'party'
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  // Confetti animations
  const confetti = useRef(
    Array.from({ length: 20 }, () => ({
      translateY: new Animated.Value(-100),
      translateX: new Animated.Value(Math.random() * width),
      rotate: new Animated.Value(0),
      scale: new Animated.Value(0.5 + Math.random() * 0.5),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      startCelebration();
    } else {
      resetAnimations();
    }
  }, [visible]);

  const startCelebration = () => {
    // Main modal animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Checkmark animation with delay
    setTimeout(() => {
      Animated.sequence([
        Animated.spring(checkmarkScale, {
          toValue: 1.2,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);

    // Bounce animation for the container
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      ).start();
    }, 500);

    // Confetti animation
    confetti.forEach((particle, index) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(particle.translateY, {
            toValue: height + 100,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.rotate, {
            toValue: 720 + Math.random() * 360,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]).start();
      }, index * 100);
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      onComplete();
    }, 4000);
  };

  const resetAnimations = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.3);
    checkmarkScale.setValue(0);
    bounceAnim.setValue(0);
    confetti.forEach(particle => {
      particle.translateY.setValue(-100);
      particle.rotate.setValue(0);
    });
  };

  const getEventTypeEmoji = (type: string): string => {
    const emojis = {
      birthday: '🎂',
      party: '🎉',
      networking: '🤝',
      sports: '⚽',
      food: '🍽️',
      other: '✨'
    };
    return emojis[type as keyof typeof emojis] || '✨';
  };

  const getEventTypeColors = (type: string): string[] => {
    const colorSets = {
      birthday: ['#FF6B9D', '#FFE066', '#FF8E9B'],
      party: ['#A8EDEA', '#FAD0C4', '#FFD1DC'],
      networking: ['#4ECDC4', '#44A08D', '#5CB3CC'],
      sports: ['#96CEB4', '#FFECD2', '#A8E6CF'],
      food: ['#FFB75E', '#ED8F03', '#FFA726'],
      other: ['#667eea', '#764ba2', '#8B7ED8']
    };
    return colorSets[type as keyof typeof colorSets] || colorSets.other;
  };

  if (!visible) return null;

  const eventEmoji = getEventTypeEmoji(eventType);
  const gradientColors = getEventTypeColors(eventType);

  return (
    <View style={styles.container}>
      {/* Confetti Layer */}
      <View style={styles.confettiContainer}>
        {confetti.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confettiPiece,
              {
                transform: [
                  { translateX: particle.translateX },
                  { translateY: particle.translateY },
                  { rotate: particle.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg']
                  }) },
                  { scale: particle.scale }
                ],
                backgroundColor: gradientColors[index % gradientColors.length],
              }
            ]}
          />
        ))}
      </View>

      {/* Main Content */}
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          onPress={onComplete}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.celebrationCard,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateY: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10]
                  }) }
                ]
              }
            ]}
          >
            <BlurView intensity={100} style={styles.cardBlur}>
                             <LinearGradient
                 colors={[gradientColors[0], gradientColors[1], 'rgba(255,255,255,0.1)']}
                 style={styles.cardGradient}
               >
                {/* Success Icon */}
                <Animated.View
                  style={[
                    styles.iconContainer,
                    {
                      transform: [{ scale: checkmarkScale }]
                    }
                  ]}
                >
                  <View style={styles.checkmarkCircle}>
                    <Ionicons name="checkmark" size={40} color={Colors.white} />
                  </View>
                </Animated.View>

                {/* Event Type Emoji */}
                <Text style={styles.eventEmoji}>{eventEmoji}</Text>

                {/* Title and Subtitle */}
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={onComplete}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={60} style={styles.buttonBlur}>
                      <View style={styles.buttonContent}>
                        <Ionicons name="share-social" size={18} color={Colors.white} />
                        <Text style={styles.buttonText}>Share Event</Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={onComplete}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={60} style={styles.buttonBlur}>
                      <View style={styles.buttonContent}>
                        <Ionicons name="eye" size={18} color="rgba(255, 255, 255, 0.8)" />
                        <Text style={[styles.buttonText, styles.secondaryButtonText]}>View Event</Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                </View>

                {/* Tap to dismiss hint */}
                <Text style={styles.dismissHint}>Tap anywhere to continue</Text>
              </LinearGradient>
            </BlurView>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  celebrationCard: {
    width: width * 0.85,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cardBlur: {
    borderRadius: BorderRadius.xl,
  },
  cardGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  eventEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  secondaryButton: {
    opacity: 0.8,
  },
  buttonBlur: {
    borderRadius: BorderRadius.lg,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: Spacing.sm,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dismissHint: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CelebrationAnimation; 