import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../contexts/LocationContext';
import { LiveLocationService } from '../../services/liveLocationService';
import {
  LocationSharingLevel,
  LocationShareSettings,
  LocationSharingProps,
} from '../../types';

const SHARING_LEVELS = [
  {
    level: LocationSharingLevel.PRIVATE,
    title: 'Private',
    description: 'Your location is not shared with anyone',
    icon: 'lock-closed',
    color: '#666',
  },
  {
    level: LocationSharingLevel.FRIENDS_ONLY,
    title: 'Friends Only',
    description: 'Only your friends can see your location',
    icon: 'people',
    color: '#4CAF50',
  },
  {
    level: LocationSharingLevel.EVENT_ONLY,
    title: 'Event Participants',
    description: 'Only people at the same event can see your location',
    icon: 'calendar',
    color: '#2196F3',
  },
  {
    level: LocationSharingLevel.PUBLIC,
    title: 'Public',
    description: 'Anyone using MeetOn can see your location',
    icon: 'globe',
    color: '#FF9800',
  },
];

const TIME_OPTIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: 'Until I turn it off', minutes: null },
];

export function LocationSharingComponent({ currentUser, onSharingChange }: LocationSharingProps) {
  const {
    permissionStatus,
    sharingSettings,
    isSharing,
    sharingTimeRemaining,
    isLocationTracking,
    batteryLevel,
    batteryOptimized,
    requestPermission,
    updateSharingSettings,
    stopSharing,
    connectWebSocket,
  } = useLocation();

  const [selectedLevel, setSelectedLevel] = useState<LocationSharingLevel>(sharingSettings.sharingLevel);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTimeOptions, setShowTimeOptions] = useState(false);

  useEffect(() => {
    setSelectedLevel(sharingSettings.sharingLevel);
  }, [sharingSettings.sharingLevel]);

  const handleStartSharing = async () => {
    if (!permissionStatus.granted) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to share your location with others.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    if (selectedLevel === LocationSharingLevel.PRIVATE) {
      Alert.alert(
        'Select Sharing Level',
        'Please select who can see your location before starting to share.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);

    try {
      const settings: LocationShareSettings = {
        sharingLevel: selectedLevel,
        sharingExpiresAt: selectedDuration 
          ? new Date(Date.now() + selectedDuration * 60 * 1000)
          : undefined,
      };

      const success = await updateSharingSettings(settings);

      if (success) {
        // Connect to WebSocket for real-time updates
        await connectWebSocket();
        
        onSharingChange?.(settings);
        
        Alert.alert(
          'Location Sharing Started',
          `Your location is now being shared with ${LiveLocationService.formatSharingLevel(selectedLevel).toLowerCase()}.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Failed to Start Sharing',
          'There was an error starting location sharing. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error starting location sharing:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSharing = async () => {
    Alert.alert(
      'Stop Location Sharing',
      'Are you sure you want to stop sharing your location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Sharing',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            const success = await stopSharing();
            
            if (success) {
              setSelectedLevel(LocationSharingLevel.PRIVATE);
              onSharingChange?.({ sharingLevel: LocationSharingLevel.PRIVATE });
            }
            
            setIsLoading(false);
          },
        },
      ]
    );
  };

  const handleLevelSelect = (level: LocationSharingLevel) => {
    setSelectedLevel(level);
    if (level !== LocationSharingLevel.PRIVATE && !showTimeOptions) {
      setShowTimeOptions(true);
    } else if (level === LocationSharingLevel.PRIVATE) {
      setShowTimeOptions(false);
    }
  };

  const handleDurationSelect = (minutes: number | null) => {
    setSelectedDuration(minutes);
    setShowTimeOptions(false);
  };

  const renderSharingLevel = (option: typeof SHARING_LEVELS[0]) => {
    const isSelected = selectedLevel === option.level;
    const isCurrentlyActive = isSharing && sharingSettings.sharingLevel === option.level;

    return (
      <TouchableOpacity
        key={option.level}
        style={[
          styles.levelOption,
          isSelected && styles.levelOptionSelected,
          isCurrentlyActive && styles.levelOptionActive,
        ]}
        onPress={() => handleLevelSelect(option.level)}
        disabled={isLoading}
      >
        <View style={styles.levelHeader}>
          <Ionicons
            name={option.icon as any}
            size={24}
            color={isSelected || isCurrentlyActive ? '#fff' : option.color}
          />
          <View style={styles.levelInfo}>
            <Text style={[
              styles.levelTitle,
              (isSelected || isCurrentlyActive) && styles.levelTitleSelected,
            ]}>
              {option.title}
            </Text>
            <Text style={[
              styles.levelDescription,
              (isSelected || isCurrentlyActive) && styles.levelDescriptionSelected,
            ]}>
              {option.description}
            </Text>
          </View>
          {isCurrentlyActive && (
            <View style={styles.activeIndicator}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTimeOptions = () => {
    if (!showTimeOptions) return null;

    return (
      <View style={styles.timeOptionsContainer}>
        <Text style={styles.timeOptionsTitle}>How long would you like to share?</Text>
        {TIME_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.timeOption,
              selectedDuration === option.minutes && styles.timeOptionSelected,
            ]}
            onPress={() => handleDurationSelect(option.minutes)}
          >
            <Text style={[
              styles.timeOptionText,
              selectedDuration === option.minutes && styles.timeOptionTextSelected,
            ]}>
              {option.label}
            </Text>
            {selectedDuration === option.minutes && (
              <Ionicons name="checkmark" size={20} color="#2196F3" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSharingStatus = () => {
    if (!isSharing) return null;

    return (
      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Ionicons name="location" size={20} color="#4CAF50" />
          <Text style={styles.statusTitle}>Location Sharing Active</Text>
        </View>
        
        <Text style={styles.statusLevel}>
          Sharing with: {LiveLocationService.formatSharingLevel(sharingSettings.sharingLevel)}
        </Text>
        
        {sharingTimeRemaining && (
          <Text style={styles.statusTime}>
            Time remaining: {sharingTimeRemaining}
          </Text>
        )}
        
        <View style={styles.statusDetails}>
          <View style={styles.statusDetail}>
            <Ionicons name="pulse" size={16} color="#666" />
            <Text style={styles.statusDetailText}>
              Tracking: {isLocationTracking ? 'Active' : 'Inactive'}
            </Text>
          </View>
          
          {batteryLevel !== null && (
            <View style={styles.statusDetail}>
              <Ionicons 
                name={batteryOptimized ? "battery-half" : "battery-full"} 
                size={16} 
                color={batteryOptimized ? "#FF9800" : "#666"} 
              />
              <Text style={styles.statusDetailText}>
                Battery: {Math.round(batteryLevel * 100)}%
                {batteryOptimized && ' (Optimized)'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Ionicons name="location-outline" size={32} color="#2196F3" />
        <Text style={styles.title}>Location Sharing</Text>
        <Text style={styles.subtitle}>
          Control who can see your location and for how long
        </Text>
      </View>

      {renderSharingStatus()}

      <View style={styles.levelsContainer}>
        <Text style={styles.sectionTitle}>Who can see your location?</Text>
        {SHARING_LEVELS.map(renderSharingLevel)}
      </View>

      {renderTimeOptions()}

      <View style={styles.actionsContainer}>
        {!isSharing ? (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (selectedLevel === LocationSharingLevel.PRIVATE || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleStartSharing}
            disabled={selectedLevel === LocationSharingLevel.PRIVATE || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.buttonText}>Start Sharing</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.dangerButton, isLoading && styles.buttonDisabled]}
            onPress={handleStopSharing}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="stop" size={20} color="#fff" />
                <Text style={styles.buttonText}>Stop Sharing</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#666" />
        <Text style={styles.infoText}>
          Your location data is encrypted and only shared with the people you choose. 
          You can stop sharing at any time.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  statusContainer: {
    backgroundColor: '#e8f5e8',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2e7d32',
    marginLeft: 8,
  },
  statusLevel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  statusTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statusDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  levelsContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  levelOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  levelOptionSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  levelOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  levelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  levelTitleSelected: {
    color: '#fff',
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  levelDescriptionSelected: {
    color: '#fff',
    opacity: 0.9,
  },
  activeIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeOptionsContainer: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  timeOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
  },
  timeOptionTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  actionsContainer: {
    margin: 16,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  dangerButton: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 8,
  },
}); 