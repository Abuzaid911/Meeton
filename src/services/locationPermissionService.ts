import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import { LocationPermissionStatus, DeviceLocation } from '../types';

/**
 * Location Permission Service
 * Handles device location permissions and location retrieval
 */
export class LocationPermissionService {
  private static currentWatchSubscription: Location.LocationSubscription | null = null;
  private static lastKnownLocation: DeviceLocation | null = null;
  private static locationUpdateCallbacks: Set<(location: DeviceLocation) => void> = new Set();

  /**
   * Check current location permission status
   */
  static async checkPermissionStatus(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('Failed to check location permission status:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Request location permission
   */
  static async requestPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      const permissionStatus: LocationPermissionStatus = {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };

      // If permission denied and can't ask again, show settings alert
      if (!permissionStatus.granted && !permissionStatus.canAskAgain) {
        this.showPermissionDeniedAlert();
      }

      return permissionStatus;
    } catch (error) {
      console.error('Failed to request location permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Request background location permission (for continuous tracking)
   */
  static async requestBackgroundPermission(): Promise<LocationPermissionStatus> {
    try {
      // First ensure we have foreground permission
      const foregroundStatus = await this.checkPermissionStatus();
      if (!foregroundStatus.granted) {
        const requestResult = await this.requestPermission();
        if (!requestResult.granted) {
          return requestResult;
        }
      }

      // Request background permission
      const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();
      
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('Failed to request background location permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Get current location (one-time)
   */
  static async getCurrentLocation(options: {
    accuracy?: Location.Accuracy;
    timeout?: number;
  } = {}): Promise<DeviceLocation | null> {
    try {
      const permissionStatus = await this.checkPermissionStatus();
      if (!permissionStatus.granted) {
        console.warn('Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: options.accuracy || Location.Accuracy.High,
        timeInterval: options.timeout || 10000,
      });

      const deviceLocation: DeviceLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        timestamp: location.timestamp,
      };

      this.lastKnownLocation = deviceLocation;
      return deviceLocation;
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  }

  /**
   * Start watching location changes
   */
  static async startLocationWatch(options: {
    accuracy?: Location.Accuracy;
    timeInterval?: number;
    distanceInterval?: number;
    callback: (location: DeviceLocation) => void;
  }): Promise<boolean> {
    try {
      const permissionStatus = await this.checkPermissionStatus();
      if (!permissionStatus.granted) {
        console.warn('Location permission not granted');
        return false;
      }

      // Stop existing watch if any
      await this.stopLocationWatch();

      // Add callback to set
      this.locationUpdateCallbacks.add(options.callback);

      // Start watching location
      this.currentWatchSubscription = await Location.watchPositionAsync(
        {
          accuracy: options.accuracy || Location.Accuracy.High,
          timeInterval: options.timeInterval || 5000, // 5 seconds
          distanceInterval: options.distanceInterval || 10, // 10 meters
        },
        (location) => {
          const deviceLocation: DeviceLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
            timestamp: location.timestamp,
          };

          this.lastKnownLocation = deviceLocation;

          // Notify all callbacks
          this.locationUpdateCallbacks.forEach(callback => {
            try {
              callback(deviceLocation);
            } catch (error) {
              console.error('Error in location update callback:', error);
            }
          });
        }
      );

      console.log('✅ Location watch started');
      return true;
    } catch (error) {
      console.error('Failed to start location watch:', error);
      return false;
    }
  }

  /**
   * Stop watching location changes
   */
  static async stopLocationWatch(): Promise<void> {
    try {
      if (this.currentWatchSubscription) {
        this.currentWatchSubscription.remove();
        this.currentWatchSubscription = null;
        console.log('🛑 Location watch stopped');
      }
      this.locationUpdateCallbacks.clear();
    } catch (error) {
      console.error('Failed to stop location watch:', error);
    }
  }

  /**
   * Add location update callback
   */
  static addLocationUpdateCallback(callback: (location: DeviceLocation) => void): void {
    this.locationUpdateCallbacks.add(callback);
  }

  /**
   * Remove location update callback
   */
  static removeLocationUpdateCallback(callback: (location: DeviceLocation) => void): void {
    this.locationUpdateCallbacks.delete(callback);
  }

  /**
   * Get last known location
   */
  static getLastKnownLocation(): DeviceLocation | null {
    return this.lastKnownLocation;
  }

  /**
   * Check if location services are enabled
   */
  static async isLocationServicesEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Failed to check location services status:', error);
      return false;
    }
  }

  /**
   * Show permission denied alert with option to open settings
   */
  private static showPermissionDeniedAlert(): void {
    Alert.alert(
      'Location Permission Required',
      'MeetOn needs location access to show you nearby events and friends. Please enable location permissions in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  /**
   * Show location services disabled alert
   */
  static showLocationServicesDisabledAlert(): void {
    Alert.alert(
      'Location Services Disabled',
      'Please enable location services in your device settings to use location features.',
      [
        {
          text: 'OK',
          style: 'default',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('App-Prefs:Privacy&path=LOCATION');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  /**
   * Request permission with user-friendly explanation
   */
  static async requestPermissionWithExplanation(
    title: string = 'Location Permission',
    message: string = 'MeetOn would like to access your location to show you nearby events and friends.'
  ): Promise<LocationPermissionStatus> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve({
              granted: false,
              canAskAgain: true,
              status: 'denied',
            }),
          },
          {
            text: 'Allow',
            onPress: async () => {
              const result = await this.requestPermission();
              resolve(result);
            },
          },
        ]
      );
    });
  }

  /**
   * Get location accuracy description
   */
  static getAccuracyDescription(accuracy?: number): string {
    if (!accuracy) return 'Unknown';
    
    if (accuracy <= 5) return 'Excellent';
    if (accuracy <= 10) return 'Good';
    if (accuracy <= 20) return 'Fair';
    if (accuracy <= 50) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Calculate battery impact level
   */
  static getBatteryImpactLevel(accuracy: Location.Accuracy): 'Low' | 'Medium' | 'High' {
    switch (accuracy) {
      case Location.Accuracy.Lowest:
      case Location.Accuracy.Low:
        return 'Low';
      case Location.Accuracy.Balanced:
        return 'Medium';
      case Location.Accuracy.High:
      case Location.Accuracy.Highest:
      case Location.Accuracy.BestForNavigation:
        return 'High';
      default:
        return 'Medium';
    }
  }

  /**
   * Get recommended accuracy for use case
   */
  static getRecommendedAccuracy(useCase: 'nearby' | 'navigation' | 'geofencing' | 'background'): Location.Accuracy {
    switch (useCase) {
      case 'nearby':
        return Location.Accuracy.Balanced;
      case 'navigation':
        return Location.Accuracy.BestForNavigation;
      case 'geofencing':
        return Location.Accuracy.High;
      case 'background':
        return Location.Accuracy.Low;
      default:
        return Location.Accuracy.Balanced;
    }
  }

  /**
   * Cleanup resources
   */
  static cleanup(): void {
    this.stopLocationWatch();
    this.locationUpdateCallbacks.clear();
    this.lastKnownLocation = null;
  }
} 