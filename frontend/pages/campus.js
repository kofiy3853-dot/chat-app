import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  BuildingLibraryIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import TabNavigation from '../components/campus/TabNavigation';
import dynamic from 'next/dynamic';

const EventTab = dynamic(() => import('../components/campus/EventTab'), { loading: () => <div className="p-20 text-center animate-pulse text-slate-400">Loading events...</div> });
const AnnouncementTab = dynamic(() => import('../components/campus/AnnouncementTab'), { loading: () => <div className="p-20 text-center animate-pulse text-slate-400">Loading news...</div> });
const AnonymousTab = dynamic(() => import('../components/campus/AnonymousTab'), { loading: () => <div className="p-20 text-center animate-pulse text-slate-400">Loading whispers...</div> });
import { getCurrentUser } from '../utils/helpers';

const CampusPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('events');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const localUser = getCurrentUser();
    if (localUser) setUser(localUser);
  }, []);

  const tabs = [
    { id: 'events', label: 'Events' },
    { id: 'announcements', label: 'News' },
    { id: 'anonymous', label: 'Whispers' }
  ];

  const [visitedTabs, setVisitedTabs] = useState(new Set(['events']));

  useEffect(() => {
    setVisitedTabs(prev => new Set(prev).add(activeTab));
  }, [activeTab]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-xl mx-auto shadow-2xl relative">
      <Head>
        <title>Campus Center | Campus Chat</title>
      </Head>

      {/* Top Navigation - Campus Header */}
      <div className="bg-primary-600 z-30 shadow-md shrink-0 sticky top-0">
        <header className="px-6 pt-[max(env(safe-area-inset-top,0px),12px)] pb-5 flex items-center justify-between">
           <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/')} aria-label="Go to inbox" className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
                 <ChevronLeftIcon className="w-5 h-5 stroke-[2.5px]" />
              </button>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
                 <BuildingLibraryIcon className="w-6 h-6 text-white" />
                 <span>Campus</span>
              </h1>
           </div>
           
           <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/50">
                 <BuildingLibraryIcon className="w-4 h-4" />
              </div>
           </div>
        </header>
      </div>

      {/* Tab bar */}
      <TabNavigation 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-50/50 relative pb-[calc(env(safe-area-inset-bottom,0px)+90px)]">
        <div className={activeTab === 'events' ? 'block' : 'hidden'}>
           {visitedTabs.has('events') && <EventTab />}
        </div>
        <div className={activeTab === 'announcements' ? 'block' : 'hidden'}>
           {visitedTabs.has('announcements') && <AnnouncementTab />}
        </div>
        <div className={activeTab === 'anonymous' ? 'block' : 'hidden'}>
           {visitedTabs.has('anonymous') && <AnonymousTab />}
        </div>
      </main>
    </div>
  );
};

export default CampusPage;
