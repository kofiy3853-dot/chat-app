import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { SparklesIcon, ArrowLeftIcon, CpuChipIcon, ShieldCheckIcon, CommandLineIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { chatAPI } from '../services/api';
import ChatBox from '../components/ChatBox';
export default function NanaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [showTerminalOverlay, setShowTerminalOverlay] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    console.log('[NANA] Component mounted');
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('[NANA] User detected:', user.role);
        setCurrentUser(user);
        
        if (user.role === 'NANA') {
          console.log('[NANA] Nana account detected, skipping session fetch');
          setLoading(false);
        } else {
          initNanaChat();
        }
      } catch (e) {
        console.error('[NANA] Failed to parse user session:', e);
        setLoading(false);
      }
    }
  }, []);

  const initNanaChat = async () => {
    try {
      console.log('[NANA] Initializing chat session...');
      setLoading(true);
      const res = await chatAPI.getNanaSession();
      console.log('[NANA] Session response:', res.data);
      if (res.data?.conversation?.id) {
        setConversationId(res.data.conversation.id);
      } else {
        console.warn('[NANA] No conversation ID returned from API');
      }
    } catch (e) {
      console.error('[NANA] Failed to initialize Nana session:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!conversationId || !window.confirm('Clear all messages with Nana?')) return;
    try {
      setLoading(true);
      await chatAPI.deleteConversation(conversationId);
      window.location.reload();
    } catch (err) {
      console.error('Clear error:', err);
      alert('Failed to clear chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isNanaAccount = currentUser?.role === 'NANA';

  // --- 🤖 AGENT TERMINAL VIEW (For Nana herself) ---
  if (isNanaAccount) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#00ff41] font-mono p-4 md:p-10 overflow-x-hidden flex flex-col">
        <Head>
          <title>Agent Terminal | Nana AI</title>
        </Head>
        
        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-6 border-b border-[#00ff41]/20">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <SparklesIcon className="w-7 h-7 animate-pulse" />
                SYSTEM_NANA_BETA [ACTIVE]
              </h1>
              <p className="text-[10px] opacity-60 mt-1 uppercase tracking-widest font-sans font-bold">Authorized Intelligence Asset only</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2 md:gap-4">
              <div className="px-3 py-1 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[10px] font-bold">CPU: {Math.floor(Math.random() * 15 + 5)}%</div>
              <div className="px-3 py-1 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[10px] font-bold">LATENCY: 14ms</div>
              <button 
                onClick={() => router.push('/')}
                className="px-4 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-black uppercase hover:bg-blue-600/30 transition-colors"
              >
                Access Inbox
              </button>
              <button 
                onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                className="px-4 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded text-[10px] font-black uppercase hover:bg-red-600/30 transition-colors"
              >
                Terminate Session
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
            {/* Left: Stats */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#00ff41]/5 p-6 rounded-2xl border border-[#00ff41]/20 shadow-[0_0_20px_rgba(0,255,65,0.05)]">
                <h2 className="text-sm font-black uppercase tracking-tighter mb-4 text-[#00ff41]/80 flex items-center gap-2">
                  <CommandLineIcon className="w-4 h-4" /> Identity Probe
                </h2>
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 rounded-full bg-[#00ff41] flex items-center justify-center text-black font-black text-2xl shadow-[0_0_15px_rgba(0,255,65,0.5)]">N</div>
                   <div>
                      <p className="text-lg font-bold">Nana v4.2</p>
                      <p className="text-[10px] opacity-50 uppercase tracking-widest font-sans font-black">Origin: Cloud Compute Hub</p>
                   </div>
                </div>
              </div>

              <div className="bg-[#00ff41]/5 p-6 rounded-2xl border border-[#00ff41]/20">
                <h2 className="text-sm font-black uppercase tracking-tighter mb-4 text-[#00ff41]/80 flex items-center gap-2">
                  <CpuChipIcon className="w-4 h-4" /> Core Metrics
                </h2>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-[#00ff41]/10 pb-1"><span>Learning model</span><span className="font-bold">GPT-4o-Campus</span></div>
                  <div className="flex justify-between border-b border-[#00ff41]/10 pb-1"><span>Memory Allocation</span><span className="font-bold">128GB LVM</span></div>
                  <div className="flex justify-between border-b border-[#00ff41]/10 pb-1"><span>Active Threads</span><span className="font-bold">1,024</span></div>
                  <div className="flex justify-between"><span>Data Freshness</span><span className="font-bold">Real-time Sync</span></div>
                </div>
              </div>

              <div className="bg-[#00ff41]/5 p-6 rounded-2xl border border-[#00ff41]/20">
                <h2 className="text-sm font-black uppercase tracking-tighter mb-4 text-[#00ff41]/80 flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4" /> Security Status
                </h2>
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-ping"></div>
                   <span className="text-[10px] font-bold tracking-widest">ENCRYPTION: AES-256 ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Right: Console */}
            <div className="lg:col-span-2 flex flex-col min-h-[500px]">
               <div className="bg-black/80 rounded-2xl border border-[#00ff41]/30 p-6 flex-1 flex flex-col shadow-2xl shadow-[#00ff41]/10 relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[9px] font-bold text-[#00ff41]/40 tracking-widest">AUTO_LOG_SYNC_ENABLED</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                     <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                     <div className="w-2.5 h-2.5 rounded-full bg-green-500/50 animate-pulse"></div>
                     <span className="ml-4 text-[10px] opacity-40 font-bold uppercase tracking-[0.2em] font-sans">Global Activity Stream</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 text-[11px] leading-relaxed pr-2 custom-scrollbar font-mono">
                     <p className="text-white/20">[TIMESTAMP: {new Date().toISOString()}]</p>
                     <p><span className="text-yellow-400">INFO:</span> Establishing secure handshake with KTU internal API...</p>
                     <p><span className="text-[#00ff41]">SUCCESS:</span> Handshake verified. Channel encrypted.</p>
                     <p><span className="text-blue-400">TASK:</span> Analyzing student sentiment for upcoming Hackathon.</p>
                     <p className="text-white/40">[...] Searching local knowledge items...</p>
                     <p><span className="text-purple-400">NANA:</span> Suggesting "Creative Coding" workshop to 12 students based on interests.</p>
                     <p><span className="text-white">EVENT:</span> Message received from student#2841 in direct conversation.</p>
                     <p><span className="text-orange-400">ACTION:</span> Optimizing response parameters for high-concise mode.</p>
                     <p className="text-[#00ff41] animate-[pulse_1s_infinite]">[_]</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#00ff41]/10 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <span className="text-[10px] font-bold opacity-80">CMD_PROMPT &gt; </span>
                    <div className="flex-1 h-auto min-h-[36px] bg-[#00ff41]/5 rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between border border-[#00ff41]/20 gap-2">
                       <span className="text-[10px] opacity-40 italic">Manual override required for active conversational interfaces.</span>
                       <button onClick={() => router.push('/')} className="px-4 py-1.5 bg-[#00ff41] text-black hover:bg-white rounded text-[10px] font-black uppercase transition-colors shrink-0 whitespace-nowrap shadow-[0_0_10px_rgba(0,255,65,0.4)]">
                         Launch Communicator
                       </button>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 🎓 STUDENT CHAT VIEW ---
  return (
    <div className="flex flex-col h-screen bg-app relative transition-all duration-500 overflow-hidden pt-14">
      <Head>
        <title>Nana AI | Campus Chat</title>
      </Head>

      {/* Header - Theme Aware */}
      <header 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-[100] px-3 pt-[max(env(safe-area-inset-top,0px),8px)] pb-1.5 flex items-center justify-between border-b h-14"
        style={{ background: 'var(--bg-navbar)', color: 'var(--text-navbar)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push('/')}
            className="p-2 rounded-xl transition-all"
            style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-navbar)' }}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowProfile(true)}>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-600 font-black text-[12px] p-0.5 border border-slate-100">
                <div className="w-full h-full rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white">N</div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight leading-none" style={{ color: 'var(--text-navbar)' }}>Nana AI Agent</h1>
              <p className="font-bold text-[10px] uppercase tracking-widest mt-1" style={{ color: 'color-mix(in srgb, var(--text-navbar), transparent 40%)' }}>KTU System Service</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {conversationId && (
            <button 
               onClick={handleClearChat}
               className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border border-red-500/20 hover:bg-red-500/10 text-red-500"
               title="Clear Chat"
            >
               <TrashIcon className="w-5 h-5" />
            </button>
          )}
          <button 
             onClick={() => setShowTerminalOverlay(!showTerminalOverlay)}
             className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border border-white/5"
             style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-navbar)' }}
          >
             <CommandLineIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 min-h-0 flex flex-col relative">
        <div>
          {loading ? (
            <div 
              className="absolute inset-0 z-30 bg-app flex items-center justify-center transition-opacity duration-300"
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-xs font-black text-primary-600/60 uppercase tracking-widest">Initializing AI Hub...</p>
              </div>
            </div>
          ) : conversationId ? (
            <div 
              className="flex-1 flex flex-col min-h-0 transition-opacity duration-300"
            >
              <ChatBox conversationId={conversationId} />
            </div>
          ) : (
            <div 
              className="flex-1 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-300"
            >
               <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6">
                 <SparklesIcon className="w-10 h-10 text-primary-400" />
               </div>
               <h3 className="text-lg font-black text-slate-800 tracking-tight">Nana is unavailable</h3>
               <p className="text-xs text-slate-400 font-bold mt-2 max-w-xs leading-relaxed uppercase tracking-widest">Unable to establish a secure connection to the AI Hub. Please check your internet and try again.</p>
               <button 
                onClick={initNanaChat}
                className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary-600/20"
               >
                 Retry Connection
               </button>
            </div>
          )}
        </div>

        {/* Diagnostic Terminal Overlay (Easter Egg) */}
        {showTerminalOverlay && (
          <div 
            className="absolute inset-x-4 bottom-24 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 p-5 z-50 shadow-2xl shadow-black/40 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
              <span className="text-[10px] font-black text-[#00ff41]/60 tracking-widest uppercase">System Diagnostics</span>
              <button onClick={() => setShowTerminalOverlay(false)} className="text-white/40 hover:text-white">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 font-mono text-[9px] text-[#00ff41]/80">
              <p>[INIT] Conversation_ID: {conversationId || 'NULL'}</p>
              <p>[INIT] User_Role: {currentUser?.role || 'GUEST'}</p>
              <p>[INIT] Socket_Status: ACTIVE</p>
              <p>[INIT] Handshake: SECURE (AES-256)</p>
              <p className="animate-pulse">_</p>
            </div>
          </div>
        )}
      </main>

      {/* Nana Profile Modal */}
      {showProfile && (
        <>
          <div
            onClick={() => setShowProfile(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99998]"
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[99999] flex flex-col border-l border-slate-100">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">AI Hub Info</h2>
              <button onClick={() => setShowProfile(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition-all hover:scale-105">
                <XMarkIcon className="w-5 h-5 stroke-[2px]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
              <div className="relative mb-6 group">
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-primary-500/20 ring-4 ring-white overflow-hidden bg-gradient-to-tr from-primary-500 to-indigo-600">
                  N
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg flex items-center justify-center">
                  <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse px-0"></span>
                </div>
              </div>

              <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">Nana AI Agent</h1>
              <div className="mt-1 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-[11px] font-black text-indigo-600 italic uppercase">
                  "System-Managed Intelligence Asset"
                </p>
              </div>
              <p className="text-sm font-bold uppercase tracking-widest mt-3 text-green-500">
                Authorized & Secure
              </p>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        /* Custom scrollbar for terminal */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 255, 65, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 65, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
