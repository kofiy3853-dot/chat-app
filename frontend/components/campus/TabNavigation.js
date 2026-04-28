import React from 'react';

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex bg-white/80 backdrop-blur-xl border-b border-slate-100 px-2 sticky top-[72px] z-20">
      <div className="flex w-full space-x-1 py-1 overflow-x-auto no-scrollbar max-w-xl mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-widest  relative overflow-hidden rounded-xl ${
              activeTab === tab.id 
              ? 'text-primary-600 bg-primary-50/50' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/2 -/2 w-8 h-1 bg-primary-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabNavigation;
