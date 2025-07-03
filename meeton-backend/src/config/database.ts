import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

class DatabaseManager {
  private static instance: PrismaClient;
  
  static getInstance(): PrismaClient {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = globalThis.prisma || new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'error', 'warn'] 
          : ['error'],
        errorFormat: 'pretty',
      });
      
      if (process.env.NODE_ENV === 'development') {
        globalThis.prisma = DatabaseManager.instance;
      }
    }
    
    return DatabaseManager.instance;
  }
  
  static async connect(): Promise<void> {
    try {
      const client = DatabaseManager.getInstance();
      await client.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }
  
  static async disconnect(): Promise<void> {
    try {
      if (DatabaseManager.instance) {
        await DatabaseManager.instance.$disconnect();
        console.log('✅ Database disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
    }
  }
  
  static async testConnection(): Promise<boolean> {
    try {
      const client = DatabaseManager.getInstance();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }
  
  static async runHealthCheck(): Promise<{
    database: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const client = DatabaseManager.getInstance();
      await client.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;
      
      return {
        database: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        database: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export the singleton instance
export const prisma = DatabaseManager.getInstance();
export default DatabaseManager; 