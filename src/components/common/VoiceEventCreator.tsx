import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { VoiceEventCreatorProps, VoiceRecordingState } from '../../types';
import { VoiceEventService } from '../../services/voiceEventService';
import { ENV } from '../../config/env';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../../constants';

const { width } = Dimensions.get('window');

const VoiceEventCreator: React.FC<VoiceEventCreatorProps> = ({
  onEventDataParsed,
  onError,
  onTranscriptionReceived,
}) => {
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    uri: undefined,
  });
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [lastError, setLastError] = useState<string>('');

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Check if voice features are enabled and configured
  const isVoiceEnabled = ENV.ENABLE_VOICE_EVENTS && VoiceEventService.isConfigured();

  // Initialize audio session on component mount
  useEffect(() => {
    const initializeAudioSession = async () => {
      try {
        console.log('🎤 Initializing audio session...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false, // Start with false, enable when recording
        });
        console.log('✅ Audio session initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize audio session:', error);
      }
    };

    if (isVoiceEnabled) {
      initializeAudioSession();
    }
  }, [isVoiceEnabled]);

  useEffect(() => {
    if (recordingState.isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start wave animation
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        })
      ).start();

      // Start duration counter
      durationRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);
    } else {
      // Stop animations
      pulseAnim.stopAnimation();
      waveAnim.stopAnimation();
      waveAnim.setValue(0);
      
      // Clear duration counter
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    }

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
      }
    };
  }, [recordingState.isRecording, pulseAnim, waveAnim]);

  // Cleanup recording on component unmount
  useEffect(() => {
    return () => {
      if (recording && recordingState.isRecording) {
        console.log('🧹 Cleaning up active recording on unmount...');
        recording.stopAndUnloadAsync().catch((error) => {
          // Ignore "already unloaded" errors as they're harmless
          if (!error.message?.includes('already been unloaded')) {
            console.error('Error cleaning up recording:', error);
          }
        });
      }
    };
  }, [recording, recordingState.isRecording]);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Permission Required',
          'Please grant microphone permission to use voice commands for creating events.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {/* Could open app settings if needed */} },
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting microphone permissions:', error);
      return false;
    }
  };

  const startRecording = async () => {
    try {
      // Clear any previous errors
      setLastError('');
      
      // Check permissions first
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      console.log('🎤 Configuring audio session...');
      
      // Configure audio session with proper settings for foreground recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true, // Keep active for recording
      });

      // Small delay to ensure audio session is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('🎤 Creating recording instance...');

      // Use the high quality preset which works reliably
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        1000 // Update interval in milliseconds
      );

      setRecording(newRecording);
      setRecordingState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        uri: undefined,
      });
      setTranscriptionText('');

      console.log('🎤 Voice recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      // Check for specific background audio session error
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      let userFriendlyError: string;
      if (errorMessage.includes('background') || errorMessage.includes('audio session could not be activated')) {
        userFriendlyError = 'Audio session error. Please ensure the app is in the foreground and try again.';
      } else if (errorMessage.includes('permission')) {
        userFriendlyError = 'Microphone permission denied. Please enable microphone access in Settings.';
      } else {
        userFriendlyError = 'Failed to start recording. Please try again.';
      }
      
      setLastError(userFriendlyError);
      onError?.(userFriendlyError);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      console.log('🛑 Stopping voice recording...');
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        uri: uri || undefined,
      }));

      setRecording(null);

      if (uri) {
        console.log('📁 Recording saved to:', uri);
        await processVoiceRecording(uri);
      } else {
        onError?.('Failed to save recording. Please try again.');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      onError?.('Failed to stop recording. Please try again.');
    }
  };

  const processVoiceRecording = async (audioUri: string) => {
    try {
      setIsProcessing(true);
      setTranscriptionText('Processing your voice command...');
      console.log('🔄 Processing voice recording...');

      // Process the audio and extract event data
      const eventData = await VoiceEventService.processVoiceToEvent(audioUri);
      
      // Set success message
      setTranscriptionText('✅ Event details extracted successfully!');
      
      // Call the callback with parsed event data
      onEventDataParsed(eventData);
      
      console.log('✅ Voice processing completed successfully');
    } catch (error) {
      console.error('Voice processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process voice command';
      setTranscriptionText('❌ ' + errorMessage);
      onError?.(errorMessage);
      
      // Reset state after error
      setTimeout(() => {
        setTranscriptionText('');
        setRecordingState(prev => ({
          ...prev,
          uri: undefined,
        }));
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetAudioSession = async () => {
    try {
      console.log('🔄 Resetting audio session...');
      setLastError('');
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Reinitialize for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      
      console.log('✅ Audio session reset successfully');
    } catch (error) {
      console.error('❌ Failed to reset audio session:', error);
    }
  };

  const showExampleCommands = () => {
    const examples = VoiceEventService.getExampleCommands();
    const tips = VoiceEventService.getVoiceTips();
    
    Alert.alert(
      '🎤 Voice Command Examples',
      `Examples:\n${examples.slice(0, 3).map((cmd, index) => `${index + 1}. "${cmd}"`).join('\n\n')}\n\n` +
      `💡 Tips:\n${tips.map(tip => `• ${tip}`).join('\n')}`,
      [{ text: 'Got it!', style: 'default' }]
    );
  };

  if (!isVoiceEnabled) {
    return (
      <View style={styles.disabledContainer}>
        <BlurView intensity={80} style={styles.disabledBlur}>
          <Ionicons name="mic-off" size={24} color="rgba(255, 255, 255, 0.5)" />
          <Text style={styles.disabledText}>Voice Commands Unavailable</Text>
          <Text style={styles.disabledSubtext}>
            {!ENV.ENABLE_VOICE_EVENTS 
              ? 'Voice features are disabled' 
              : 'OpenAI API key required in environment'}
          </Text>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={100} style={styles.blurContainer}>
        <LinearGradient
          colors={['rgba(124, 58, 237, 0.15)', 'rgba(147, 51, 234, 0.1)']}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="mic" size={20} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.title}>AI Voice Creator</Text>
            </View>
            <TouchableOpacity onPress={showExampleCommands} style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          </View>

          {/* Recording Status */}
          {(recordingState.isRecording || isProcessing) && (
            <View style={styles.statusContainer}>
              {recordingState.isRecording && (
                <>
                  <Animated.View style={[styles.waveContainer, { opacity: waveAnim }]}>
                    <View style={[styles.wave, styles.wave1]} />
                    <View style={[styles.wave, styles.wave2]} />
                    <View style={[styles.wave, styles.wave3]} />
                    <View style={[styles.wave, styles.wave4]} />
                    <View style={[styles.wave, styles.wave5]} />
                  </Animated.View>
                  <Text style={styles.statusText}>🎤 Listening...</Text>
                  <Text style={styles.durationText}>{formatDuration(recordingState.duration)}</Text>
                </>
              )}
              
              {isProcessing && (
                <>
                  <View style={styles.processingContainer}>
                    <Ionicons name="cloud-upload" size={24} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <Text style={styles.statusText}>🧠 Processing with AI...</Text>
                </>
              )}
            </View>
          )}

          {/* Transcription Display */}
          {transcriptionText && (
            <View style={styles.transcriptionContainer}>
              <Text style={styles.transcriptionText}>{transcriptionText}</Text>
            </View>
          )}

          {/* Main Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              recordingState.isRecording && styles.recordingButton,
              isProcessing && styles.processingButton,
            ]}
            onPress={recordingState.isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Animated.View style={[
              styles.buttonContent, 
              { transform: [{ scale: recordingState.isRecording ? pulseAnim : 1 }] }
            ]}>
              <Ionicons
                name={
                  isProcessing 
                    ? "cloud-upload" 
                    : recordingState.isRecording 
                      ? "stop" 
                      : "mic"
                }
                size={32}
                color={Colors.white}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Action Text */}
          <Text style={styles.actionText}>
            {isProcessing 
              ? "AI is processing your voice..." 
              : recordingState.isRecording 
                ? "Tap to stop & create event" 
                : "Tap to start voice command"}
          </Text>

          {/* Error Recovery */}
          {lastError && lastError.includes('Audio session') && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{lastError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={resetAudioSession}
                activeOpacity={0.8}
              >
                <BlurView intensity={80} style={styles.retryButtonBlur}>
                  <View style={styles.retryButtonContent}>
                    <Ionicons name="refresh" size={16} color={Colors.white} />
                    <Text style={styles.retryButtonText}>Reset Audio Session</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            </View>
          )}

          {/* Hint Text */}
          {!recordingState.isRecording && !isProcessing && !transcriptionText && !lastError && (
            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                💡 Try saying: "Create a birthday party tomorrow at 7 PM"
              </Text>
              <Text style={styles.hintSubtext}>
                Speak naturally - AI will understand dates, times, and locations
              </Text>
            </View>
          )}
        </LinearGradient>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  blurContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradient: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: Spacing.sm,
  },
  helpButton: {
    padding: Spacing.xs,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginBottom: Spacing.sm,
  },
  wave: {
    width: 3,
    backgroundColor: 'rgba(124, 58, 237, 0.8)',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  wave1: { height: 15 },
  wave2: { height: 25 },
  wave3: { height: 35 },
  wave4: { height: 20 },
  wave5: { height: 30 },
  processingContainer: {
    marginBottom: Spacing.sm,
  },
  statusText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.xs,
  },
  durationText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  transcriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  transcriptionText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124, 58, 237, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recordingButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  processingButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  hintContainer: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  hintText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  hintSubtext: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disabledContainer: {
    marginVertical: Spacing.md,
  },
  disabledBlur: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    opacity: 0.6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabledText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  disabledSubtext: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 100, 100, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  retryButtonBlur: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  retryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  retryButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.white,
    marginLeft: Spacing.xs,
  },
});

export default VoiceEventCreator; 