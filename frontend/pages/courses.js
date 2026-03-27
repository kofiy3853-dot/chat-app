import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { courseAPI } from '../services/api';
import CourseCard from '../components/courses/CourseCard';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  AcademicCapIcon, 
  InboxIcon,
  AdjustmentsVerticalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function Courses() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, ONGOING, COMPLETED
  const [showModal, setShowModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await courseAPI.getCourses();
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCourse = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      await courseAPI.joinCourse(joinCode.trim());
      setJoinCode('');
      setShowModal(false);
      fetchCourses();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to join course');
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.name.toLowerCase().includes(search.toLowerCase()) || 
      course.code.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'ALL') return matchesSearch;
    if (filter === 'ONGOING') return matchesSearch && course.isActive;
    if (filter === 'COMPLETED') return matchesSearch && !course.isActive;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-black tracking-widest uppercase text-[10px]">Syncing academic data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Courses | Campus Chat</title>
      </Head>
      
      <div className="max-w-xl mx-auto min-h-screen bg-white shadow-2xl flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-6 py-6 z-30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Courses</h1>
              <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] mt-2">Manage your studies</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:shadow-primary-500/20 active:scale-95 transition-all duration-300 transform active:rotate-12"
            >
              <PlusIcon className="w-6 h-6 stroke-[3px]" />
            </button>
          </div>

          {/* Search & Filter */}
          <div className="space-y-4">
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
              <input
                type="text"
                placeholder="Search codes or names..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border-none px-12 py-3.5 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-inner"
              />
            </div>

            <div className="flex space-x-1 p-1 bg-slate-50 rounded-2xl overflow-x-auto scrollbar-hide">
              {['ALL', 'ONGOING', 'COMPLETED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    filter === tab 
                      ? 'bg-white text-primary-600 shadow-md' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Course Grid */}
        <main className="flex-1 overflow-y-auto px-6 py-6 pb-24 scrollbar-hide">
          {filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 -rotate-6 transition-transform hover:rotate-0 duration-500">
                <AcademicCapIcon className="w-12 h-12 text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">No courses found</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium max-w-[200px] mx-auto italic">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredCourses.map((course, idx) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </main>

        {/* Join Modal Overlay */}
        <AnimatePresence>
          {showModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 z-0 opacity-50"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 leading-none">Join Course</h2>
                      <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-2">Enter your access code</p>
                    </div>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <XMarkIcon className="w-6 h-6 stroke-2" />
                    </button>
                  </div>

                  <form onSubmit={handleJoinCourse} className="space-y-4">
                    <input
                      type="text"
                      placeholder="e.g. CS50-2024"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500/20 px-6 py-4 rounded-2xl text-center text-lg font-black tracking-[0.1em] placeholder:text-slate-300 focus:ring-4 focus:ring-primary-500/10 transition-all"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!joinCode.trim()}
                      className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 active:scale-95 transition-all duration-300"
                    >
                      Enroll Now
                    </button>
                  </form>
                  
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <button className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors">
                      Need help finding your code?
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
