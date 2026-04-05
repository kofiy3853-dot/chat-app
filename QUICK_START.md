# Quick Start - Campus Chat

## 🚀 Get Running in 5 Minutes

### Step 1: Backend Setup
```bash
cd backend
npm install
npm run db:push
npm run dev
```
✅ Backend running on http://localhost:5000

### Step 2: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
✅ Frontend running on http://localhost:3000

### Step 3: Test Login
1. Go to http://localhost:3000/register
2. Create account with @ktu.edu.gh email
3. Go to http://localhost:3000/login
4. Login with your credentials
5. ✅ You're in!

## 📋 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=your-secret-key
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
NEXT_PUBLIC_ONESIGNAL_APP_ID=...
```

## 🔧 Useful Commands

```bash
# Backend
cd backend
npm run dev              # Start dev server
npm run db:push         # Sync database
npm run db:diagnose     # Check DB connection

# Frontend
cd frontend
npm run dev             # Start dev server
npm run build           # Build for production
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check `.env` file, run `npm install` |
| Database error | Run `npm run db:push` in backend |
| Login fails | Check backend is running, check `.env.local` |
| Blank page | Check browser console (F12) for errors |
| Firebase warning | Normal if Firebase env vars not set |

## 📚 Documentation

- `SETUP_GUIDE.md` - Detailed setup instructions
- `FIXES_APPLIED.md` - What was fixed
- `LOGIN_FIX_SUMMARY.md` - Login fix details

## ✅ What's Fixed

- ✅ Firebase configuration errors won't crash app
- ✅ Login works even without Firebase
- ✅ Better error handling throughout
- ✅ Database schema verified
- ✅ All API routes working

## 🎯 Next Steps

1. Test login/register flow
2. Create test accounts
3. Test chat functionality
4. Deploy to production

## 📞 Need Help?

1. Check browser console (F12)
2. Check backend terminal logs
3. Run `npm run db:diagnose`
4. Check environment variables
5. Review documentation files

---

**You're all set! Happy coding! 🎉**
