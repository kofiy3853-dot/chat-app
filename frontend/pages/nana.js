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
