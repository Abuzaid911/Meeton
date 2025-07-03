# MeetOn Backend API

A robust Node.js/Express API backend for the MeetOn event management application, powered by CockroachDB and Prisma ORM.

## 🛠 Tech Stack

- **Framework**: Node.js + Express.js + TypeScript
- **Database**: CockroachDB (PostgreSQL-compatible)
- **ORM**: Prisma
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod
- **Caching**: Redis
- **File Storage**: Cloudinary
- **Security**: Helmet, CORS, Rate Limiting

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- CockroachDB account (free tier available)
- Redis (optional, for caching)

### 1. Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Set up your environment variables in `.env`:**
   ```bash
   # Required
   DATABASE_URL="postgresql://username:password@cluster-host:26257/meeton-db?sslmode=require"
   JWT_SECRET="your-32-character-minimum-secret-key"
   JWT_REFRESH_SECRET="your-32-character-minimum-refresh-secret"
   
   # Optional
   REDIS_URL="redis://localhost:6379"
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   # ... see .env.example for all options
   ```

### 2. CockroachDB Setup

#### Option A: CockroachDB Cloud (Recommended)

1. **Create a free account** at [cockroachlabs.com](https://www.cockroachlabs.com/get-started-cockroachdb/)

2. **Create a new cluster:**
   - Choose "Serverless" for free tier
   - Select your preferred region
   - Give your cluster a name (e.g., "meeton-cluster")

3. **Create a database:**
   - In your cluster dashboard, go to "Databases"
   - Click "Create Database"
   - Name it `meeton-db`

4. **Get connection string:**
   - Go to "Connect" in your cluster dashboard
   - Choose "General connection string"
   - Copy the connection string and update your `.env` file

#### Option B: Local CockroachDB

1. **Install CockroachDB:**
   ```bash
   # macOS
   brew install cockroachdb/tap/cockroach
   
   # Linux
   wget -qO- https://binaries.cockroachdb.com/cockroach-latest.linux-amd64.tgz | tar xvz
   sudo cp -i cockroach-latest.linux-amd64/cockroach /usr/local/bin/
   ```

2. **Start local cluster:**
   ```bash
   cockroach start-single-node --insecure --listen-addr=localhost:26257 --http-addr=localhost:8080
   ```

3. **Create database:**
   ```bash
   cockroach sql --insecure --execute="CREATE DATABASE meeton_db;"
   ```

4. **Update `.env`:**
   ```bash
   DATABASE_URL="postgresql://root@localhost:26257/meeton_db?sslmode=disable"
   ```

### 3. Install Dependencies & Setup Database

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Create database tables
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

The server will start at `http://localhost:3000`

## 📊 Database Schema

Our Prisma schema includes:

- **Users**: Authentication, profiles, preferences
- **Events**: Event details, privacy settings, customization
- **Attendees**: RSVP management, check-ins
- **FriendRequests**: Social networking features
- **Comments & Reactions**: Event communication
- **Notifications**: Real-time updates
- **Analytics**: Usage tracking and insights

## 🛡 Security Features

- **JWT Authentication** with refresh token rotation
- **Input Validation** with Zod schemas
- **Rate Limiting** on all endpoints
- **CORS Protection** with origin validation
- **SQL Injection Protection** via Prisma
- **XSS Protection** with Helmet middleware
- **Error Handling** without information leakage

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### Authentication
```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Users
```http
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/:id
DELETE /api/users/account
```

### Events
```http
GET    /api/events
POST   /api/events
GET    /api/events/:id
PUT    /api/events/:id
DELETE /api/events/:id
POST   /api/events/:id/rsvp
```

### Friends
```http
GET    /api/friends
POST   /api/friends/request
PUT    /api/friends/request/:id
```

## 🗂 Project Structure

```
src/
├── config/
│   ├── database.ts         # Prisma client setup
│   └── env.ts             # Environment validation
├── controllers/           # Request handlers
├── middleware/           # Auth, validation, etc.
├── routes/              # API route definitions
├── services/            # Business logic
├── utils/              # Helper functions
├── types/              # TypeScript types
└── generated/          # Generated Prisma client
```

## 💾 Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create and run migrations
npm run db:migrate

# Reset database (⚠️ destructive)
npm run db:reset

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database with sample data
npm run db:seed

# Generate ERD diagram
npm run db:erd
```

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Lint code
npm run lint
npm run lint:fix
```

## 🚀 Deployment

### Environment Variables for Production

```bash
NODE_ENV=production
DATABASE_URL="your-production-cockroachdb-url"
JWT_SECRET="your-production-jwt-secret"
JWT_REFRESH_SECRET="your-production-refresh-secret"
REDIS_URL="your-production-redis-url"
# ... other production configs
```

### Deploy to Heroku

1. **Create Heroku app:**
   ```bash
   heroku create meeton-backend
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set DATABASE_URL="your-cockroachdb-url"
   heroku config:set JWT_SECRET="your-jwt-secret"
   # ... set all required env vars
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

4. **Run migrations:**
   ```bash
   heroku run npm run db:migrate:prod
   ```

### Deploy to Railway/Render

1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. The app will auto-deploy on commits

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📝 API Response Format

All API responses follow this consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "statusCode": 400,
    "details": []
  }
}
```

## 🔍 Monitoring & Debugging

### Health Check
Visit `http://localhost:3000/health` to check:
- Server status
- Database connectivity
- Memory usage
- Uptime

### Database GUI
Access Prisma Studio at `http://localhost:5555`:
```bash
npm run db:studio
```

### Logs
Structured JSON logging with Winston:
- Development: Console + file
- Production: JSON format for log aggregation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Database connection fails:**
   - Check your `DATABASE_URL` format
   - Ensure CockroachDB cluster is running
   - Verify network connectivity

2. **Prisma generate fails:**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again
   - Run `npm run db:generate`

3. **Migration errors:**
   - Check your schema for syntax errors
   - Ensure database permissions are correct
   - Try `npm run db:reset` for development

4. **Environment variable errors:**
   - Ensure `.env` file exists and is properly formatted
   - Check that all required variables are set
   - Restart the server after changes

### Getting Help

- Check the [Issues](https://github.com/your-repo/issues) page
- Review CockroachDB [documentation](https://www.cockroachlabs.com/docs/)
- Consult Prisma [guides](https://www.prisma.io/docs/)

---

Built with ❤️ for the MeetOn community # Last updated: Thu Jul  3 15:50:13 EEST 2025
