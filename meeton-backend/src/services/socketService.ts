import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { liveLocationService } from './liveLocationService';
import { ValidationError } from '../utils/errors';

/**
 * Socket Service
 * Handles WebSocket connections for real-time features
 */

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    name: string;
    image?: string;
  };
}

interface LocationUpdateData {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  batteryLevel?: number;
  eventId?: string;
}

interface JoinRoomData {
  roomType: 'event' | 'user' | 'nearby';
  roomId: string;
}

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private userSockets: Map<string, AuthenticatedSocket> = new Map(); // socketId -> socket

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    // Initialize live location service with socket.io instance
    liveLocationService.setSocketIO(this.io);
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // TODO: Fetch user details from database
        socket.userId = decoded.userId;
        socket.user = {
          id: decoded.userId,
          name: decoded.name || 'Unknown',
          image: decoded.image
        };

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected via WebSocket`);
      
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        this.userSockets.set(socket.id, socket);
        
        // Join user's personal room
        socket.join(`user_${socket.userId}`);
        
        // Broadcast user online status
        this.broadcastUserStatus(socket.userId, 'online');
      }

      // Location update handler
      socket.on('location_update', async (data: LocationUpdateData) => {
        await this.handleLocationUpdate(socket, data);
      });

      // Join room handler
      socket.on('join_room', (data: JoinRoomData) => {
        this.handleJoinRoom(socket, data);
      });

      // Leave room handler
      socket.on('leave_room', (data: JoinRoomData) => {
        this.handleLeaveRoom(socket, data);
      });

      // Request nearby users
      socket.on('get_nearby_users', async (data: { radius?: number }) => {
        await this.handleGetNearbyUsers(socket, data);
      });

      // Request event attendees locations
      socket.on('get_event_locations', async (data: { eventId: string }) => {
        await this.handleGetEventLocations(socket, data);
      });

      // Start location sharing
      socket.on('start_location_sharing', async (data: { 
        sharingLevel: string;
        eventId?: string;
        expiresIn?: number; // minutes
      }) => {
        await this.handleStartLocationSharing(socket, data);
      });

      // Stop location sharing
      socket.on('stop_location_sharing', async () => {
        await this.handleStopLocationSharing(socket);
      });

      // Setup geofencing
      socket.on('setup_geofencing', async (data: {
        eventId: string;
        radius: number;
        alertTypes: string[];
      }) => {
        await this.handleSetupGeofencing(socket, data);
      });

      // Ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle location update
   */
  private async handleLocationUpdate(socket: AuthenticatedSocket, data: LocationUpdateData): Promise<void> {
    try {
      if (!socket.userId) {
        throw new ValidationError('User not authenticated');
      }

      await liveLocationService.updateLocation({
        userId: socket.userId,
        ...data
      });

      // Acknowledge successful update
      socket.emit('location_update_ack', { success: true });
      
    } catch (error) {
      console.error('Location update error:', error);
      socket.emit('location_update_ack', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handle join room
   */
  private handleJoinRoom(socket: AuthenticatedSocket, data: JoinRoomData): void {
    const { roomType, roomId } = data;
    const roomName = `${roomType}_${roomId}`;
    
    socket.join(roomName);
    socket.emit('room_joined', { roomType, roomId });
    
    console.log(`User ${socket.userId} joined room: ${roomName}`);
  }

  /**
   * Handle leave room
   */
  private handleLeaveRoom(socket: AuthenticatedSocket, data: JoinRoomData): void {
    const { roomType, roomId } = data;
    const roomName = `${roomType}_${roomId}`;
    
    socket.leave(roomName);
    socket.emit('room_left', { roomType, roomId });
    
    console.log(`User ${socket.userId} left room: ${roomName}`);
  }

  /**
   * Handle get nearby users
   */
  private async handleGetNearbyUsers(socket: AuthenticatedSocket, data: { radius?: number }): Promise<void> {
    try {
      if (!socket.userId) {
        throw new ValidationError('User not authenticated');
      }

      const nearbyUsers = await liveLocationService.getNearbyUsers(socket.userId, data.radius);
      socket.emit('nearby_users', nearbyUsers);
      
    } catch (error) {
      console.error('Get nearby users error:', error);
      socket.emit('nearby_users_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handle get event locations
   */
  private async handleGetEventLocations(socket: AuthenticatedSocket, data: { eventId: string }): Promise<void> {
    try {
      if (!socket.userId) {
        throw new ValidationError('User not authenticated');
      }

      const eventLocations = await liveLocationService.getUsersAtEvent(data.eventId, socket.userId);
      socket.emit('event_locations', { eventId: data.eventId, users: eventLocations });
      
    } catch (error) {
      console.error('Get event locations error:', error);
      socket.emit('event_locations_error', { 
        eventId: data.eventId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handle start location sharing
   */
  private async handleStartLocationSharing(socket: AuthenticatedSocket, data: {
    sharingLevel: string;
    eventId?: string;
    expiresIn?: number;
  }): Promise<void> {
    try {
      if (!socket.userId) {
        throw new ValidationError('User not authenticated');
      }

      const { sharingLevel, eventId, expiresIn } = data;
      
      let sharingExpiresAt: Date | undefined;
      if (expiresIn) {
        sharingExpiresAt = new Date(Date.now() + expiresIn * 60 * 1000);
      }

      await liveLocationService.updateSharingSettings(socket.userId, {
        sharingLevel: sharingLevel as any,
        sharingExpiresAt,
        eventId
      });

      socket.emit('location_sharing_started', { 
        sharingLevel, 
        eventId, 
        expiresAt: sharingExpiresAt 
      });
      
    } catch (error) {
      console.error('Start location sharing error:', error);
      socket.emit('location_sharing_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handle stop location sharing
   */
  private async handleStopLocationSharing(socket: AuthenticatedSocket): Promise<void> {
    try {
      if (!socket.userId) {
        throw new ValidationError('User not authenticated');
      }

      await liveLocationService.stopLocationSharing(socket.userId);
      socket.emit('location_sharing_stopped');
      
    } catch (error) {
      console.error('Stop location sharing error:', error);
      socket.emit('location_sharing_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handle setup geofencing
   */
  private async handleSetupGeofencing(socket: AuthenticatedSocket, data: {
    eventId: string;
    radius: number;
    alertTypes: string[];
  }): Promise<void> {
    try {
      if (!socket.userId) {
        throw new ValidationError('User not authenticated');
      }

      await liveLocationService.setupGeofencing(socket.userId, {
        eventId: data.eventId,
        radius: data.radius,
        alertTypes: data.alertTypes as any[]
      });

      socket.emit('geofencing_setup', { 
        eventId: data.eventId,
        radius: data.radius,
        alertTypes: data.alertTypes
      });
      
    } catch (error) {
      console.error('Setup geofencing error:', error);
      socket.emit('geofencing_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(socket: AuthenticatedSocket): void {
    console.log(`User ${socket.userId} disconnected`);
    
    if (socket.userId) {
      this.connectedUsers.delete(socket.userId);
      this.broadcastUserStatus(socket.userId, 'offline');
    }
    
    this.userSockets.delete(socket.id);
  }

  /**
   * Broadcast user online/offline status
   */
  private broadcastUserStatus(userId: string, status: 'online' | 'offline'): void {
    this.io.emit('user_status_changed', { userId, status, timestamp: new Date() });
  }

  /**
   * Send notification to specific user
   */
  public sendNotificationToUser(userId: string, notification: any): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.userSockets.get(socketId);
      if (socket) {
        socket.emit('notification', notification);
      }
    }
  }

  /**
   * Broadcast to event room
   */
  public broadcastToEvent(eventId: string, event: string, data: any): void {
    this.io.to(`event_${eventId}`).emit(event, data);
  }

  /**
   * Broadcast location update to relevant users
   */
  public broadcastLocationUpdate(userId: string, locationData: any): void {
    // Broadcast to nearby users room
    this.io.to(`nearby_${userId}`).emit('location_updated', {
      userId,
      ...locationData
    });
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get socket.io instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Export singleton instance (will be initialized in index.ts)
export let socketService: SocketService; 