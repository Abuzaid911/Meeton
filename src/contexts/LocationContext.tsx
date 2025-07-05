import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { LiveLocationService } from '../services/liveLocationService';
import { WebSocketService } from '../services/webSocketService';
import { LocationPermissionService } from '../services/locationPermissionService';
import {
  LocationPermissionStatus,
  DeviceLocation,
  LocationShareSettings,
  LocationSharingLevel,
  NearbyUser,
  GeofenceAlert,
  User,
} from '../types';

// Try to import Battery module, fallback if not available
let Battery: any = null;
try {
  Battery = require('expo-battery');
} catch (error) {
  console.warn('expo-battery not available, battery monitoring disabled');
}

interface LocationContextType {
  // Permission state
  permissionStatus: LocationPermissionStatus;
  locationServicesEnabled: boolean;
  
  // Location state
  currentLocation: DeviceLocation | null;
  isLocationTracking: boolean;
  locationAccuracy: Location.Accuracy;
  
  // Sharing state
  sharingSettings: LocationShareSettings;
  isSharing: boolean;
  sharingTimeRemaining: string | null;
  
  // Nearby users and events
  nearbyUsers: NearbyUser[];
  eventUsers: { [eventId: string]: NearbyUser[] };
  
  // WebSocket state
  isConnected: boolean;
  connectionStatus: string;
  
  // Battery optimization
  batteryLevel: number | null;
  batteryOptimized: boolean;
  
  // Actions
  requestPermission: () => Promise<boolean>;
  requestBackgroundPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<DeviceLocation | null>;
  startLocationTracking: (accuracy?: Location.Accuracy) => Promise<boolean>;
  stopLocationTracking: () => Promise<void>;
  updateSharingSettings: (settings: LocationShareSettings) => Promise<boolean>;
  stopSharing: () => Promise<boolean>;
  getNearbyUsers: (radius?: number) => Promise<void>;
  getEventUsers: (eventId: string) => Promise<void>;
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
  currentUser: User;
}

