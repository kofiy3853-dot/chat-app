import React from 'react';

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex bg-surface/80 backdrop-blur-xl border-b border-[var(--divider)] px-2 sticky top-[72px] z-20">
      <div className="flex w-full space-x-1 py-1 overflow-x-auto no-scrollbar max-w-xl mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-widest  relative overflow-hidden rounded-xl ${
              activeTab === tab.id 
              ? 'text-primary-600 bg-primary-50/50' 
              : 'text-app-muted hover:text-slate-600 hover:bg-app'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabNavigation;
