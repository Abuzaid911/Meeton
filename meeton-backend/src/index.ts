import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import http from 'http';
import DatabaseManager from './config/database';
import PassportConfig from './config/passport';
import FirebaseManager from './config/firebase';
import { redisManager } from './config/redis';
import { cacheService } from './services/cacheService';
import { SocketService } from './services/socketService';
import { liveLocationService } from './services/liveLocationService';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import eventRoutes from './routes/events';
import friendRoutes from './routes/friends';
import notificationRoutes from './routes/notifications';
import imageRoutes from './routes/images';
import analyticsRoutes from './routes/analytics';
import weatherRoutes from './routes/weather';
import locationRoutes from './routes/location';
import sharingRoutes from './routes/sharing';
import liveLocationRoutes from './routes/liveLocation';

console.log('🔥 Routes imported:', { 
  authRoutes: !!authRoutes, 
  userRoutes: !!userRoutes, 
  eventRoutes: !!eventRoutes, 
  friendRoutes: !!friendRoutes,
  notificationRoutes: !!notificationRoutes,
  imageRoutes: !!imageRoutes,
  analyticsRoutes: !!analyticsRoutes,
  weatherRoutes: !!weatherRoutes,
  locationRoutes: !!locationRoutes,
  sharingRoutes: !!sharingRoutes,
  liveLocationRoutes: !!liveLocationRoutes
});

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO service
let socketService: SocketService;

// Security middleware - MUST be first
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:19006',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'meeton-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize Passport
PassportConfig.initialize();
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting middleware
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await DatabaseManager.runHealthCheck();
    const redisHealth = await redisManager.getHealthStatus();
    const cacheStats = await cacheService.getCacheStats();
    const locationAnalytics = await liveLocationService.getLocationAnalytics();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
      redis: redisHealth,
      cache: cacheStats,
      liveLocation: {
        activeUsers: locationAnalytics.activeUsers,
        totalUsers: locationAnalytics.totalUsers,
        usersAtEvents: locationAnalytics.usersAtEvents,
      },
      websocket: {
        connected: socketService ? socketService.getConnectedUsersCount() : 0,
      },
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', (req, res, next) => {
  console.log('🔍 Events router hit:', req.method, req.originalUrl, 'params:', req.params);
  next();
}, eventRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/sharing', sharingRoutes);
app.use('/api/live-location', liveLocationRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'MeetOn API v1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      events: '/api/events',
      friends: '/api/friends',
      notifications: '/api/notifications',
      images: '/api/images',
      analytics: '/api/analytics',
      weather: '/api/weather',
      location: '/api/location',
      sharing: '/api/sharing',
      liveLocation: '/api/live-location',
    },
    websocket: {
      url: `ws://localhost:${PORT}`,
      events: [
        'location_update',
        'get_nearby_users',
        'get_event_locations',
        'start_location_sharing',
        'stop_location_sharing',
        'setup_geofencing',
        'join_room',
        'leave_room'
      ]
    }
  });
});

// 404 handler - catch all unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      statusCode: 404,
    },
  });
});

// Global error handler - MUST be last
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close WebSocket connections
    if (socketService) {
      console.log('🔌 Closing WebSocket connections...');
      socketService.getIO().close();
    }
    
    await DatabaseManager.disconnect();
    await redisManager.disconnect();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await DatabaseManager.connect();
    
    // Connect to Redis
    try {
      await redisManager.connect();
      console.log('✅ Redis connected successfully');
      
      // Warm up cache
      await cacheService.warmUpCache();
    } catch (redisError) {
      console.warn('⚠️  Redis connection failed, continuing without cache:', redisError);
    }
    
    // Initialize Firebase for notifications
    FirebaseManager.initialize();
    
    // Initialize Socket.IO service
    socketService = new SocketService(server);
    console.log('🔌 WebSocket service initialized');
    
    // Start listening
    server.listen(PORT, async () => {
      const cacheHealthy = await cacheService.isHealthy();
      console.log(`
🚀 MeetOn Backend Server Started
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Port: ${PORT}
💾 Database: Connected
🔗 Redis: ${redisManager.isHealthy() ? 'Connected' : 'Disconnected'}
📊 Cache: ${cacheHealthy ? 'Active' : 'Inactive'}
🔌 WebSocket: Active
📍 Live Location: Enabled
🔗 Health Check: http://localhost:${PORT}/health
📚 API Documentation: http://localhost:${PORT}/api
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

export default app; 