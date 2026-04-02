# 🎓 Campus Chat

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.5-blue?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-151515?style=flat-square&logo=socket.io)](https://socket.io/)
[![OneSignal](https://img.shields.io/badge/OneSignal-Push-orange?style=flat-square&logo=onesignal)](https://onesignal.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Mobile-119EFF?style=flat-square&logo=capacitor)](https://capacitorjs.com/)

**Campus Chat** is a high-performance, real-time messaging application designed for university communities. It features a neumorphic-inspired UI, robust WebRTC audio/video calls, and a comprehensive campus interaction ecosystem.

---

## 🚀 Features

### 💬 Messaging & Interaction
- **Real-time Chat**: Lightning-fast messaging powered by Socket.io.
- **Anonymous Posting**: Share thoughts safely within the campus community.
- **Events & Announcements**: Stay updated with campus activities and official news.
- **Media Support**: Seamless image and file sharing integrated with Supabase Storage.

### 🔔 Notifications & Mobile
- **Push Notifications**: Integrated with OneSignal for real-time alerts across web and mobile.
- **Native Experience**: Packaged with Capacitor for Android and iOS support.
- **System-level Integration**: Haptics, keyboard management, and local notification support.

### 🔒 Security & Backend
- **Prisma + Supabase**: Robust relational database management with PostgreSQL.
- **JWT Authentication**: Secure user session management.
- **SSL/TLS Ready**: Production-grade connection handling for database and API.

---

## 🛠️ Project Structure

```text
├── frontend/          # Next.js Application
│   ├── components/    # Reusable UI components (Neumorphic)
│   ├── pages/         # Application routes (React)
│   ├── services/      # API and OneSignal integration
│   └── public/        # Static assets and Service Workers
└── backend/           # Express API
    ├── controllers/   # Business logic
    ├── prisma/        # Database schema and migrations
    ├── server.js      # Main entry point
    └── socket/        # Socket.io signaling & logic
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- Redis (for socket adapter)
- PostgreSQL (via Supabase)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

---

## 📱 Mobile Deployment (Capacitor)
The project is configured for mobile using `@capacitor/core`. 
To build for Android:
```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
```

---

## 📄 License
This project is licensed under the MIT License.
