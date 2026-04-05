# Campus Chat - Login Fix Guide

## Quick Start

If login is failing, follow these steps in order:

### Step 1: Diagnose the System
```bash
cd backend
npm run db:diagnose
```

This will check:
- ✓ Environment variables
- ✓ Database connection
- ✓ Database schema
- ✓ Authentication setup

### Step 2: Initialize Database
```bash
cd backend
npm run db:init
```

This will:
- Sync Prisma schema with database
- Generate Prisma client
- Verify all tables exist

### Step 3: Test Backend
```bash
cd backend
npm start
```

Visit: `http://localhost:5000/health/detailed`

You should see:
```json
{
  "env": {
    "DATABASE_URL": true,
    "DIRECT_URL": true,
    "JWT_SECRET": true,
    "JWT_EXPIRE": true,
    "SUPABASE_URL": true,
    "SUPABASE_SERVICE_ROLE_KEY": true,
    "NODE_ENV": "production"
  },
  "database": {
    "status": "connected",
    "error": null
  }
}
```

### Step 4: Test Frontend
```bash
cd frontend
npm run build
npm start
```

Visit: `http://localhost:3000/login`

## Common Issues & Solutions

### Issue 1: "Invalid credentials" on login
**Cause:** User doesn't exist in database

**Solution:**
1. Go to `/register` page
2. Create a new account with:
   - Email: `test@stu.ktu.edu.gh` (must be KTU domain)
   - Password: Any password (min 6 chars)
   - Name: Your name
   - Student ID: Any ID
   - Department: Any department
   - Profile picture: Upload any image

### Issue 2: Database connection failed
**Cause:** DATABASE_URL or DIRECT_URL not set

**Solution:**
1. Check `backend/.env` file
2. Ensure both DATABASE_URL and DIRECT_URL are set
3. Verify credentials are correct
4. Run: `npm run db:diagnose`

### Issue 3: "JWT_SECRET is not set"
**Cause:** JWT_SECRET environment variable missing

**Solution:**
1. Check `backend/.env` file
2. Ensure JWT_SECRET is set (should be: `campus-chat-super-secret-jwt-key-2024`)
3. Restart backend server

### Issue 4: Frontend build fails
**Cause:** TypeScript or Next.js configuration issues

**Solution:**
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

### Issue 5: Socket.IO connection fails after login
**Cause:** Backend not running or CORS misconfigured

**Solution:**
1. Ensure backend is running: `npm start` in backend folder
2. Check browser console for specific error
3. Verify FRONTEND_URL in `backend/.env` matches your frontend URL

## Testing Login Flow

### Manual Test
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm start`
3. Go to `http://localhost:3000/login`
4. Register new account
5. Login with credentials
6. Should redirect to home page

### API Test
```bash
# Test login endpoint directly
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@stu.ktu.edu.gh","password":"password123"}'
```

Expected response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "test@stu.ktu.edu.gh",
    "name": "Test User",
    "role": "STUDENT"
  },
  "redirectTo": "/"
}
```

## Environment Variables Checklist

### Backend (.env)
- [ ] DATABASE_URL - Supabase PostgreSQL connection
- [ ] DIRECT_URL - Supabase direct connection
- [ ] JWT_SECRET - JWT signing key
- [ ] JWT_EXPIRE - Token expiration (default: 7d)
- [ ] SUPABASE_URL - Supabase project URL
- [ ] SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
- [ ] ONESIGNAL_APP_ID - OneSignal app ID
- [ ] ONESIGNAL_REST_API_KEY - OneSignal API key
- [ ] PORT - Server port (default: 5000)
- [ ] FRONTEND_URL - Frontend URL for CORS

### Frontend (.env.local for dev, .env.production for prod)
- [ ] NEXT_PUBLIC_API_URL - Backend API URL
- [ ] NEXT_PUBLIC_SUPABASE_URL - Supabase URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
- [ ] NEXT_PUBLIC_ONESIGNAL_APP_ID - OneSignal app ID
- [ ] NEXT_PUBLIC_VAPID_PUBLIC_KEY - Web push VAPID key

## Database Schema

The system uses PostgreSQL with Prisma ORM. Key tables:

- **User** - User accounts with email, password, role
- **Conversation** - Direct/group/course chats
- **ConversationParticipant** - User membership in conversations
- **Message** - Chat messages
- **Notification** - User notifications
- **Course** - Course information
- **Event** - Campus events
- **Status** - User status updates

## Troubleshooting Commands

```bash
# Check database connection
npm run db:diagnose

# Sync schema with database
npm run db:push

# Generate Prisma client
npm run db:generate

# View backend logs
npm start

# Clear frontend cache
cd frontend && rm -rf .next out node_modules && npm install

# Test API endpoint
curl http://localhost:5000/health/detailed
```

## Still Having Issues?

1. Check backend console for error messages
2. Check browser console (F12) for frontend errors
3. Verify all environment variables are set
4. Run `npm run db:diagnose` to identify issues
5. Check database directly using Supabase dashboard

## Production Deployment

For Render/Vercel deployment:

1. Set all environment variables in deployment platform
2. Run: `npm run db:init` after deployment
3. Verify health check: `https://your-backend.onrender.com/health/detailed`
4. Test login on production frontend

---

**Last Updated:** April 5, 2026
**Version:** 1.0.0
