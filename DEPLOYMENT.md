# Render Deployment Guide

## Prerequisites
- GitHub repo: `kofiy3853-dot/chat-app`
- Supabase project for PostgreSQL database
- Firebase project for push notifications

## Step 1: Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repo: `kofiy3853-dot/chat-app`
4. Configure:
   - **Name**: `campus-chat-backend`
   - **Runtime**: Node
   - **Plan**: Free
   - **Region**: Ohio (US East)
   - **Build Command**: `cd backend && npm install && npx prisma generate`
   - **Start Command**: `cd backend && npm start`

## Step 2: Set Environment Variables

Go to your service → **Environment** tab → Add these variables:

### Database (from Supabase Dashboard → Settings → Database)
```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=60
```

### Supabase Storage
```
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[from Supabase Dashboard → API → service_role key]
SUPABASE_ANON_KEY=[from Supabase Dashboard → API → anon key]
```

### Server
```
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://chat-app-kappa-rose.vercel.app
```

### JWT
```
JWT_SECRET=[generate a strong random string]
JWT_EXPIRE=7d
```

### Firebase (from Firebase Console → Project Settings → Service Accounts)
```
FIREBASE_PROJECT_ID=[your-project-id]
FIREBASE_CLIENT_EMAIL=[from service account JSON]
FIREBASE_PRIVATE_KEY=[from service account JSON - include the full key with \n]
```

### OneSignal (from OneSignal Dashboard → Settings → Keys & IDs)
```
ONESIGNAL_APP_ID=[your-app-id]
ONESIGNAL_REST_API_KEY=[your-rest-api-key]
```

### TURN Server (WebRTC)
```
TURN_SERVER_URL=turn:free.expressturn.com:3478
TURN_USERNAME=000000002090062923
TURN_CREDENTIAL=XLfSTEOdOfNnsXLLOba9GkCmHW8=
```

### AI (Optional - for Nana AI chatbot)
```
OPENAI_API_KEY=[your-openrouter-api-key]
```

## Step 3: Deploy

1. Click **Create Web Service**
2. Wait for the first deployment to complete
3. Verify the health check: `https://campus-chat-backend.onrender.com/health`

## Step 4: Initialize Database

After deployment, run the database push to create tables:

The `prisma db push` command runs automatically during build via `postinstall`.

To verify tables exist, check: `https://campus-chat-backend.onrender.com/health/detailed`

## Troubleshooting

### Build fails
- Check that `DATABASE_URL` is set correctly
- Ensure Supabase pooler URL uses port `6543` for `DATABASE_URL`
- Ensure direct URL uses port `5432` for `DIRECT_URL`

### Database connection fails
- Verify Supabase project is active
- Check that SSL is enabled in Supabase settings
- The app handles SSL automatically with `rejectUnauthorized: false`

### Push notifications not working
- Verify Firebase private key includes the full key with `\n` newlines
- Check OneSignal app ID and REST API key are correct

### CORS errors
- Update `FRONTEND_URL` to match your deployed frontend URL
- Check the `ALLOWED_ORIGINS` array in `server.js`

## Health Check Endpoints

- **Basic**: `GET /health` → `{ status: "ok" }`
- **Detailed**: `GET /health/detailed` → Shows env vars and DB connectivity

## Free Tier Notes

- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes ~30-60 seconds
- Consider upgrading to Starter plan ($7/mo) for production use
