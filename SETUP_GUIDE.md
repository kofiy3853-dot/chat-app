# Campus Chat - Setup & Deployment Guide

## Quick Start (Development)

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Supabase)
- Firebase project (optional, for push notifications)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Ensure database schema is synced
npm run db:push

# Start development server
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

## Environment Configuration

### Backend (.env)
Create `backend/.env` with:
```
# Database
DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://user:password@host:port/database?sslmode=require"

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# Supabase (File Storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Firebase (Optional - for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
Create `frontend/.env.local` with:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-key
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-id

# Firebase (Optional)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
```

## Database Setup

### Using Supabase

1. Create a new Supabase project
2. Get your connection strings from Project Settings → Database
3. Add to `.env`:
   - `DATABASE_URL` - Connection pooler URL
   - `DIRECT_URL` - Direct connection URL

### Sync Schema

```bash
cd backend
npm run db:push
```

This will create all tables and relationships defined in `prisma/schema.prisma`

## Testing Login

### Create Test Account

1. Go to `http://localhost:3000/register`
2. Fill in form:
   - Name: Test User
   - Email: test@ktu.edu.gh (must end with @ktu.edu.gh)
   - Password: testpass123
   - Student ID: 12345
   - Department: Computer Science
   - Faculty: Engineering
   - Level: 200
   - Upload profile picture
3. Click "Sign Up"

### Login

1. Go to `http://localhost:3000/login`
2. Enter:
   - Email: test@ktu.edu.gh
   - Password: testpass123
3. Click "Sign In"
4. Should redirect to home page

## Production Deployment

### Frontend (Vercel)

```bash
# Push to GitHub
git push origin main

# Vercel will auto-deploy
# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
# - Other NEXT_PUBLIC_* variables
```

### Backend (Render)

```bash
# Create new Web Service on Render
# Connect GitHub repository
# Set environment variables in Render dashboard
# Deploy
```

## Troubleshooting

### Login Not Working

1. Check backend is running: `curl http://localhost:5000/health`
2. Check database connection: `curl http://localhost:5000/health/detailed`
3. Check browser console for errors (F12)
4. Check backend logs for error messages

### Database Connection Error

```bash
# Test connection
cd backend
npm run db:diagnose
```

### Firebase Errors

Firebase is optional. If you see Firebase errors:
- They won't block login
- Check browser console for details
- Add Firebase env vars if you want push notifications

### Socket.IO Connection Failed

1. Check backend is running
2. Check CORS configuration in `backend/server.js`
3. Check frontend API URL in `.env.local`

## Common Commands

```bash
# Backend
cd backend
npm run dev              # Start dev server
npm run db:push         # Sync database schema
npm run db:generate     # Generate Prisma client
npm run db:diagnose     # Check database connection

# Frontend
cd frontend
npm run dev             # Start dev server
npm run build           # Build for production
npm run lint            # Run linter
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  - Pages: login, register, chat, courses, events, etc.      │
│  - Services: API client, Socket.IO, Firebase               │
│  - Components: Chat, Messages, Navbar, etc.                │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Express.js)                        │
│  - Routes: /api/auth, /api/chat, /api/courses, etc.        │
│  - Controllers: Handle business logic                       │
│  - Middleware: Auth, validation, error handling            │
│  - Socket.IO: Real-time messaging                          │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL/Supabase)                  │
│  - Users, Messages, Conversations, Courses, etc.           │
│  - Relationships and indexes for performance               │
└─────────────────────────────────────────────────────────────┘
```

## Support

For issues or questions:
1. Check the logs (backend console, browser console)
2. Review error messages carefully
3. Check environment variables are set correctly
4. Verify database connection
5. Check network connectivity
