# Redis Integration Guide

This document outlines the Redis integration implemented in the MeetOn backend for caching, session management, and rate limiting.

## Overview

Redis has been integrated to provide:
- **Caching**: Frequent queries (events, user profiles, friend lists)
- **Session Management**: Active user sessions with TTL
- **Rate Limiting**: Distributed rate limiting with sliding window

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Redis Installation

#### macOS (using Homebrew)
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

#### Docker
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

## Architecture

### 1. Redis Manager (`src/config/redis.ts`)

Central Redis connection manager with:
- Singleton pattern for connection management
- Health monitoring and reconnection logic
- Comprehensive error handling
- Pipeline operations for batch commands

### 2. Cache Service (`src/services/cacheService.ts`)

High-level caching service providing:
- **Event Caching**: Individual events, user events, nearby events, trending events
- **User Caching**: User profiles, search results, analytics
- **Friend Caching**: Friend lists, requests, mutual friends
- **Cache Invalidation**: Pattern-based and tag-based invalidation

### 3. Session Service (`src/services/sessionService.ts`)

Session management with:
- **Session Storage**: User sessions with device info and metadata
- **Token Management**: Access token and refresh token handling
- **Session Analytics**: Usage statistics and monitoring
- **Cleanup**: Automatic expired session cleanup

### 4. Rate Limiting (`src/middleware/rateLimit.ts`)

Redis-based rate limiting with:
- **Sliding Window**: More accurate than fixed window
- **User-based**: Rate limits per user ID when authenticated
- **IP-based**: Fallback to IP-based limiting
- **Graceful Degradation**: Continues without Redis if unavailable

## Usage Examples

### Caching Events

```typescript
import { cacheService } from '../services/cacheService';

// Cache an event
await cacheService.cacheEvent(event);

// Get cached event
const cachedEvent = await cacheService.getCachedEvent(eventId);

// Invalidate event cache
await cacheService.invalidateEventCache(eventId);
```

### Session Management

```typescript
import { sessionService } from '../services/sessionService';

// Create session
const sessionId = await sessionService.createSession(
  user, accessToken, refreshToken, userAgent, ipAddress
);

// Validate session
const { valid, userId } = await sessionService.validateSession(sessionId);

// Get user sessions
const sessions = await sessionService.getUserActiveSessions(userId);
```

### Rate Limiting

```typescript
import { createRateLimiter } from '../middleware/rateLimit';

// Create custom rate limiter
const customLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests',
  prefix: 'custom'
});

// Apply to routes
app.use('/api/custom', customLimiter);
```

## Cache Patterns

### 1. Cache-Aside Pattern

```typescript
// Get or set pattern
const data = await cacheService.getOrSet(
  'user:123:profile',
  async () => {
    return await userService.getUserProfile('123');
  },
  3600 // 1 hour TTL
);
```

### 2. Write-Through Pattern

```typescript
// Update data and cache simultaneously
const updatedEvent = await eventService.updateEvent(eventId, data);
await cacheService.cacheEvent(updatedEvent);
```

### 3. Cache Invalidation

```typescript
// Invalidate related caches when data changes
await cacheService.invalidateEventCache(eventId);
await cacheService.invalidateUserCache(userId);
```

## Performance Optimizations

### 1. Pipeline Operations

Redis operations are batched using pipelines for better performance:

```typescript
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.expire('key1', 3600);
await pipeline.exec();
```

### 2. Compression

Large objects are JSON-serialized and could be compressed for storage efficiency.

### 3. Connection Pooling

IoRedis automatically manages connection pooling for optimal performance.

## Monitoring and Health Checks

### Health Check Endpoint

The `/health` endpoint now includes Redis status:

```json
{
  "status": "healthy",
  "redis": {
    "status": "healthy",
    "latency": 2
  },
  "cache": {
    "totalKeys": 1234,
    "memoryUsage": "45.2MB"
  }
}
```

### Cache Statistics

```typescript
const stats = await cacheService.getCacheStats();
console.log('Cache keys:', stats.totalKeys);
console.log('Memory usage:', stats.memoryUsage);
```

## Error Handling

### Graceful Degradation

The system continues to function even if Redis is unavailable:

- **Caching**: Falls back to database queries
- **Rate Limiting**: Allows requests with warnings
- **Sessions**: Falls back to JWT-only validation

### Error Logging

All Redis operations include comprehensive error logging:

```typescript
try {
  await redisManager.set(key, value);
} catch (error) {
  console.error('Redis operation failed:', error);
  // Fallback logic
}
```

## Security Considerations

### 1. Key Namespacing

All cache keys use consistent namespacing:
- `cache:event:123`
- `session:user:456`
- `ratelimit:api:192.168.1.1`

### 2. TTL Configuration

All cached data has appropriate TTL values:
- Events: 30 minutes
- User profiles: 1 hour
- Sessions: 14 days
- Rate limits: 15 minutes

### 3. Sensitive Data

Sensitive data is not cached or is encrypted before caching.

## Deployment Considerations

### 1. Redis Persistence

Configure Redis persistence for production:

```conf
# redis.conf
save 900 1
save 300 10
save 60 10000
```

### 2. Memory Management

Set appropriate memory limits:

```conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### 3. Monitoring

Use Redis monitoring tools:
- Redis CLI: `redis-cli info`
- Redis Insight: GUI monitoring tool
- Prometheus: Metrics collection

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check Redis server is running
   - Verify host/port configuration
   - Check firewall settings

2. **Memory Issues**
   - Monitor memory usage
   - Adjust TTL values
   - Implement cache eviction policies

3. **Performance Issues**
   - Use Redis pipeline for batch operations
   - Optimize key naming patterns
   - Monitor slow queries

### Debug Commands

```bash
# Check Redis connection
redis-cli ping

# Monitor commands
redis-cli monitor

# Check memory usage
redis-cli info memory

# List all keys (development only)
redis-cli keys "*"
```

## Best Practices

1. **Use appropriate TTL values** based on data freshness requirements
2. **Implement cache warming** for frequently accessed data
3. **Monitor cache hit rates** to optimize caching strategy
4. **Use consistent key naming** patterns for easier management
5. **Implement proper error handling** with fallback mechanisms
6. **Regular cache cleanup** to prevent memory bloat
7. **Test cache invalidation** scenarios thoroughly

## Future Enhancements

1. **Cache Warming**: Implement intelligent cache pre-loading
2. **Cache Metrics**: Add detailed cache hit/miss analytics
3. **Distributed Caching**: Support for Redis Cluster
4. **Cache Compression**: Implement data compression for large objects
5. **Cache Versioning**: Handle cache invalidation during deployments 