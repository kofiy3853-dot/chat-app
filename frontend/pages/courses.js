import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { courseAPI } from '../services/api';
import CourseCard from '../components/courses/CourseCard';
import CreateCourseForm from '../components/courses/CreateCourseForm';
import { getCurrentUser } from '../utils/helpers';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  AcademicCapIcon, 
  XMarkIcon,
  UserPlusIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function Courses() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); 
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState('JOIN'); // JOIN or CREATE
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    // Set default tab based on role
    if (currentUser?.role === 'INSTRUCTOR' || currentUser?.role === 'ADMIN') {
      setModalTab('CREATE');
    }

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

  const isEducator = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  return (
    <>
      <Head>
        <title>Courses | Campus Chat</title>
      </Head>
      
      <div className="max-w-xl mx-auto min-h-screen shadow-2xl flex flex-col relative overflow-hidden" style={{ backgroundColor: 'var(--bg-page)' }}>
        {/* Header - Royal Blue */}
        <header className="sticky top-0 z-30 bg-primary-600 px-4 pt-[max(env(safe-area-inset-top,0px),40px)] pb-4 shadow-md transition-colors">
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight leading-tight">Courses</h1>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em] mt-0.5">Academic Center</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg"
            >
              <PlusIcon className="w-5 h-5 stroke-[3px]" />
            </button>
          </div>

          <div className="space-y-3 px-2">
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Search codes or names..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/10 px-10 py-2.5 rounded-xl text-sm font-medium text-white placeholder:text-white/40 outline-none focus:bg-white/20 transition-all"
              />
            </div>

            <div className="flex bg-white/10 p-0.5 rounded-xl overflow-x-auto no-scrollbar">
              {['ALL', 'ONGOING', 'COMPLETED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === tab 
                      ? 'bg-white text-primary-600 shadow-sm' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Course Grid */}
        <main className="flex-1 overflow-y-auto px-6 py-6 pb-[max(env(safe-area-inset-bottom),100px)] scrollbar-hide">
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
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </main>

        {/* Unified Modal Overlay */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 z-0 opacity-50"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 leading-none">
                        {modalTab === 'CREATE' ? 'New Course' : 'Join Course'}
                      </h2>
                      <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-2">
                        {modalTab === 'CREATE' ? 'Create a virtual classroom' : 'Enter your enrollment code'}
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <XMarkIcon className="w-6 h-6 stroke-2" />
                    </button>
                  </div>

                  {/* Tab Switcher if Instructor */}
                  {isEducator && (
                    <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
                      <button 
                        onClick={() => setModalTab('CREATE')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modalTab === 'CREATE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                      >
                        <SparklesIcon className="w-4 h-4" />
                        <span>Create</span>
                      </button>
                      <button 
                        onClick={() => setModalTab('JOIN')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modalTab === 'JOIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        <span>Join</span>
                      </button>
                    </div>
                  )}

                  {modalTab === 'JOIN' ? (
                    <form 
                      onSubmit={handleJoinCourse} 
                      className="space-y-4"
                    >
                      <input
                        type="text"
                        placeholder="CS50-2024"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500/20 px-6 py-5 rounded-2xl text-center text-2xl font-black tracking-[0.2em] placeholder:text-slate-200 focus:ring-4 focus:ring-primary-500/10 transition-all font-mono"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!joinCode.trim()}
                        className="w-full bg-primary-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 active:scale-95 transition-all duration-300"
                      >
                        Enroll Now
                      </button>
                    </form>
                  ) : (
                    <div>
                      <CreateCourseForm 
                        onSuccess={() => {
                          setShowModal(false);
                          fetchCourses();
                        }}
                        onCancel={() => setShowModal(false)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
