import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionText, onAction, icon = '📚' }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 animate-fade-in">
    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-3xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
      {icon}
    </div>
    <div className="space-y-2">
      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">{description}</p>
    </div>
    {actionText && (
      <button 
        onClick={onAction}
        className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20 active:scale-95 transition-all duration-300"
      >
        {actionText}
      </button>
    )}
  </div>
);

export default EmptyState;
