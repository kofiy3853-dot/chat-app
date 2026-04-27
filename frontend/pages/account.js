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
  CheckIcon,
  XMarkIcon,
  ChatBubbleBottomCenterTextIcon,
  LanguageIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { pushAPI } from '../services/api';

export default function Account() {
  const router = useRouter();
  const { theme, setTheme, availableThemes } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBg, setActiveBg] = useState('bg-slate-50/50');
  const [activeModal, setActiveModal] = useState(null);

  // Settings states
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: true,
    showReadReceipts: true,
    allowCourseDiscovery: true
  });
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailAlerts: false,
    soundEnabled: true
  });
  const [language, setLanguage] = useState('English');

  useEffect(() => {
    const saved = localStorage.getItem('chat_bg_color');
    if (saved) setActiveBg(saved);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // 1. Read from localStorage immediately — zero latency, no 401 risk
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (_) {}
    }
    setLoading(false);

    // 2. Silently refresh from server in background (non-blocking)
    // We use a raw fetch here to bypass the global axios 401 interceptor
    // so a stale/expired session doesn't nuke localStorage and force a redirect
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
      // If 401, silently ignore — user still sees their cached profile
    } catch (_) {
      // Network error — silently ignore
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
    toast.success('Chat background updated', {
      style: { background: '#333', color: '#fff', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }
    });
  };

  const handleItemClick = (item) => {
    if (item.href) {
      router.push(item.href);
    } else {
      setActiveModal(item.id);
    }
  };

  const closeModal = () => setActiveModal(null);

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
        { id: 'admin', icon: ShieldCheckIcon, label: 'Admin Command Center', color: 'bg-indigo-600 text-white', href: '/admin', badge: 'Active' }
      ]
    }] : []),
    {
      title: 'Security & Access',
      items: [
        { id: 'password', icon: KeyIcon, label: 'Change Password', color: 'bg-amber-50 text-amber-600' },
        { id: '2fa', icon: ShieldCheckIcon, label: 'Two-Factor Auth', color: 'bg-emerald-50 text-emerald-600', badge: tfaEnabled ? 'On' : 'New' },
        { id: 'privacy', icon: LockClosedIcon, label: 'Privacy Settings', color: 'bg-indigo-50 text-indigo-600' }
      ]
    },
    {
      title: 'Preferences',
      items: [
        { id: 'notifications', icon: BellIcon, label: 'Notifications', color: 'bg-rose-50 text-rose-600' },
        { id: 'language', icon: GlobeAltIcon, label: 'Language', color: 'bg-blue-50 text-blue-600', value: language }
      ]
    }
  ];

  return (
    <>
      <Head>
        <title>Account | Campus Chat</title>
      </Head>
      
      <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg-page)' }}>
        <header className="sticky top-0 z-30 bg-primary-600 px-3 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2 h-14 shadow-md transition-all">
          <div className="max-w-xl mx-auto px-2">
            <h1 className="text-xl font-black text-white tracking-tight leading-tight">Account</h1>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-0.5">Academic Profile & Settings</p>
          </div>
        </header>

        <div className="max-w-2xl mx-auto p-4 space-y-8">
          <ProfileCard user={user} onUpdate={handleUpdateProfile} />

            <div className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Chat Wallpaper</h3>
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
                    <button key={bg.id} onClick={() => setChatBg(bg.id)} className={`relative flex flex-col items-center space-y-2 transition-all`}>
                      <div className={`w-full aspect-square rounded-xl border-2 transition-all shadow-sm flex items-center justify-center ${activeBg === bg.id ? 'border-primary-500 scale-110 shadow-lg' : 'border-slate-100 hover:border-slate-300'}`} style={{ backgroundColor: bg.color }}>
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
                      <button key={i} onClick={() => handleItemClick(item)} className="w-full px-6 py-5 flex items-center justify-between group" style={{ backgroundColor: 'var(--bg-surface)' }}>
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
                          {item.badge && <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-md shadow-lg shadow-emerald-500/20">{item.badge}</span>}
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

          <div className="px-2 pt-4">
            <button onClick={handleLogout} className="w-full bg-rose-50/50 hover:bg-rose-100/50 p-1.5 rounded-[2rem] border border-rose-100 shadow-xl transition-all active:scale-95 group">
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200">
                    <ArrowRightOnRectangleIcon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-black text-slate-800">Sign out session</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End active login</span>
                  </div>
                </div>
                <div className="pr-2"><CheckIcon className="w-5 h-5 text-rose-300" /></div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {activeModal && (
        <SettingsModal 
          type={activeModal} 
          onClose={closeModal} 
          states={{ tfaEnabled, setTfaEnabled, privacySettings, setPrivacySettings, notificationSettings, setNotificationSettings, language, setLanguage }}
        />
      )}
    </>
  );
}

