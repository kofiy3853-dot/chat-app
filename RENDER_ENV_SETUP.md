# Render Environment Variables Setup

## ⚠️ CRITICAL: Your environment variables are NOT set on Render

The deployment is failing because Render doesn't have access to your `.env` file. You must add these variables manually to the Render dashboard.

## Quick Setup via Render Dashboard

1. Go to: https://dashboard.render.com/
2. Select your service: **campus-chat-backend-m7wy**
3. Click **Environment** tab
4. Add the following variables (copy values from `backend/.env`):

### Database
```
DATABASE_URL=<your-database-url>
DIRECT_URL=<your-direct-url>
```

### Supabase Storage
```
SUPABASE_URL=https://<your-supabase-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### JWT
```
JWT_SECRET=campus-chat-super-secret-jwt-key-2024
JWT_EXPIRE=7d
```

### Server
```
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=production
```

### Firebase
```
FIREBASE_PROJECT_ID=<your-firebase-project-id>
FIREBASE_CLIENT_EMAIL=<your-firebase-client-email>
FIREBASE_PRIVATE_KEY="<your-firebase-private-key>"
```

### OneSignal
```
ONESIGNAL_APP_ID=<your-onesignal-app-id>
ONESIGNAL_REST_API_KEY=<your-onesignal-api-key>
```

### TURN Server
```
TURN_SERVER_URL=turn:free.expressturn.com:3478
TURN_USERNAME=000000002090062923
TURN_CREDENTIAL=XLfSTEOdOfNnsXLLOba9GkCmHW8=
```

### AI
```
OPENAI_API_KEY=<your-openai-api-key>
```

## Step-by-Step Instructions

1. **Copy all variables** from the sections above
2. Go to Render Dashboard → Your Service → Environment
3. Click "Add Environment Variable" for each one
4. **Paste the key and value**
5. Click "Save"
6. **Redeploy** by going to Deploys → Redeploy Latest Commit

## Alternative: Using Render's CLI (if available)

If Render has a CLI tool, you can use it to set variables in bulk.

## Verification

After redeploying, check if variables are set by visiting:
```
https://campus-chat-backend-m7wy.onrender.com/health/detailed
```

You should see:
```json
{
  "env": {
    "DATABASE_URL": true,
    "DIRECT_URL": true,
    "JWT_SECRET": true,
    "NODE_ENV": "production"
  },
  "database": {
    "status": "connected"
  }
}
```

If all are `true` and database is `connected`, you're good to go!
