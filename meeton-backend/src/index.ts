import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import DatabaseManager from './config/database';
import PassportConfig from './config/passport';
import FirebaseManager from './config/firebase';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import eventRoutes from './routes/events';
import friendRoutes from './routes/friends';
import notificationRoutes from './routes/notifications';
import imageRoutes from './routes/images';

console.log('🔥 Routes imported:', { 
  authRoutes: !!authRoutes, 
  userRoutes: !!userRoutes, 
  eventRoutes: !!eventRoutes, 
  friendRoutes: !!friendRoutes,
  notificationRoutes: !!notificationRoutes,
  imageRoutes: !!imageRoutes
});

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
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
    },
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
    await DatabaseManager.disconnect();
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
    
    // Initialize Firebase for notifications
    FirebaseManager.initialize();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`
🚀 MeetOn Backend Server Started
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Port: ${PORT}
💾 Database: Connected
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