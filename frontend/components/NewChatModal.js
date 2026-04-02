import { useState, useEffect } from 'react';
import { userAPI, chatAPI } from '../services/api';
import { useRouter } from 'next/router';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getFullFileUrl } from '../utils/helpers';

export default function NewChatModal({ isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search.trim()) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await userAPI.searchUsers(search);
      setResults(response.data.users);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (userId) => {
    try {
      const response = await chatAPI.getOrCreateDirectConversation(userId);
      router.push(`/chat/${response.data.conversation.id}`);
      onClose();
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">New Message</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 bg-gray-50/50">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm text-sm"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-sm text-gray-500 font-medium">Searching for classmates...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startChat(user.id)}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-primary-50 rounded-2xl transition-all group border border-transparent hover:border-primary-100"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden">
                    {(() => {
                      const avatar = user.avatar;
                      const fullUrl = getFullFileUrl(avatar);
                      return fullUrl ? (
                        <img src={fullUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      );
                    })()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    {user.department && (
                      <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider mt-0.5">{user.department}</p>
                    )}
                  </div>
                  {user.isOnline && (
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm mr-2"></div>
                  )}
                </button>
              ))}
            </div>
          ) : !search.trim() ? (
            <div className="p-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">Suggested</h3>
              <button
                onClick={() => startChat('7951b52c-b14e-486a-a802-8e0a9fa2495b')}
                className="w-full flex items-center space-x-4 p-4 bg-primary-50/50 hover:bg-primary-50 rounded-2xl transition-all group border border-primary-100 shadow-sm"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/20 overflow-hidden shrink-0">
                  <div className="animate-pulse absolute inset-0 bg-white/20"></div>
                  <span>N</span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-black text-gray-900 truncate">Nana</p>
                    <span className="px-1.5 py-0.5 bg-primary-500 text-[8px] font-black text-white rounded-md uppercase tracking-tighter">AI Assistant</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium truncate mt-0.5">Ask me about campus life, courses, or events!</p>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">Active Now</span>
                  </div>
                </div>
              </button>
              
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <p className="text-gray-400 text-sm font-medium italic mt-4">Type to search for friends and classmates</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <MagnifyingGlassIcon className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-900 font-bold text-lg">No results found</p>
              <p className="text-gray-500 text-sm mt-1">We couldn't find anyone matching "{search}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
