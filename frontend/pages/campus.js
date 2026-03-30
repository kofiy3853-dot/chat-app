import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  BuildingLibraryIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import TabNavigation from '../components/campus/TabNavigation';
import EventTab from '../components/campus/EventTab';
import AnnouncementTab from '../components/campus/AnnouncementTab';
import AnonymousTab from '../components/campus/AnonymousTab';
import { getCurrentUser } from '../utils/helpers';

const CampusPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('events');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const localUser = getCurrentUser();
    if (!localUser) {
      router.push('/login');
      return;
    }
    setUser(localUser);
  }, [router]);

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-xl mx-auto shadow-2xl relative overflow-x-hidden">
      <Head>
        <title>Campus Center | Campus Chat</title>
      </Head>

      {/* Top Navigation - Campus Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-3xl z-30 border-b border-slate-100/50 shadow-sm">
        <header className="px-6 py-5 flex items-center justify-between">
           <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/')} aria-label="Go to inbox" className="p-2 -ml-2 text-slate-400 hover:text-slate-800 transition-colors">
                 <ChevronLeftIcon className="w-5 h-5 stroke-[2.5px]" />
              </button>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                 <BuildingLibraryIcon className="w-6 h-6 text-primary-600" />
                 <span>Campus</span>
              </h1>
           </div>
           
           <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
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

      {/* Main Content Area - Lazy Loading + Caching */}
      <main className="flex-1 bg-slate-50/50 relative">
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

      {/* Bottom Padding for Navbar */}
      <div className="h-32" />
    </div>
  );
};

export default CampusPage;
