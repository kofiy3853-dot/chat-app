import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  AcademicCapIcon, 
  ChatBubbleLeftRightIcon, 
  MegaphoneIcon, 
  BookOpenIcon, 
  ClipboardDocumentCheckIcon, 
  UsersIcon, 
  VideoCameraIcon, 
  ArrowLeftIcon, 
  PlusIcon, 
  DocumentArrowUpIcon, 
  CalendarIcon, 
  XMarkIcon, 
  ClockIcon, 
  InformationCircleIcon,
  LockClosedIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { courseAPI } from '../../services/api';
import Navbar from '../../components/Navbar';
import ChatBox from '../../components/ChatBox';
import { 
  getCurrentUser, 
  getInitials, 
  getAvatarColor, 
  formatFileSize, 
  formatFullDate 
} from '../../utils/helpers';
import { useCall } from '../../context/CallContext';
import { getSocket } from '../../services/socket';

const TABS = [
  { id: 'overview', name: 'Overview', icon: InformationCircleIcon },
  { id: 'chat', name: 'Discussion', icon: ChatBubbleLeftRightIcon },
  { id: 'announcements', name: 'Alerts', icon: MegaphoneIcon },
  { id: 'materials', name: 'Resources', icon: BookOpenIcon },
  { id: 'assignments', name: 'Tasks', icon: ClipboardDocumentCheckIcon },
  { id: 'members', name: 'Community', icon: UsersIcon }
];

