import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ProfileCard from '../components/ProfileCard';
import { authAPI } from '../services/api';
import { disconnectSocket } from '../services/socket';
import { useTheme } from '../context/ThemeContext';
import { 
  ArrowRightOnRectangleIcon,
  KeyIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  LockClosedIcon,
  SwatchIcon,
  CheckCircleIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';

export default function Account() {
  const router = useRouter();
  const { theme, setTheme, availableThemes } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBg, setActiveBg] = useState('bg-slate-50/50');

  useEffect(() => {
    const saved = localStorage.getItem('chat_bg_color');
    if (saved) setActiveBg(saved);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleUpdateProfile = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const setChatBg = (bg) => {
    setActiveBg(bg);
    localStorage.setItem('chat_bg_color', bg);
    // Alert or small toast if we had one
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-[10px]" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)' }}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Account...</p>
        </div>
      </div>
    );
  }

  const sections = [
    ...(user?.role === 'ADMIN' ? [{
      title: 'Administration',
      items: [
        { icon: ShieldCheckIcon, label: 'Admin Command Center', color: 'bg-indigo-600 text-white', href: '/admin', badge: 'Active' }
      ]
    }] : []),
    {
      title: 'Security & Access',
      items: [
        { icon: KeyIcon, label: 'Change Password', color: 'bg-amber-50 text-amber-600' },
        { icon: ShieldCheckIcon, label: 'Two-Factor Auth', color: 'bg-emerald-50 text-emerald-600', badge: 'New' },
        { icon: LockClosedIcon, label: 'Privacy Settings', color: 'bg-indigo-50 text-indigo-600' }
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: BellIcon, label: 'Notifications', color: 'bg-rose-50 text-rose-600' },
        { icon: GlobeAltIcon, label: 'Language', color: 'bg-blue-50 text-blue-600', value: 'English' }
      ]
    }
  ];

  const handleItemClick = (item) => {
    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <>
      <Head>
        <title>Account | Campus Chat</title>
      </Head>
      
      <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg-page)' }}>
        {/* Header - Royal Blue */}
        <header className="sticky top-0 z-30 bg-primary-600 px-4 pt-[max(env(safe-area-inset-top,0px),40px)] pb-5 shadow-md transition-all">
          <div className="max-w-xl mx-auto px-2">
            <h1 className="text-xl font-black text-white tracking-tight leading-tight">Account</h1>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-0.5">Academic Profile & Settings</p>
          </div>
        </header>

        <div className="max-w-2xl mx-auto p-4 space-y-8">

          {/* Profile Card */}
          <ProfileCard user={user} onUpdate={handleUpdateProfile} />

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* Theme Hub - 10 Dynamic Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Theme Hub</h3>
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[8px] font-black uppercase rounded">10 Options</span>
              </div>
              <div className="rounded-[2.5rem] p-6 shadow-2xl border transition-all duration-500" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                    <SwatchIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="block text-sm font-black" style={{ color: 'var(--text-primary)' }}>Visual Identity</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Current: {availableThemes.find(t => t.id === theme)?.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  {availableThemes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className="group relative flex flex-col items-center space-y-2 focus:outline-none"
                    >
                      <div 
                        className={`w-full aspect-square rounded-2xl border-4 transition-all duration-300 flex items-center justify-center shadow-sm group-hover:scale-110 group-active:scale-95 ${
                          theme === t.id ? 'border-primary-500 scale-110 shadow-xl shadow-primary-500/20' : 'border-transparent hover:border-slate-200'
                        }`}
                        style={{ backgroundColor: t.color }}
                      >
                        {theme === t.id && (
                          <div className="bg-primary-500 rounded-full p-1 shadow-lg animate-in zoom-in-50 duration-300">
                            <CheckCircleIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {theme !== t.id && (
                          <div className="w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: t.textColor }}></div>
                        )}
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-tighter truncate w-full text-center" style={{ color: theme === t.id ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {t.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat Wallpaper Hub */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Chat Wallpaper</h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded">6 Presets</span>
              </div>
              <div className="rounded-[2.5rem] p-6 shadow-2xl border transition-all" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="grid grid-cols-6 gap-3">
                  {[
                    { id: 'bg-white', name: 'Original', color: '#ffffff' },
                    { id: 'bg-slate-50/50', name: 'Dotted', color: '#f8fafc' },
                    { id: 'bg-[#fffbeb]', name: 'Parchment', color: '#fffbeb' },
                    { id: 'bg-[#0f172a]', name: 'Midnight', color: '#0f172a' },
                    { id: 'bg-sky-50', name: 'Cloud', color: '#f0f9ff' },
                    { id: 'bg-primary-500', name: 'Sea', color: '#2E8BC0' }
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setChatBg(bg.id)}
                      className={`relative flex flex-col items-center space-y-2 group transition-all`}
                    >
                      <div 
                        className={`w-full aspect-square rounded-xl border-2 transition-all shadow-sm flex items-center justify-center ${
                          activeBg === bg.id ? 'border-primary-500 scale-110 shadow-lg' : 'border-slate-100 hover:border-slate-300'
                        }`}
                        style={{ backgroundColor: bg.color }}
                      >
                        {activeBg === bg.id && <CheckCircleIcon className="w-4 h-4 text-primary-500" />}
                      </div>
                      <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400">{bg.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>{section.title}</h3>
                <div className="rounded-3xl shadow-xl shadow-slate-200/40 border overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <div className="divide-y divide-slate-50">
                    {section.items.map((item, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleItemClick(item)}
                        className="w-full px-6 py-5 flex items-center justify-between transition-all group"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-11 h-11 rounded-2xl ${item.color} flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <span className="block text-sm font-black text-slate-700">{item.label}</span>
                            {item.value && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.value}</span>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {item.badge && (
                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-md shadow-lg shadow-emerald-500/20">
                              {item.badge}
                            </span>
                          )}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5 text-slate-200 group-hover:text-slate-400 transition-colors">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Logout */}
          <div className="px-2 pt-4">
            <button
              onClick={handleLogout}
              className="w-full group hover:bg-rose-600 p-1.5 rounded-[2rem] border shadow-xl shadow-slate-200/50 transition-all active:scale-95 overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 p-3.5 h-full">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <ArrowRightOnRectangleIcon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-black text-slate-800 group-hover:text-white transition-colors">Sign out session</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-rose-200 transition-colors">Protect your data</span>
                  </div>
                </div>
                <div className="pr-6">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-rose-500 group-hover:border-rose-400 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 text-slate-300 group-hover:text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Footer App Info */}
          <div className="text-center py-12">
            <div className="inline-block p-1 bg-white rounded-full border border-slate-100 mb-4 px-3">
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Build 992-0219-X</span>
            </div>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Campus Chat Professional v1.2.4</p>
            <p className="text-[9px] text-slate-200 mt-2 font-medium">© 2026 Secured Academic Infrastructure Group.</p>
          </div>
        </div>
      </div>
    </>
  );
}

