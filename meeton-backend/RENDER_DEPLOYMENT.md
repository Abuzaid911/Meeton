# MeetOn Backend Deployment on Render

## 🚀 Deployment Overview

This document outlines the steps to deploy the MeetOn backend with Firebase push notifications to Render.com.

## 📋 Prerequisites

- Render.com account
- Firebase project with Admin SDK key
- Google OAuth credentials
- Cloudinary account (for image uploads)

## 🔧 Environment Variables Setup

### Required Environment Variables on Render

Set these in your Render service's Environment tab:

```bash
# Database
DATABASE_URL=postgresql://meeton:jKYf49AbEPZO0M2SX2z9RcmbEJJAZKIj@dpg-d1j7lh95pdvs73cud15g-a.oregon-postgres.render.com/meeton

# JWT Secrets
JWT_SECRET=your-jwt-secret-key-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-here

# Firebase Configuration
FIREBASE_PROJECT_ID=meeton-9a49c
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"meeton-9a49c",...}

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=production
```

## 🔑 Firebase Service Account Key

The `FIREBASE_SERVICE_ACCOUNT_KEY` should be the complete JSON object as a single line string:

```json
{"type":"service_account","project_id":"meeton-9a49c","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-...@meeton-9a49c.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-...%40meeton-9a49c.iam.gserviceaccount.com"}
```

## 📂 Deployment Steps

### 1. Connect Repository
- Go to Render Dashboard
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Select the `meeton-backend` directory

### 2. Configure Service
- **Name**: `meeton-backend`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run db:migrate:prod && npm run start`
- **Plan**: Free (or upgrade as needed)

### 3. Set Environment Variables
Add all the environment variables listed above in the Environment tab.

### 4. Deploy
- Click "Create Web Service"
- Wait for deployment to complete
- Check logs for any errors

## 🗄️ Database Migration

The deployment will automatically run database migrations using:
```bash
npm run db:migrate:prod
```

This command:
1. Generates Prisma client
2. Pushes schema changes to the database
3. Seeds initial data if needed

## 🔍 Health Check

The service includes a health check endpoint at `/health` that verifies:
- Database connection
- Firebase initialization
- Server status

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify DATABASE_URL is correct
   - Check if database is accessible from Render

2. **Firebase Initialization Errors**
   - Verify FIREBASE_SERVICE_ACCOUNT_KEY is valid JSON
   - Check FIREBASE_PROJECT_ID matches your project

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json

4. **Migration Errors**
   - Check database permissions
   - Verify schema is compatible with PostgreSQL

### Logs and Monitoring

Access logs via:
- Render Dashboard → Your Service → Logs
- Check for startup errors and runtime issues

## 📱 Testing Notifications

After deployment:

1. **Test API Endpoints**
   ```bash
   curl https://your-render-app.onrender.com/health
   ```

2. **Test Firebase Integration**
   - Register FCM tokens via `/api/notifications/register-token`
   - Send test notifications via friend requests

3. **Monitor Logs**
   - Check for Firebase initialization messages
   - Verify notification delivery logs

## 🔄 Continuous Deployment

The render.yaml file is configured for automatic deployments:
- Pushes to main branch trigger deployments
- Environment variables are maintained across deployments
- Database migrations run automatically

## 🛡️ Security Considerations

- All secrets are stored as environment variables
- Firebase service account key is secured
- Database URL includes authentication
- CORS is configured for production domains

## 📊 Performance Monitoring

Monitor your deployment:
- Response times via Render dashboard
- Database query performance
- Firebase notification delivery rates
- Memory and CPU usage

## 🔧 Scaling

For production scaling:
- Upgrade Render plan for more resources
- Consider Redis for session management
- Implement database connection pooling
- Add load balancing for multiple instances

## 📞 Support

For deployment issues:
- Check Render documentation
- Review Firebase Admin SDK docs
- Monitor application logs
- Contact support if needed 