export function LocationProvider({ children, currentUser }: LocationProviderProps) {
  // Permission state
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>({
    granted: false,
    canAskAgain: true,
    status: 'undetermined',
  });
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(false);
  
  // Location state
  const [currentLocation, setCurrentLocation] = useState<DeviceLocation | null>(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<Location.Accuracy>(Location.Accuracy.Balanced);
  
  // Sharing state
  const [sharingSettings, setSharingSettings] = useState<LocationShareSettings>({
    sharingLevel: LocationSharingLevel.PRIVATE,
  });
  const [isSharing, setIsSharing] = useState(false);
  const [sharingTimeRemaining, setSharingTimeRemaining] = useState<string | null>(null);
  
  // Nearby users and events
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [eventUsers, setEventUsers] = useState<{ [eventId: string]: NearbyUser[] }>({});
  
  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Battery optimization
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryOptimized, setBatteryOptimized] = useState(false);

  // Initialize location services
  useEffect(() => {
    initializeLocationServices();
    initializeWebSocket();
    initializeBatteryMonitoring();
    
    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkPermissionStatus();
        checkLocationServices();
        if (isSharing) {
          connectWebSocket();
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Continue location tracking in background if sharing
        if (!isSharing) {
          stopLocationTracking();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Update sharing time remaining
  useEffect(() => {
    if (sharingSettings.sharingExpiresAt) {
      const updateTimer = () => {
        const remaining = LiveLocationService.getRemainingShareTime(sharingSettings.sharingExpiresAt);
        setSharingTimeRemaining(remaining);
        
        if (remaining === 'Expired') {
          stopSharing();
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // Update every minute
      return () => clearInterval(interval);
    } else {
      setSharingTimeRemaining(null);
    }
  }, [sharingSettings.sharingExpiresAt]);

  // Initialize location services
  const initializeLocationServices = async () => {
    await checkPermissionStatus();
    await checkLocationServices();
  };

  // Initialize WebSocket
  const initializeWebSocket = async () => {
    // Setup WebSocket event listeners
    WebSocketService.addEventListener('connected', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    WebSocketService.addEventListener('disconnected', (reason: string) => {
      setIsConnected(false);
      setConnectionStatus(`disconnected: ${reason}`);
    });

    WebSocketService.addEventListener('connection_failed', () => {
      setConnectionStatus('connection failed');
    });

    WebSocketService.addEventListener('location_updated', (location: any) => {
      // Handle other users' location updates
      console.log('Location updated for user:', location.userId);
    });

    WebSocketService.addEventListener('nearby_users', (users: NearbyUser[]) => {
      setNearbyUsers(users);
    });

    WebSocketService.addEventListener('event_locations', (data: { eventId: string; users: NearbyUser[] }) => {
      setEventUsers(prev => ({
        ...prev,
        [data.eventId]: data.users,
      }));
    });

    WebSocketService.addEventListener('location_sharing_started', (settings: LocationShareSettings) => {
      setSharingSettings(settings);
      setIsSharing(true);
    });

    WebSocketService.addEventListener('location_sharing_stopped', () => {
      setIsSharing(false);
      setSharingSettings({ sharingLevel: LocationSharingLevel.PRIVATE });
    });
  };

  // Initialize battery monitoring
  const initializeBatteryMonitoring = async () => {
    try {
      if (!Battery) {
        console.warn('Battery module not available, using default values');
        setBatteryLevel(1.0); // Assume full battery
        setBatteryOptimized(false);
        return;
      }

      const level = await Battery.getBatteryLevelAsync();
      setBatteryLevel(level);
      
      // Monitor battery level changes
      const subscription = Battery.addBatteryLevelListener(({ batteryLevel }: { batteryLevel: number }) => {
        setBatteryLevel(batteryLevel);
        
        // Auto-optimize for low battery
        if (batteryLevel < 0.2 && isLocationTracking) {
          setBatteryOptimized(true);
          setLocationAccuracy(Location.Accuracy.Low);
        }
      });

      return () => subscription?.remove();
    } catch (error) {
      console.warn('Failed to initialize battery monitoring:', error);
      // Set default values if battery module fails
      setBatteryLevel(1.0); // Assume full battery
      setBatteryOptimized(false);
    }
  };

  // Check permission status
  const checkPermissionStatus = async () => {
    const status = await LocationPermissionService.checkPermissionStatus();
    setPermissionStatus(status);
  };

  // Check location services
  const checkLocationServices = async () => {
    const enabled = await LocationPermissionService.isLocationServicesEnabled();
    setLocationServicesEnabled(enabled);
  };

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const status = await LocationPermissionService.requestPermission();
    setPermissionStatus(status);
    return status.granted;
  }, []);

  // Request background permission
  const requestBackgroundPermission = useCallback(async (): Promise<boolean> => {
    const status = await LocationPermissionService.requestBackgroundPermission();
    return status.granted;
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async (): Promise<DeviceLocation | null> => {
    const location = await LocationPermissionService.getCurrentLocation({
      accuracy: locationAccuracy,
    });
    
    if (location) {
      setCurrentLocation(location);
    }
    
    return location;
  }, [locationAccuracy]);

  // Start location tracking
  const startLocationTracking = useCallback(async (accuracy?: Location.Accuracy): Promise<boolean> => {
    if (accuracy) {
      setLocationAccuracy(accuracy);
    }

    const success = await LocationPermissionService.startLocationWatch({
      accuracy: accuracy || locationAccuracy,
      timeInterval: batteryOptimized ? 30000 : 5000, // 30s for battery optimization, 5s normal
      distanceInterval: batteryOptimized ? 50 : 10, // 50m for battery optimization, 10m normal
      callback: handleLocationUpdate,
    });

    setIsLocationTracking(success);
    return success;
  }, [locationAccuracy, batteryOptimized]);

  // Stop location tracking
  const stopLocationTracking = useCallback(async (): Promise<void> => {
    await LocationPermissionService.stopLocationWatch();
    setIsLocationTracking(false);
  }, []);

  // Handle location updates
  const handleLocationUpdate = useCallback((location: DeviceLocation) => {
    setCurrentLocation(location);
    
    // Send to backend if sharing is active
    if (isSharing && isConnected) {
      const locationData = {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        altitude: location.altitude,
        batteryLevel: batteryLevel ?? undefined, // Convert null to undefined
        eventId: sharingSettings.eventId,
      };

      // Send via WebSocket for real-time updates
      WebSocketService.sendLocationUpdate(locationData);
      
      // Also update via API for persistence
      LiveLocationService.updateLocation(locationData);
    }
  }, [isSharing, isConnected, batteryLevel, sharingSettings.eventId]);

  // Update sharing settings
  const updateSharingSettings = useCallback(async (settings: LocationShareSettings): Promise<boolean> => {
    const success = await LiveLocationService.updateSharingSettings(settings);
    
    if (success) {
      setSharingSettings(settings);
      setIsSharing(LiveLocationService.isLocationSharingActive(settings));
      
      // Start location tracking if sharing is active
      if (LiveLocationService.isLocationSharingActive(settings)) {
        await startLocationTracking();
        
        // Send via WebSocket
        if (isConnected) {
          WebSocketService.startLocationSharing({
            sharingLevel: settings.sharingLevel,
            eventId: settings.eventId,
            expiresIn: settings.sharingExpiresAt 
              ? Math.floor((settings.sharingExpiresAt.getTime() - Date.now()) / (1000 * 60))
              : undefined,
          });
        }
      } else {
        await stopLocationTracking();
      }
    }
    
    return success;
  }, [isConnected, startLocationTracking, stopLocationTracking]);

  // Stop sharing
  const stopSharing = useCallback(async (): Promise<boolean> => {
    const success = await LiveLocationService.stopLocationSharing();
    
    if (success) {
      setIsSharing(false);
      setSharingSettings({ sharingLevel: LocationSharingLevel.PRIVATE });
      await stopLocationTracking();
      
      if (isConnected) {
        WebSocketService.stopLocationSharing();
      }
    }
    
    return success;
  }, [isConnected, stopLocationTracking]);

  // Get nearby users
  const getNearbyUsers = useCallback(async (radius: number = 1000): Promise<void> => {
    if (isConnected) {
      WebSocketService.requestNearbyUsers(radius);
    } else {
      const users = await LiveLocationService.getNearbyUsers(radius);
      setNearbyUsers(users);
    }
  }, [isConnected]);

  // Get event users
  const getEventUsers = useCallback(async (eventId: string): Promise<void> => {
    if (isConnected) {
      WebSocketService.requestEventLocations(eventId);
    } else {
      const users = await LiveLocationService.getEventLocations(eventId);
      setEventUsers(prev => ({
        ...prev,
        [eventId]: users,
      }));
    }
  }, [isConnected]);

  // Connect WebSocket
  const connectWebSocket = useCallback(async (): Promise<void> => {
    await WebSocketService.initialize();
  }, []);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback((): void => {
    WebSocketService.disconnect();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Refresh location
  const refreshLocation = useCallback(async (): Promise<void> => {
    await getCurrentLocation();
    if (isSharing) {
      await getNearbyUsers();
    }
  }, [getCurrentLocation, getNearbyUsers, isSharing]);

  const value: LocationContextType = {
    // Permission state
    permissionStatus,
    locationServicesEnabled,
    
    // Location state
    currentLocation,
    isLocationTracking,
    locationAccuracy,
    
    // Sharing state
    sharingSettings,
    isSharing,
    sharingTimeRemaining,
    
    // Nearby users and events
    nearbyUsers,
    eventUsers,
    
    // WebSocket state
    isConnected,
    connectionStatus,
    
    // Battery optimization
    batteryLevel,
    batteryOptimized,
    
    // Actions
    requestPermission,
    requestBackgroundPermission,
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking,
    updateSharingSettings,
    stopSharing,
    getNearbyUsers,
    getEventUsers,
    connectWebSocket,
    disconnectWebSocket,
    refreshLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
} 