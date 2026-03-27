import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { courseAPI } from '../../services/api';
import ChatBox from '../../components/ChatBox';
import { 
  ArrowLeftIcon, 
  EllipsisVerticalIcon, 
  ChatBubbleBottomCenterTextIcon, 
  MegaphoneIcon, 
  FolderIcon, 
  UsersIcon,
  AcademicCapIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarColor, getInitials } from '../../utils/helpers';

const TABS = [
  { id: 'CHAT', label: 'Chat', icon: ChatBubbleBottomCenterTextIcon },
  { id: 'ANNOUNCEMENTS', label: 'Alerts', icon: MegaphoneIcon },
  { id: 'MATERIALS', label: 'Files', icon: FolderIcon },
  { id: 'MEMBERS', label: 'Class', icon: UsersIcon }
];

export default function CourseDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CHAT');

  useEffect(() => {
    if (id) fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await courseAPI.getCourseById(id);
      setCourse(response.data.course);
    } catch (error) {
      console.error('Failed to fetch course details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-extrabold uppercase tracking-widest text-[10px]">Accessing course portal...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <>
      <Head>
        <title>{course.name} | Campus Chat</title>
      </Head>

      <div className="max-w-xl mx-auto min-h-screen flex flex-col bg-white shadow-2xl relative overflow-hidden">
        {/* Header Section */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 z-30 pt-4 px-4 pb-2">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/courses"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
            >
              <ArrowLeftIcon className="w-6 h-6 stroke-[2.5px]" />
            </Link>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-2xl transition-all">
                <QrCodeIcon className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
                <EllipsisVerticalIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="px-2 mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                {course.code}
              </span>
              <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>Ongoing</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {course.name}
            </h1>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 p-1 bg-slate-50 rounded-[1.5rem] overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 min-w-[100px] py-2.5 px-4 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-white text-primary-600 shadow-md ring-1 ring-slate-100' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? '' : 'opacity-80'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col relative bg-[#F8FAFC]">
          <AnimatePresence mode="wait">
            {activeTab === 'CHAT' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <ChatBox conversationId={course.conversation?.id} />
              </motion.div>
            )}

            {activeTab === 'ANNOUNCEMENTS' && (
              <motion.div 
                key="announcements"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center"
              >
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-8 rotate-6 transition-transform hover:rotate-0 duration-500">
                  <MegaphoneIcon className="w-12 h-12 text-primary-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Stay Alerts!</h3>
                <p className="text-sm text-slate-400 mt-3 font-medium max-w-[240px] leading-relaxed italic">Your professor hasn't posted any announcements yet.</p>
              </motion.div>
            )}

            {activeTab === 'MATERIALS' && (
              <motion.div 
                key="materials"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex-1 flex flex-col items-center justify-center p-8 space-y-4"
              >
                <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mb-4">
                  <FolderIcon className="w-10 h-10 text-primary-600" />
                </div>
                <h3 className="text-lg font-black text-slate-800">No resources yet</h3>
                <p className="text-sm text-slate-400 text-center font-medium">Shared PDFs, slides, and notes will appear here once uploaded by the instructor.</p>
                <button className="mt-8 px-6 py-3 bg-white text-slate-400 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary-100 hover:text-primary-600 transition-all">
                  Request Materials
                </button>
              </motion.div>
            )}

            {activeTab === 'MEMBERS' && (
              <motion.div 
                key="members"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col bg-white"
              >
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Class Statistics</h3>
                  <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg">{course.students?.length || 0} Members</span>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-50">
                   {/* Instructor first */}
                   <div className="py-4 flex items-center justify-between group">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${getAvatarColor(course.instructor?.name)} flex items-center justify-center text-white text-sm font-black shadow-lg transition-transform group-hover:rotate-6`}>
                        {getInitials(course.instructor?.name)}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 leading-none">{course.instructor?.name}</h4>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-1.5 flex items-center space-x-1">
                          <AcademicCapIcon className="w-3 h-3" />
                          <span>Instructor</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Students */}
                  {course.students?.map((student) => (
                    <div key={student.id} className="py-4 flex items-center justify-between group">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${getAvatarColor(student.name)} flex items-center justify-center text-white text-sm font-black shadow-sm group-hover:scale-105 transition-all`}>
                          {getInitials(student.name)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 leading-none">{student.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Reg No. {student.studentId || 'XXXXXX'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
