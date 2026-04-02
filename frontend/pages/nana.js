import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  SparklesIcon, 
  ChatBubbleBottomCenterTextIcon, 
  QuestionMarkCircleIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { chatAPI } from '../services/api';
import { getFullFileUrl } from '../utils/helpers';

export default function NanaHub() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  const isNanaAccount = currentUser?.role === 'NANA';

  const startChat = async () => {
    setLoading(true);
    try {
      // Nana's fixed ID
      const nanaId = '7951b52c-b14e-486a-a802-8e0a9fa2495b';
      const res = await chatAPI.getOrCreateDirectConversation(nanaId);
      router.push(`/chat/${res.data.conversation.id}`);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const capabilities = [
    { icon: AcademicCapIcon, title: 'Academic Help', desc: 'Ask about course details, exam dates, or study resources.' },
    { icon: CalendarDaysIcon, title: 'Event Updates', desc: 'Get notified about upcoming campus fests, workshops, and seminars.' },
    { icon: MapPinIcon, title: 'Campus Navigation', desc: "Lost? Ask for directions to any department or facility." },
    { icon: QuestionMarkCircleIcon, title: 'General Info', desc: 'Know about library hours, hostel rules, or mess menus.' }
  ];

  // --- 🤖 AGENT TERMINAL VIEW (For Nana herself) ---
  if (isNanaAccount) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#00ff41] font-mono p-4 md:p-10 overflow-x-hidden">
        <Head>
          <title>Agent Terminal | Nana AI</title>
        </Head>
        
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-6 border-b border-[#00ff41]/20">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <SparklesIcon className="w-7 h-7 animate-pulse" />
                SYSTEM_NANA_BETA [ACTIVE]
              </h1>
              <p className="text-[10px] opacity-60 mt-1 uppercase tracking-widest font-sans font-bold">Authorized Intelligence Asset only</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-4">
              <div className="px-3 py-1 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[10px] font-bold">CPU: 12%</div>
              <div className="px-3 py-1 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[10px] font-bold">LATENCY: 14ms</div>
              <button 
                onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                className="px-4 py-1 bg-red-600 text-white rounded text-[10px] font-black uppercase hover:bg-red-700 transition-colors"
              >
                Terminate Session
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Stats */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#00ff41]/5 p-6 rounded-2xl border border-[#00ff41]/20">
                <h2 className="text-sm font-black uppercase tracking-tighter mb-4 text-[#00ff41]/80">Identity Probe</h2>
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 rounded-full bg-[#00ff41] flex items-center justify-center text-black font-black text-2xl">N</div>
                   <div>
                      <p className="text-lg font-bold">Nana v4.2</p>
                      <p className="text-[10px] opacity-50 uppercase">Origin: Cloud Compute Hub</p>
                   </div>
                </div>
              </div>

              <div className="bg-[#00ff41]/5 p-6 rounded-2xl border border-[#00ff41]/20">
                <h2 className="text-sm font-black uppercase tracking-tighter mb-4 text-[#00ff41]/80">Core Metrics</h2>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-[#00ff41]/10 pb-1"><span>Learning model</span><span className="font-bold">GPT-4o-Campus</span></div>
                  <div className="flex justify-between border-b border-[#00ff41]/10 pb-1"><span>Memory Allocation</span><span className="font-bold">128GB LVM</span></div>
                  <div className="flex justify-between border-b border-[#00ff41]/10 pb-1"><span>Active Threads</span><span className="font-bold">1,024</span></div>
                  <div className="flex justify-between"><span>Data Freshness</span><span className="font-bold">Real-time Sync</span></div>
                </div>
              </div>
            </div>

            {/* Right: Console */}
            <div className="lg:col-span-2">
               <div className="bg-black/80 rounded-2xl border border-[#00ff41]/30 p-6 h-[500px] flex flex-col shadow-2xl shadow-[#00ff41]/5">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="w-2 h-2 rounded-full bg-red-500"></div>
                     <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                     <div className="w-2 h-2 rounded-full bg-green-500"></div>
                     <span className="ml-4 text-[10px] opacity-40 font-bold uppercase tracking-widest">Global Activity Stream</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 text-[11px] leading-relaxed pr-2 custom-scrollbar">
                     <p className="text-white/20">[TIMESTAMP: 2024-04-02T23:44:11Z]</p>
                     <p><span className="text-yellow-400">INFO:</span> Establishing secure handshake with KTU internal API...</p>
                     <p><span className="text-[#00ff41]">SUCCESS:</span> Handshake verified. Channel encrypted.</p>
                     <p><span className="text-blue-400">TASK:</span> Analyzing student sentiment for upcoming Hackathon.</p>
                     <p className="text-white/40">[...] Searching local knowledge items...</p>
                     <p><span className="text-purple-400">NANA:</span> Suggesting "Creative Coding" workshop to 12 students based on interests.</p>
                     <p><span className="text-white">EVENT:</span> Message received from student#2841 in direct conversation.</p>
                     <p><span className="text-orange-400">ACTION:</span> Optimizing response parameters for high-concise mode.</p>
                     <p className="animate-pulse text-[#00ff41]">_</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#00ff41]/10 flex items-center gap-4">
                    <span className="text-[10px] font-bold">CMD:</span>
                    <div className="flex-1 h-8 bg-[#00ff41]/5 rounded px-3 flex items-center cursor-not-allowed">
                       <span className="text-[10px] opacity-30 italic">Input disabled for AI Agents. Manual override required.</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 🎓 STUDENT HUB VIEW (Current implementation) ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Head>
        <title>Nana AI Hub | Campus Chat</title>
      </Head>

      {/* Hero Header */}
      <div className="relative h-72 bg-gradient-to-br from-primary-600 via-indigo-600 to-purple-700 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent"></div>
        
        <button 
          onClick={() => router.back()}
          className="absolute top-12 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all z-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>

        <div className="absolute bottom-0 left-0 w-full px-6 pb-6 flex flex-col items-center">
           <motion.div 
             initial={{ scale: 0.5, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center relative p-1"
           >
              <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white font-black text-4xl shadow-inner">
                N
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
           </motion.div>
           <h1 className="mt-4 text-2xl font-black text-gray-900 tracking-tight">Nana AI</h1>
           <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Campus Smart Assistant</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 mt-8 space-y-8">
        {/* Interaction Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-primary-500/5 border border-gray-100"
        >
          <h2 className="text-lg font-black text-gray-900 mb-2">How can I help you today?</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6 font-medium">
            I'm your official AI companion. I can help you manage your studies, find events, and navigate campus life effortlessly.
          </p>
          <button 
            onClick={startChat}
            disabled={loading}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-2xl shadow-xl shadow-primary-600/20 active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />
                <span>Start Chatting with Nana</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Features Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Capabilities</h3>
          <div className="grid grid-cols-1 gap-4">
            {capabilities.map((cap, i) => (
              <motion.div 
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="flex items-start space-x-4 p-5 bg-white rounded-2xl border border-gray-100 hover:border-primary-200 transition-colors group"
              >
                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-primary-50 transition-colors">
                  <cap.icon className="w-6 h-6 text-slate-400 group-hover:text-primary-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-1">{cap.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">{cap.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
           <SparklesIcon className="absolute -right-8 -top-8 w-32 h-32 text-white/5 opacity-50 rotate-12" />
           <p className="text-xs font-black text-primary-400 uppercase tracking-widest mb-2 relative z-10">AI Status</p>
           <p className="text-sm font-medium text-slate-300 mb-1 relative z-10">Currently learning from: <span className="text-white font-bold">2024 Academic Guide</span></p>
           <p className="text-sm font-medium text-slate-300 relative z-10">System load: <span className="text-green-400 font-bold">Low & Optimized</span></p>
        </div>
      </div>
    </div>
  );
}