function SettingsModal({ type, onClose, states }) {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  const handleTestPush = async () => {
    setTestLoading(true);
    try {
      const response = await pushAPI.testPush();
      toast.success(response.data.message, { 
        icon: '🚀', 
        duration: 5000,
        style: { background: '#1e293b', color: '#fff', borderRadius: '16px' }
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Permission denied by browser');
    } finally {
      setTestLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authAPI.changePassword({ 
        currentPassword: passwordData.current, 
        newPassword: passwordData.new 
      });
      toast.success('Password updated successfully');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch(type) {
      case 'password':
        return (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
              <input type="password" required value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold outline-none" placeholder="••••••••" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
              <input type="password" required value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold outline-none" placeholder="••••••••" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
              <input type="password" required value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-amber-500/20 active:scale-95 transition-all mt-4">
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
        );
      case '2fa':
        return (
          <div className="space-y-6 text-center">
            <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center transition-all ${states.tfaEnabled ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-100 text-slate-400'} shadow-2xl`}>
              <ShieldCheckIcon className={`w-10 h-10 ${states.tfaEnabled ? 'text-white' : ''}`} />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-800 tracking-tight">Two-Factor Authentication</h4>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 px-4 leading-relaxed">Add an extra layer of security to your academic account using a mobile Authenticator.</p>
            </div>
            <button 
              onClick={() => { states.setTfaEnabled(!states.tfaEnabled); toast.success(`2FA ${!states.tfaEnabled ? 'Enabled' : 'Disabled'}`); }}
              className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg ${states.tfaEnabled ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white shadow-emerald-600/20'}`}
            >
              {states.tfaEnabled ? 'Disable Protection' : 'Enable Secure Access'}
            </button>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-4">
            {[
              { id: 'showOnlineStatus', label: 'Show Online Status', desc: 'Allow others to see when you are active' },
              { id: 'showReadReceipts', label: 'Read Receipts', desc: 'Sync message read status across devices' },
              { id: 'allowCourseDiscovery', label: 'Course Visibility', desc: 'Let faculty members find your profile' }
            ].map(setting => (
              <div key={setting.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1 pr-4">
                  <span className="block text-sm font-black text-slate-800">{setting.label}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{setting.desc}</span>
                </div>
                <button 
                  onClick={() => states.setPrivacySettings({...states.privacySettings, [setting.id]: !states.privacySettings[setting.id]})}
                  className={`w-12 h-6 rounded-full transition-all relative ${states.privacySettings[setting.id] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${states.privacySettings[setting.id] ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-4">
            {[
              { id: 'pushNotifications', label: 'Push Notifications', desc: 'Real-time alerts for new messages' },
              { id: 'emailAlerts', label: 'Email Summaries', desc: 'Weekly roundup of academic activity' },
              { id: 'soundEnabled', label: 'Notification Sounds', desc: 'Play sounds for incoming events' }
            ].map(setting => (
              <div key={setting.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1 pr-4">
                  <span className="block text-sm font-black text-slate-800">{setting.label}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{setting.desc}</span>
                </div>
                <button 
                  onClick={() => states.setNotificationSettings({...states.notificationSettings, [setting.id]: !states.notificationSettings[setting.id]})}
                  className={`w-12 h-6 rounded-full transition-all relative ${states.notificationSettings[setting.id] ? 'bg-rose-500' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${states.notificationSettings[setting.id] ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            ))}
            
            <div className="pt-4 mt-4 border-t border-slate-100">
              <button 
                onClick={handleTestPush}
                disabled={testLoading}
                className="w-full flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100 hover:bg-rose-100/50 transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-lg ${testLoading ? 'animate-pulse' : ''}`}>
                    <BellIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-black text-slate-800">Test Configuration</span>
                    <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest">Verify device registration</span>
                  </div>
                </div>
                {testLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4 text-primary-300 group-hover:text-primary-600 transition-colors" />
                )}
              </button>
            </div>
          </div>
        );
      case 'language':
        return (
          <div className="space-y-3">
            {['English', 'Twi (Akan)', 'French', 'Spanish'].map(lang => (
              <button 
                key={lang}
                onClick={() => { states.setLanguage(lang); toast.success(`Language set to ${lang}`); onClose(); }}
                className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${states.language === lang ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' : 'bg-slate-50 border-slate-100'}`}
              >
                <div className="flex items-center space-x-3">
                  <LanguageIcon className={`w-5 h-5 ${states.language === lang ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-black ${states.language === lang ? 'text-blue-700' : 'text-slate-600'}`}>{lang}</span>
                </div>
                {states.language === lang && <CheckCircleIcon className="w-5 h-5 text-blue-600" />}
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">
            {type.replace(/([A-Z])/g, ' $1').replace('_', ' ')} Settings
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100 shadow-sm">
            <XMarkIcon className="w-5 h-5 stroke-[2.5px]" />
          </button>
        </div>
        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

