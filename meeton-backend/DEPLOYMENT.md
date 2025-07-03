# 🚀 MeetOn Backend Deployment Guide

## Deploy to Render (Free Tier)

### 1. **Push Code to GitHub**
```bash
git add .
git commit -m "Add production deployment configuration"
git push origin main
```

### 2. **Deploy to Render**
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `your-username/MeetOn`
4. Configure the service:
   - **Name**: `meeton-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `meeton-backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`

### 3. **Add Database**
1. Go to Render Dashboard → "New +" → "PostgreSQL"
2. **Name**: `meeton-db`
3. **Plan**: Free
4. Copy the **External Database URL** once created

### 4. **Configure Environment Variables**
In your Render web service, go to "Environment" tab and add:

```
NODE_ENV=production
DATABASE_URL=<paste-your-postgres-url-here>
JWT_SECRET=your-super-secure-jwt-secret-here-make-it-long-and-random
JWT_REFRESH_SECRET=your-other-super-secure-refresh-secret-here-also-long-and-random
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### 5. **Update Frontend API URL**
The frontend will automatically use the production URL when built for production:
- **Development**: `http://localhost:3000/api`
- **Production**: `https://meeton-backend.onrender.com/api`

### 6. **Test Deployment**
1. Wait for deployment to complete (5-10 minutes)
2. Test the health endpoint: `https://your-app-name.onrender.com/health`
3. Your backend is live! 🎉

## 🔧 Environment Variables Needed

### Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Optional (for file uploads):
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## 📝 Notes

- **Free Tier Limitations**:
  - App may sleep after 15 minutes of inactivity
  - 750 build hours per month
  - PostgreSQL: 1GB storage, 97 connection limit

- **Database Migration**:
  - Prisma migrations run automatically on deployment
  - Database will be set up with all tables on first deploy

- **Monitoring**:
  - Check logs in Render dashboard
  - Use `/health` endpoint for health checks

## 🔗 Quick Links

- [Render Dashboard](https://dashboard.render.com)
- [Render PostgreSQL Guide](https://render.com/docs/databases)
- [Environment Variables Guide](https://render.com/docs/environment-variables) 