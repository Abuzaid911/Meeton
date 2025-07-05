# Render Deployment Guide with Redis

This guide covers deploying the MeetOn backend to Render with Redis integration.

## Prerequisites

1. Render account: [Sign up at render.com](https://render.com)
2. GitHub repository with your backend code
3. Environment variables ready

## Step 1: Create Redis Instance

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" button

2. **Create Redis Service**
   - Select "Redis"
   - Configure:
     - **Name**: `meeton-redis`
     - **Region**: Choose closest to your web service
     - **Plan**: 
       - Free: 25MB (good for development)
       - Starter: $7/month, 256MB
       - Standard: $15/month, 1GB
     - **Max Memory Policy**: `allkeys-lru` (recommended)
   - Click "Create Redis"

3. **Get Connection Details**
   After creation, you'll see:
   ```
   Internal Redis URL: redis://red-xxxxxxxxxxxxx:6379
   External Redis URL: rediss://red-xxxxxxxxxxxxx:6379
   ```

## Step 2: Create Web Service

1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your backend

2. **Configure Build Settings**
   - **Name**: `meeton-backend`
   - **Region**: Same as Redis instance
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: `meeton-backend` (if backend is in subdirectory)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

## Step 3: Environment Variables

Add these environment variables to your Render web service:

### Required Variables
```env
# Database
DATABASE_URL=your-postgresql-url

# Redis (use Internal URL for better performance)
REDIS_URL=redis://red-xxxxxxxxxxxxx:6379

# JWT
JWT_SECRET=your-super-secure-jwt-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# OpenWeather API
OPENWEATHER_API_KEY=your-openweather-api-key

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Environment
NODE_ENV=production
PORT=3000

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Session
SESSION_SECRET=your-session-secret-here
```

### Optional Variables
```env
# Firebase (if using push notifications)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# Logging
LOG_LEVEL=info
```

## Step 4: Database Setup

1. **Create PostgreSQL Database**
   - In Render dashboard, click "New +" → "PostgreSQL"
   - Configure database settings
   - Copy the External Database URL

2. **Set DATABASE_URL**
   - Add the PostgreSQL URL to your web service environment variables
   - Format: `postgresql://user:password@host:port/database`

## Step 5: Deploy

1. **Initial Deployment**
   - Click "Create Web Service"
   - Render will automatically deploy from your GitHub repository
   - Monitor the build logs for any errors

2. **Database Migration**
   - After first deployment, run database migrations:
   - Go to your service → "Shell" tab
   - Run: `npx prisma migrate deploy`
   - Run: `npx prisma generate`

## Step 6: Verify Deployment

1. **Health Check**
   ```bash
   curl https://your-service-url.onrender.com/health
   ```

2. **Expected Response**
   ```json
   {
     "status": "healthy",
     "database": { "database": "healthy" },
     "redis": { "status": "healthy" },
     "cache": { "totalKeys": 0, "memoryUsage": "1MB" }
   }
   ```

## Helper Scripts

### Parse Redis URL
Use the included script to parse your Render Redis URL:

```bash
node scripts/parse-redis-url.js "redis://red-xxxxxxxxxxxxx:6379"
```

This will output the individual environment variables if needed.

## Monitoring and Maintenance

### 1. Logs
- Access logs through Render dashboard
- Monitor for Redis connection issues
- Watch for rate limiting alerts

### 2. Redis Monitoring
- Check Redis memory usage in Render dashboard
- Monitor cache hit rates through health endpoint
- Set up alerts for high memory usage

### 3. Performance
- Use Redis internal URL for better latency
- Monitor cache effectiveness
- Adjust TTL values based on usage patterns

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```
   Error: Redis connection error: ECONNREFUSED
   ```
   - **Solution**: Check REDIS_URL format and ensure Redis service is running
   - Verify both services are in the same region

2. **Database Connection Issues**
   ```
   Error: getaddrinfo ENOTFOUND
   ```
   - **Solution**: Verify DATABASE_URL is correct
   - Check if database service is running

3. **Build Failures**
   - Check build logs for missing dependencies
   - Verify Node.js version compatibility
   - Ensure all environment variables are set

4. **Memory Issues**
   ```
   Redis OOM command not allowed
   ```
   - **Solution**: Upgrade Redis plan or optimize cache usage
   - Implement cache eviction policies

### Debug Commands

Access your service shell and run:

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check environment variables
env | grep REDIS

# Test database connection
npx prisma db pull

# Check application health
curl localhost:3000/health
```

## Security Best Practices

1. **Use Internal URLs**: Always use Redis internal URL for service-to-service communication
2. **Secure Environment Variables**: Never commit secrets to version control
3. **Enable HTTPS**: Render provides free SSL certificates
4. **Rate Limiting**: Configure appropriate rate limits for your API
5. **CORS**: Set specific origins instead of wildcards

## Scaling Considerations

1. **Redis Plans**:
   - Free: Development/testing
   - Starter: Small production apps
   - Standard: Medium traffic apps
   - Pro: High traffic applications

2. **Web Service Plans**:
   - Free: 750 hours/month, sleeps after inactivity
   - Starter: Always-on, 512MB RAM
   - Standard: 2GB RAM, better performance

3. **Auto-scaling**:
   - Render automatically scales within plan limits
   - Monitor performance and upgrade as needed

## Cost Optimization

1. **Development**:
   - Use free tiers for Redis and web service
   - Consider shared databases

2. **Production**:
   - Start with Starter plans
   - Monitor usage and scale up as needed
   - Use caching effectively to reduce database load

## Next Steps

1. Set up monitoring and alerting
2. Configure CI/CD pipelines
3. Implement backup strategies
4. Set up staging environment
5. Configure custom domains 