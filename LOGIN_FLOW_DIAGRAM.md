# Login Flow Diagram

## Complete Login Flow (After Fixes)

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER OPENS LOGIN PAGE                         │
│                  http://localhost:3000/login                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: Load Login Component                      │
│  - Check if Firebase config exists                              │
│  - Initialize Firebase (if configured)                          │
│  - Render login form                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER ENTERS CREDENTIALS                             │
│  - Email: test@ktu.edu.gh                                       │
│  - Password: ••••••••                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER CLICKS "SIGN IN"                               │
│  - Frontend validates input                                     │
│  - Email and password are required                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         FRONTEND: POST /api/auth/login                           │
│  - Send email and password to backend                           │
│  - Set loading state                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         BACKEND: Receive Login Request                           │
│  - Validate input (email and password required)                 │
│  - Normalize email (lowercase, trim)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         BACKEND: Query Database                                  │
│  - Find user by email                                           │
│  - SELECT id, email, password, role, name FROM users           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐   ┌──────────────┐
            │ User Found   │   │ User Not     │
            │              │   │ Found        │
            └──────┬───────┘   └──────┬───────┘
                   │                  │
                   ▼                  ▼
            ┌──────────────┐   ┌──────────────────┐
            │ Compare      │   │ Return 401       │
            │ Password     │   │ "Invalid         │
            │ with bcrypt  │   │ credentials"     │
            └──────┬───────┘   └──────┬───────────┘
                   │                  │
            ┌──────┴──────┐           │
            │             │           │
            ▼             ▼           │
    ┌──────────────┐ ┌──────────────┐│
    │ Password     │ │ Password     ││
    │ Matches      │ │ Doesn't      ││
    │              │ │ Match        ││
    └──────┬───────┘ └──────┬───────┘│
           │                │        │
           ▼                ▼        ▼
    ┌──────────────┐ ┌──────────────────────┐
    │ Generate JWT │ │ Return 401           │
    │ Token        │ │ "Invalid credentials"│
    │ (7 day exp)  │ └──────┬───────────────┘
    └──────┬───────┘        │
           │                │
           ▼                │
    ┌──────────────┐        │
    │ Update FCM   │        │
    │ Token (if    │        │
    │ provided)    │        │
    └──────┬───────┘        │
           │                │
           ▼                │
    ┌──────────────┐        │
    │ Return 200   │        │
    │ {            │        │
    │   token,     │        │
    │   user       │        │
    │ }            │        │
    └──────┬───────┘        │
           │                │
           └────────┬───────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│         FRONTEND: Receive Response                               │
│  - Check status code                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌──────────────┐   ┌──────────────┐
            │ Status 200   │   │ Status 401   │
            │ (Success)    │   │ (Error)      │
            └──────┬───────┘   └──────┬───────┘
                   │                  │
                   ▼                  ▼
    ┌──────────────────────┐  ┌──────────────────┐
    │ Store token in       │  │ Show error       │
    │ localStorage         │  │ message          │
    │ Store user in        │  │ Stay on login    │
    │ localStorage         │  │ page             │
    └──────┬───────────────┘  └──────────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Initialize Socket.IO │
    │ with token           │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Try Firebase FCM     │
    │ (non-blocking)       │
    └──────┬───────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌──────────┐ ┌──────────────┐
│ Success  │ │ Error        │
│ Get FCM  │ │ (logged but  │
│ Token    │ │ non-blocking)│
└──────┬───┘ └──────┬───────┘
       │            │
       └────┬───────┘
            │
            ▼
    ┌──────────────────────┐
    │ Show success toast   │
    │ "Signed in!"         │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Redirect based on    │
    │ user role:           │
    │ - ADMIN → /admin     │
    │ - NANA → /nana       │
    │ - STUDENT → /        │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ ✅ LOGIN SUCCESSFUL  │
    │ User is now logged   │
    │ in and authenticated │
    └──────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                               │
└─────────────────────────────────────────────────────────────────┘

1. MISSING CREDENTIALS
   ├─ Frontend validation catches it
   ├─ Shows error: "Email and password required"
   └─ User stays on login page

2. INVALID EMAIL FORMAT
   ├─ Frontend validation catches it
   ├─ Shows error: "Please enter a valid email"
   └─ User stays on login page

3. USER NOT FOUND
   ├─ Backend returns 401
   ├─ Frontend shows: "Invalid credentials"
   └─ User stays on login page

4. WRONG PASSWORD
   ├─ Backend returns 401
   ├─ Frontend shows: "Invalid credentials"
   └─ User stays on login page

5. DATABASE ERROR
   ├─ Backend returns 500
   ├─ Frontend shows: "Server error"
   └─ User stays on login page

6. FIREBASE ERROR (NON-BLOCKING)
   ├─ Firebase initialization fails
   ├─ Error is logged to console
   ├─ Login continues successfully
   └─ User is redirected to home page

7. SOCKET.IO ERROR
   ├─ Socket connection fails
   ├─ Error is logged to console
   ├─ Login continues successfully
   └─ User is redirected to home page
```

## State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND STATE CHANGES                          │
└─────────────────────────────────────────────────────────────────┘

Initial State:
  formData: { email: '', password: '' }
  loading: false
  error: ''

User Types Email:
  formData: { email: 'test@ktu.edu.gh', password: '' }
  loading: false
  error: ''

User Types Password:
  formData: { email: 'test@ktu.edu.gh', password: 'password123' }
  loading: false
  error: ''

User Clicks Sign In:
  formData: { email: 'test@ktu.edu.gh', password: 'password123' }
  loading: true
  error: ''

Backend Returns Success:
  formData: { email: 'test@ktu.edu.gh', password: 'password123' }
  loading: false
  error: ''
  → localStorage.token = 'jwt_token_here'
  → localStorage.user = '{ id, email, name, role }'
  → Redirect to home page

Backend Returns Error:
  formData: { email: 'test@ktu.edu.gh', password: 'password123' }
  loading: false
  error: 'Invalid credentials'
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA FLOW                                     │
└─────────────────────────────────────────────────────────────────┘

Frontend → Backend:
  POST /api/auth/login
  {
    email: "test@ktu.edu.gh",
    password: "password123",
    fcmToken: "firebase_token_here" (optional)
  }

Backend → Database:
  SELECT id, email, password, role, name
  FROM users
  WHERE email = 'test@ktu.edu.gh'

Backend → Frontend:
  200 OK
  {
    message: "Login successful",
    token: "eyJhbGciOiJIUzI1NiIs...",
    user: {
      id: "uuid",
      email: "test@ktu.edu.gh",
      name: "Test User",
      role: "STUDENT",
      avatar: "https://..."
    }
  }

Frontend → localStorage:
  token: "eyJhbGciOiJIUzI1NiIs..."
  user: "{ id, email, name, role, avatar }"

Frontend → Socket.IO:
  Connect with auth: { token: "eyJhbGciOiJIUzI1NiIs..." }

Frontend → Firebase:
  Request notification permission
  Get FCM token (optional)
  Send to backend: POST /api/notifications/fcm-token

Frontend → Router:
  Redirect to "/" (or "/admin" or "/nana" based on role)
```

## Key Points

1. **Non-blocking Firebase** - Firebase errors don't prevent login
2. **Graceful Degradation** - App works without Firebase
3. **Clear Error Messages** - Users know what went wrong
4. **Secure** - Passwords are hashed, tokens are signed
5. **Responsive** - Loading state shows user something is happening
6. **Accessible** - Form labels and error messages are clear

---

This diagram shows the complete login flow with all error handling and the fixes applied.
