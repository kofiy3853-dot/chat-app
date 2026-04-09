import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  UsersIcon, 
  ChatBubbleLeftRightIcon, 
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  UserGroupIcon,
  AcademicCapIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { userAPI, chatAPI } from '../services/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalMessages: 0,
    courses: 0
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
       try {
         const user = JSON.parse(userStr);
         if (user.role === 'ADMIN') setCurrentUser(user);
       } catch (e) {
         console.error('Session error');
       }
    }
    
    // Simulate fetching admin stats
    setStats({
      totalUsers: 1248,
      onlineUsers: 342,
      totalMessages: 45892,
      courses: 24
    });
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20 overflow-x-hidden">
      <Head>
        <title>Admin Command Center | Campus Chat</title>
      </Head>

      {/* Sidebar / Topbar */}
      <header className="px-8 py-6 bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 flex items-center justify-between sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center space-x-4">
           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
           </div>
           <div>
              <h1 className="text-xl font-bold tracking-tight">Admin<span className="text-indigo-400">Hub</span></h1>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none">System Oversight Alpha</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-6">
           <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-slate-200">{currentUser.name}</p>
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter">Root Administrator</p>
           </div>
           <button 
             onClick={logout}
             className="p-2.5 bg-slate-700/50 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border border-slate-600/50"
           >
             <ArrowLeftOnRectangleIcon className="w-5 h-5" />
           </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 mt-10">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
           {[
             { label: 'Total Students', value: stats.totalUsers, icon: UsersIcon, color: 'indigo' },
             { label: 'Live Sessions', value: stats.onlineUsers, icon: GlobeAltIcon, color: 'emerald' },
             { label: 'Messages Sent', value: stats.totalMessages.toLocaleString(), icon: ChatBubbleLeftRightIcon, color: 'blue' },
             { label: 'Course Units', value: stats.courses, icon: AcademicCapIcon, color: 'violet' }
           ].map((stat, i) => (
             <motion.div 
               key={i}
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: i * 0.1 }}
               className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-xl"
             >
                <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center bg-${stat.color}-500/10 border border-${stat.color}-500/20`}>
                   <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-3xl font-black mt-1">{stat.value}</h3>
             </motion.div>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Main Activity */}
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-slate-800/40 rounded-[2.5rem] p-8 border border-slate-700/50">
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-black flex items-center gap-2">
                       <ChartBarIcon className="w-5 h-5 text-indigo-400" />
                       Traffic Analysis
                    </h2>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full font-bold uppercase">Real-time</span>
                 </div>
                 
                 {/* Visual placeholder for chart */}
                 <div className="h-48 flex items-end justify-between px-2 gap-2">
                    {[35, 62, 45, 90, 65, 85, 30, 48, 75, 40, 55, 95].map((h, i) => (
                      <motion.div 
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.5 + (i * 0.05), type: 'spring' }}
                        className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg opacity-80"
                      ></motion.div>
                    ))}
                 </div>
                 <div className="flex justify-between mt-4 text-[10px] text-slate-500 font-black uppercase px-1 tracking-tighter">
                    <span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span><span>00:00</span>
                 </div>
              </div>

              {/* User List Placeholder */}
              <div className="bg-slate-800/40 rounded-[2.5rem] p-8 border border-slate-700/50">
                 <h2 className="text-lg font-black mb-6">Recent User Activity</h2>
                 <div className="space-y-4">
                    {[
                      { name: 'Alice Cooper', role: 'Student', action: 'Joined CS302 Group', time: '2m ago' },
                      { name: 'Dr. Smith', role: 'Instructor', action: 'Uploaded Lecture Notes', time: '14m ago' },
                      { name: 'Bob Wilson', role: 'Student', action: 'Reported an anonymous post', time: '1h ago', alert: true },
                      { name: 'Nana AI', role: 'AI Agent', action: 'System cleanup performed', time: '3h ago' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-700/30">
                         <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs">
                               {item.name.charAt(0)}
                            </div>
                            <div>
                               <p className="text-sm font-bold">{item.name}</p>
                               <p className="text-[10px] text-slate-500">{item.role} • {item.action}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{item.time}</p>
                            {item.alert && <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase mt-1 inline-block">Flagged</span>}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* System Console */}
           <div className="lg:col-span-1 space-y-8">
              <div className="bg-slate-900 border border-slate-700 rounded-[2rem] p-6 font-mono text-xs overflow-hidden h-full min-h-[400px]">
                 <div className="flex items-center space-x-2 mb-4 pb-4 border-b border-slate-800">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="ml-2 text-slate-500 font-bold">System Log</span>
                 </div>
                 <div className="space-y-2 opacity-80">
                    <p className="text-indigo-400">[info] Booting security module...</p>
                    <p className="text-emerald-400">[success] Firewall operational.</p>
                    <p className="text-slate-400">[info] User session #8241 established.</p>
                    <p className="text-yellow-400">[warn] High latency detected in API gateway.</p>
                    <p className="text-slate-400">[info] Backup synchronized to AWS-S3.</p>
                    <p className="text-indigo-400">[info] Nana AI processing background tasks...</p>
                    <p className="text-slate-400">[info] Cache cleared: 452 items.</p>
                    <p className="text-emerald-400">[success] Database migrations complete.</p>
                    <div className="w-1 h-3 bg-indigo-500 animate-pulse inline-block"></div>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
