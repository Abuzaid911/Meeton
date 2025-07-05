import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import { APIService } from './api';
import {
  LocationUpdateData,
  LocationShareSettings,
  GeofenceSettings,
  NearbyUser,
  LiveLocation,
  GeofenceAlert,
  WebSocketEvents,
} from '../types';

/**
 * WebSocket Service
 * Handles real-time location updates using Socket.IO
 */
export class WebSocketService {
  private static socket: Socket | null = null;
  private static isConnected = false;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static reconnectDelay = 1000; // Start with 1 second
  private static maxReconnectDelay = 30000; // Max 30 seconds
  private static eventListeners: Map<string, Set<Function>> = new Map();

  /**
   * Initialize WebSocket connection
   */
  static async initialize(): Promise<void> {
    try {
      // Get valid access token
      const token = await APIService.getValidAccessToken();
      if (!token) {
        console.log('❌ No valid access token, cannot initialize WebSocket');
        return;
      }

      // Create socket connection
      const socketUrl = API_BASE_URL.replace('/api', '');
      console.log('🔌 Connecting to WebSocket:', socketUrl);

      this.socket = io(socketUrl, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Setup socket event handlers
   */
  private static setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.handleConnectionError(error);
    });

    // Location events
    this.socket.on('location_updated', (data: LiveLocation) => {
      console.log('📍 Location updated:', data.userId);
      this.emit('location_updated', data);
    });

    this.socket.on('location_update_ack', (data: { success: boolean; error?: string }) => {
      if (data.success) {
        console.log('✅ Location update acknowledged');
      } else {
        console.error('❌ Location update failed:', data.error);
      }
      this.emit('location_update_ack', data);
    });

    this.socket.on('nearby_users', (data: NearbyUser[]) => {
      console.log('👥 Nearby users received:', data.length);
      this.emit('nearby_users', data);
    });

    this.socket.on('nearby_users_error', (data: { error: string }) => {
      console.error('❌ Nearby users error:', data.error);
      this.emit('nearby_users_error', data);
    });

    this.socket.on('event_locations', (data: { eventId: string; users: NearbyUser[] }) => {
      console.log('🎉 Event locations received:', data.eventId, data.users.length);
      this.emit('event_locations', data);
    });

    this.socket.on('event_locations_error', (data: { eventId: string; error: string }) => {
      console.error('❌ Event locations error:', data.error);
      this.emit('event_locations_error', data);
    });

    // Sharing events
    this.socket.on('location_sharing_started', (data: LocationShareSettings) => {
      console.log('🔄 Location sharing started:', data.sharingLevel);
      this.emit('location_sharing_started', data);
    });

    this.socket.on('location_sharing_stopped', () => {
      console.log('🛑 Location sharing stopped');
      this.emit('location_sharing_stopped');
    });

    this.socket.on('location_sharing_error', (data: { error: string }) => {
      console.error('❌ Location sharing error:', data.error);
      this.emit('location_sharing_error', data);
    });

    // Geofencing events
    this.socket.on('geofencing_setup', (data: GeofenceSettings) => {
      console.log('🔔 Geofencing setup:', data.eventId);
      this.emit('geofencing_setup', data);
    });

    this.socket.on('geofencing_error', (data: { error: string }) => {
      console.error('❌ Geofencing error:', data.error);
      this.emit('geofencing_error', data);
    });

    // Room events
    this.socket.on('room_joined', (data: { roomType: string; roomId: string }) => {
      console.log('🏠 Joined room:', data.roomType, data.roomId);
      this.emit('room_joined', data);
    });

    this.socket.on('room_left', (data: { roomType: string; roomId: string }) => {
      console.log('🚪 Left room:', data.roomType, data.roomId);
      this.emit('room_left', data);
    });

    // User status events
    this.socket.on('user_status_changed', (data: { userId: string; status: 'online' | 'offline'; timestamp: Date }) => {
      console.log('👤 User status changed:', data.userId, data.status);
      this.emit('user_status_changed', data);
    });

    // Ping/pong for connection health
    this.socket.on('pong', () => {
      console.log('🏓 Pong received');
    });
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private static handleConnectionError(error: any): void {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection_failed', error);
      return;
    }

    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay
    );

    console.log(`🔄 Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.initialize();
    }, this.reconnectDelay);
  }

  /**
   * Send location update
   */
  static sendLocationUpdate(locationData: LocationUpdateData): void {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot send location update');
      return;
    }

    console.log('📍 Sending location update');
    this.socket.emit('location_update', locationData);
  }

  /**
   * Join a room (event, user, nearby)
   */
  static joinRoom(roomType: 'event' | 'user' | 'nearby', roomId: string): void {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot join room');
      return;
    }

    console.log('🏠 Joining room:', roomType, roomId);
    this.socket.emit('join_room', { roomType, roomId });
  }

  /**
   * Leave a room
   */
  static leaveRoom(roomType: 'event' | 'user' | 'nearby', roomId: string): void {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot leave room');
      return;
    }

    console.log('🚪 Leaving room:', roomType, roomId);
    this.socket.emit('leave_room', { roomType, roomId });
  }

  /**
   * Request nearby users
   */
  static requestNearbyUsers(radius?: number): void {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot request nearby users');
      return;
    }

    console.log('👥 Requesting nearby users');
    this.socket.emit('get_nearby_users', { radius });
  }

  /**
   * Request event locations
   */
  static requestEventLocations(eventId: string): void {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot request event locations');
      return;
    }

    console.log('🎉 Requesting event locations:', eventId);
    this.socket.emit('get_event_locations', { eventId });
  }

  /**
   * Start location sharing
   */
  static startLocationSharing(settings: {
    sharingLevel: string;
    eventId?: string;
    expiresIn?: number; // minutes
  }): void {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot start location sharing');
      return;
    }

    console.log('🔄 Starting location sharing:', settings.sharingLevel);
    this.socket.emit('start_location_sharing', settings);
  }

  /**
   * Stop location sharing
   */
  static stopLocationSharing(): void {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot stop location sharing');
      return;
    }

    console.log('🛑 Stopping location sharing');
    this.socket.emit('stop_location_sharing');
  }

  /**
   * Setup geofencing
   */
  static setupGeofencing(settings: {
    eventId: string;
    radius: number;
    alertTypes: string[];
  }): void {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot setup geofencing');
      return;
    }

    console.log('🔔 Setting up geofencing:', settings.eventId);
    this.socket.emit('setup_geofencing', settings);
  }

  /**
   * Send ping to check connection
   */
  static ping(): void {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ WebSocket not connected, cannot ping');
      return;
    }

    this.socket.emit('ping');
  }

  /**
   * Add event listener
   */
  static addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  static removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private static emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  static disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventListeners.clear();
  }

  /**
   * Get connection status
   */
  static getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Force reconnection
   */
  static async reconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    await this.initialize();
  }
} 