export default function CoursePage() {
  const router = useRouter();
  const { id } = router.query;
  const { callUser } = useCall();
  const [activeTab, setActiveTab] = useState('overview');
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInstructor, setIsInstructor] = useState(false);
  const [isCourseRep, setIsCourseRep] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Data States
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Modal States
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Form States
  const [materialForm, setMaterialForm] = useState({ title: '', week: '', topic: '', file: null });
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', points: 100, deadline: '' });
  const [announcementContent, setAnnouncementContent] = useState('');

  useEffect(() => {
    const userResult = getCurrentUser();
    setCurrentUser(userResult);
  }, []);

  useEffect(() => {
    if (id) {
      fetchCourseData();
      fetchCourseContent();
      const socket = getSocket();
      if (socket) {
        socket.emit('join-course', id);
        socket.on('new-material', (data) => {
          if (data.courseId === id) setMaterials(prev => [data.material, ...prev]);
        });
        socket.on('new-assignment', (data) => {
          if (data.courseId === id) setAssignments(prev => [data.assignment, ...prev]);
        });
        socket.on('new-announcement', (data) => {
          if (data.courseId === id) setAnnouncements(prev => [data.announcement, ...prev]);
        });

        return () => {
          socket.emit('leave-course', id);
          socket.off('new-material');
          socket.off('new-assignment');
          socket.off('new-announcement');
        };
      }
    }
  }, [id]);

  useEffect(() => {
    if (course && currentUser) {
      setIsInstructor(course.instructorId === currentUser.id || currentUser.role === 'ADMIN');
      const membership = course.memberships?.find(m => m.userId === currentUser.id);
      setIsCourseRep(membership?.role === 'COURSE_REP');
    }
  }, [course, currentUser]);

  const fetchCourseData = async () => {
    try {
      const response = await courseAPI.getCourseById(id);
      setCourse(response.data.course);
    } catch (error) {
      console.error('Failed to fetch course:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseContent = async () => {
    try {
      const [matRes, assignRes] = await Promise.all([
        courseAPI.getMaterials(id),
        courseAPI.getAssignments(id)
      ]);
      setMaterials(matRes.data.materials || []);
      setAssignments(assignRes.data.assignments || []);
    } catch (e) {
      console.error("Content fetch failed", e);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.file || !materialForm.title) return;
    const formData = new FormData();
    formData.append('title', materialForm.title);
    formData.append('week', materialForm.week);
    formData.append('topic', materialForm.topic);
    formData.append('file', materialForm.file);
    try {
      await courseAPI.addMaterial(id, formData);
      setIsMaterialModalOpen(false);
      setMaterialForm({ title: '', week: '', topic: '', file: null });
      fetchCourseContent();
    } catch (err) {
      alert('Failed to upload material');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      await courseAPI.createAssignment(id, assignmentForm);
      setIsAssignmentModalOpen(false);
      setAssignmentForm({ title: '', description: '', points: 100, deadline: '' });
      fetchCourseContent();
    } catch (err) {
      alert('Failed to create assignment');
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementContent.trim()) return;
    try {
      const res = await courseAPI.postAnnouncement(id, announcementContent);
      setIsAnnouncementModalOpen(false);
      setAnnouncementContent('');
      setAnnouncements(prev => [res.data.message, ...prev]);
    } catch (err) {
      alert('Failed to post announcement');
    }
  };

  const handleLockChat = async (locked) => {
    try {
      await courseAPI.lockChat(id, locked);
      setCourse(prev => ({ ...prev, announcementsOnly: locked }));
    } catch (err) {
      alert('Failed to update chat status');
    }
  };

  const handleAssignRep = async (studentId, remove = false) => {
    try {
      await courseAPI.assignRep(id, studentId, remove);
      fetchCourseData();
    } catch (err) {
      alert('Failed to update representative role');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full"></div>
          <p className="mt-4 text-app-secondary font-extrabold uppercase tracking-widest text-[10px]">Accessing course portal...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-app flex flex-col md:flex-row pb-20 md:pb-0">
      <Head>
        <title>{course.code} | {course.name}</title>
      </Head>

      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex flex-col w-72 bg-surface border-r border-[var(--border)] sticky top-0 h-screen z-40 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-[var(--divider)] flex flex-col">
          <button onClick={() => router.push('/courses')} className="flex items-center text-app-muted hover:text-primary-600 mb-6 group">
            <div className="p-2 mr-3 bg-app rounded-xl group-hover:bg-primary-50">
              <ArrowLeftIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[.2em]">Back to Courses</span>
          </button>
          <div className={`w-14 h-14 bg-gradient-to-tr ${getAvatarColor(course.code)} rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-xl mb-4`}>
            {course.code.substring(0, 2)}
          </div>
          <h1 className="font-black text-2xl text-app-primary tracking-tight leading-none mb-2">{course.name}</h1>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest px-2 py-0.5 bg-primary-50 rounded-lg">{course.code}</span>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">•</span>
            <span className="text-[10px] font-bold text-app-muted uppercase tracking-widest">{course.semester} {course.year}</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-xl opacity-100'
                  : 'text-app-muted hover:bg-app hover:text-slate-600 opacity-70'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className={`text-sm font-black uppercase tracking-widest`}>{tab.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[var(--divider)]">
          <div className="bg-app/50 rounded-3xl p-5 border border-[var(--divider)]">
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${getAvatarColor(course.instructor?.name)} flex items-center justify-center text-white font-black text-xs`}>
                {getInitials(course.instructor?.name)}
              </div>
              <div>
                <p className="text-[8px] font-black text-app-muted uppercase tracking-tighter leading-none mb-1">Instructor</p>
                <p className="text-xs font-black text-app-primary">{course.instructor?.name}</p>
              </div>
            </div>
            <button 
              onClick={() => callUser(course.instructor?.id, course.instructor?.name, 'VIDEO')}
              className="w-full py-3 bg-surface border-2 border-[var(--divider)] text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary-100 hover:text-primary-600 flex items-center justify-center space-x-2"
            >
              <VideoCameraIcon className="w-4 h-4" />
              <span>Join Office Hours</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-surface/90 backdrop-blur-xl border-b border-[var(--divider)] p-6 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 bg-gradient-to-tr ${getAvatarColor(course.code)} rounded-2xl flex items-center justify-center text-white font-black text-xl`}>
              {course.code.substring(0, 2)}
            </div>
            <div>
              <h1 className="text-base font-black text-app-primary leading-none">{course.name}</h1>
              <p className="text-[9px] font-bold text-app-muted uppercase mt-1.5 tracking-widest">{course.code} • {course.semester} {course.year}</p>
            </div>
          </div>
          <button 
            onClick={() => callUser(course.instructor?.id, course.instructor?.name, 'VIDEO')}
            className="p-3 bg-primary-100 rounded-2xl text-primary-600 hover:bg-primary-600 hover:text-white shadow-sm"
          >
            <VideoCameraIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex overflow-x-auto space-x-8 mt-6 no-scrollbar border-t border-slate-50 pt-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 text-[10px] font-black uppercase tracking-[.2em] pb-3 border-b-2 ${
                activeTab === tab.id ? 'text-primary-600 border-primary-600' : 'text-slate-300 border-transparent'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="flex-1 overflow-y-auto bg-app/30 md:bg-transparent no-scrollbar relative z-10">
          {activeTab === 'overview' && (
            <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-10 pb-32">
              <div className="bg-surface rounded-[3rem] p-10 border border-[var(--divider)] shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-3xl font-black text-app-primary mb-6 tracking-tight">Course Journey</h2>
                  <p className="text-app-secondary leading-relaxed font-medium text-lg max-w-2xl">
                    {course.description || "No description provided for this course."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-surface rounded-[2.5rem] p-8 border border-[var(--divider)] shadow-sm flex flex-col space-y-4 hover:shadow-xl group">
                  <div className="p-4 w-16 h-16 bg-primary-50 rounded-2xl text-primary-600">
                    <ClockIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-app-muted uppercase tracking-widest">Global Schedule</p>
                    <p className="text-base font-black text-app-primary mt-1">Mon, Wed • 10:00 AM</p>
                  </div>
                </div>

                <div className="bg-surface rounded-[2.5rem] p-8 border border-[var(--divider)] shadow-sm flex flex-col space-y-4 hover:shadow-xl group">
                  <div className="p-4 w-16 h-16 bg-emerald-50 rounded-2xl text-emerald-600">
                    <AcademicCapIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-app-muted uppercase tracking-widest">Class Size</p>
                    <p className="text-base font-black text-app-primary mt-1">{course.students?.length || 0} Registered</p>
                  </div>
                </div>

                <div className="bg-surface rounded-[2.5rem] p-8 border border-[var(--divider)] shadow-sm flex flex-col space-y-4 hover:shadow-xl group">
                  <div className="p-4 w-16 h-16 bg-orange-50 rounded-2xl text-orange-600">
                    <UsersIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-app-muted uppercase tracking-widest">Department</p>
                    <p className="text-base font-black text-app-primary mt-1">{course.department || "Faculty of Engineering"}</p>
                  </div>
                </div>
              </div>

              {isInstructor && (
                <div className="bg-surface rounded-[2.5rem] p-10 border border-[var(--divider)] shadow-sm hover:shadow-xl mt-10">
                  <h3 className="text-xl font-black text-app-primary mb-6 tracking-tight flex items-center">
                    <LockClosedIcon className="w-5 h-5 mr-3 text-primary-600" />
                    Lecturer Controls
                  </h3>
                  <div className="flex items-center justify-between p-6 bg-app rounded-[2rem] border border-[var(--divider)]">
                    <div>
                      <p className="text-sm font-black text-app-primary">Lock Class Discussion</p>
                      <p className="text-[10px] font-bold text-app-muted uppercase tracking-widest mt-1">Restrict chat to announcements only</p>
                    </div>
                    <button 
                      onClick={() => handleLockChat(!course.announcementsOnly)}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        course.announcementsOnly 
                          ? 'bg-rose-500 text-white shadow-lg' 
                          : 'bg-surface border-2 border-[var(--divider)] text-app-muted hover:border-primary-500 hover:text-primary-600 active: shadow-sm'
                      }`}
                    >
                      {course.announcementsOnly ? 'Locked' : 'Unlocked'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-full flex flex-col md:p-6 pb-24 md:pb-6">
              <div className="flex-1 flex flex-col min-h-0 bg-surface md:rounded-[3rem] shadow-2xl relative overflow-hidden border border-[var(--divider)]">
                <ChatBox conversationId={course.conversation?.id} />
              </div>
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-10 pb-32">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-3xl font-black text-app-primary tracking-tight">Broadcasts</h2>
                  <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-2">Latest updates from your instructor</p>
                </div>
                {(isInstructor || isCourseRep) && (
                  <button 
                    onClick={() => setIsAnnouncementModalOpen(true)}
                    className="flex items-center space-x-3 px-6 py-4 bg-primary-600 text-white rounded-[1.5rem] text-xs font-black shadow-2xl hover:bg-primary-700"
                  >
                    <PlusIcon className="w-5 h-5 stroke-[2.5px]" />
                    <span>Post Update</span>
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {announcements.length > 0 ? announcements.map((ann) => (
                  <div key={ann.id} className="bg-surface rounded-[2rem] p-8 border border-[var(--divider)] shadow-sm relative overflow-hidden group hover:shadow-xl">
                    <div className="absolute top-0 left-0 w-2 h-full bg-primary-600"></div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${getAvatarColor(course.instructor?.name)} flex items-center justify-center text-white text-[10px] font-black`}>
                          {getInitials(course.instructor?.name)}
                        </div>
                        <span className="text-[10px] font-black text-app-primary tracking-widest uppercase">{course.instructor?.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{formatFullDate(ann.createdAt)}</span>
                    </div>
                    <p className="text-slate-600 text-base font-semibold leading-relaxed">{ann.content}</p>
                  </div>
                )) : (
                  <div className="p-24 text-center bg-surface rounded-[3rem] border-2 border-dashed border-[var(--divider)] flex flex-col items-center">
                    <div className="w-20 h-20 bg-app rounded-full flex items-center justify-center mb-6">
                      <MegaphoneIcon className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-app-primary">Clear Skies</h3>
                    <p className="text-sm text-app-muted mt-2 font-medium">No official broadcasts transmit yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-12 pb-32">
              <div className="flex justify-between items-center text-app-primary">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Resources</h2>
                  <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-2">Curated library</p>
                </div>
                {isInstructor && (
                  <button onClick={() => setIsMaterialModalOpen(true)} className="flex items-center space-x-3 px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black shadow-2xl">
                    <DocumentArrowUpIcon className="w-5 h-5" />
                    <span>Upload</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {materials.length > 0 ? materials.map((material) => (
                  <div key={material.id} className="bg-surface rounded-[2.5rem] border border-[var(--divider)] shadow-sm overflow-hidden group hover:shadow-2xl">
                    <div className="p-6 border-b border-[var(--divider)] flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest mb-2">
                          {material.week ? `Week ${material.week}` : (material.topic || 'General')}
                        </p>
                        <h3 className="text-base font-black text-app-primary truncate">{material.title}</h3>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-app flex items-center justify-center text-slate-300">
                        <BookOpenIcon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="p-4">
                      <a href={`${process.env.NEXT_PUBLIC_API_URL}${material.fileUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-app">
                        <div className="flex items-center space-x-4 overflow-hidden">
                          <DocumentArrowUpIcon className="w-5 h-5 text-app-muted" />
                          <div className="min-w-0">
                            <span className="block text-xs font-black text-slate-600 truncate">{material.fileName}</span>
                            <span className="block text-[8px] font-black text-app-muted uppercase mt-0.5">{formatFileSize(material.fileSize)}</span>
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full p-32 text-center bg-surface rounded-[3rem] border-2 border-dashed border-[var(--divider)]">
                    <BookOpenIcon className="w-10 h-10 text-slate-200 mx-auto mb-6" />
                    <h3 className="text-xl font-black text-app-primary">Empty Shelves</h3>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-10 pb-32">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-3xl font-black text-app-primary tracking-tight">Tasks</h2>
                </div>
                {isInstructor && (
                  <button onClick={() => setIsAssignmentModalOpen(true)} className="flex items-center space-x-3 px-6 py-4 bg-emerald-600 text-white rounded-[1.5rem] text-xs font-black shadow-2xl">
                    <PlusIcon className="w-5 h-5" />
                    <span>Create</span>
                  </button>
                )}
              </div>
              <div className="space-y-8">
                {assignments.length > 0 ? assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-surface rounded-[3rem] border-2 border-[var(--divider)] p-10 relative group">
                    <div className={`absolute top-0 left-0 w-3 h-full ${assignment.deadline && new Date(assignment.deadline) < new Date() ? 'bg-rose-500' : 'bg-primary-600'}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${assignment.deadline && new Date(assignment.deadline) < new Date() ? 'bg-rose-50 text-rose-600' : 'bg-primary-50 text-primary-600'}`}>
                          {assignment.deadline && new Date(assignment.deadline) < new Date() ? 'Deadline Passed' : 'Active Task'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-app-primary mb-3">{assignment.title}</h3>
                      <p className="text-app-secondary font-medium text-sm mb-6">{assignment.description}</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-32 text-center bg-surface rounded-[3rem] border-2 border-dashed border-[var(--divider)]">
                    <h3 className="text-xl font-black text-app-primary">No Tasks</h3>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="p-6 md:p-12 max-w-5xl mx-auto pb-32">
              <div className="mb-10 text-app-primary">
                <h2 className="text-3xl font-black tracking-tight">Community</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-primary-600 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center text-white">
                  <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center text-primary-600 font-black text-2xl mb-6">
                    {getInitials(course.instructor?.name)}
                  </div>
                  <h4 className="text-xl font-black leading-none">{course.instructor?.name}</h4>
                  <p className="text-[10px] font-black opacity-60 uppercase mt-3">Instructor</p>
                </div>
                {course.students?.map((student) => (
                  <div key={student.id} className="bg-surface rounded-[2.5rem] p-8 border border-[var(--divider)] shadow-sm flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-tr ${getAvatarColor(student.name)} flex items-center justify-center text-white font-black text-lg`}>
                      {getInitials(student.name)}
                    </div>
                    <div className="mt-6">
                      <h4 className="text-lg font-black text-app-primary leading-none">{student.name}</h4>
                    </div>
                    {isInstructor && (
                       <button 
                        onClick={() => handleAssignRep(student.id, student.role === 'COURSE_REP')} 
                        className={`mt-4 p-2 rounded-lg ${student.role === 'COURSE_REP' ? 'bg-amber-50 text-amber-600' : 'bg-app text-app-muted'}`}
                       >
                         <CheckBadgeIcon className="w-4 h-4" />
                       </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Material Modal */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
          <div className="bg-surface rounded-[3rem] w-full max-w-xl p-10">
            <h3 className="text-2xl font-black text-app-primary mb-6">Upload Resource</h3>
            <form onSubmit={handleAddMaterial} className="space-y-6">
              <input required value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="w-full bg-app border-none rounded-2xl px-6 py-4 text-sm font-black" placeholder="Title" />
              <input type="file" required onChange={e => setMaterialForm({...materialForm, file: e.target.files[0]})} className="w-full" />
              <button type="submit" className="w-full py-5 bg-primary-600 text-white rounded-3xl font-black">Deploy</button>
              <button type="button" onClick={() => setIsMaterialModalOpen(false)} className="w-full text-app-muted font-bold">Cancel</button>
            </form>
          </div>
        </div>
      )}

      <div className="md:hidden">
        <Navbar />
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}