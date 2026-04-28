import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { courseAPI } from '../services/api';
import { joinCourse, leaveCourse } from '../services/socket';
import ChatBox from './ChatBox';
import { 
  ArrowLeftIcon,
  UsersIcon,
  CogIcon,
  AcademicCapIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

export default function CourseRoom({ courseId }) {
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'announcements' | 'students' | 'settings'

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      
      const socket = getSocket();
      const joinAndSync = () => {
        joinCourse(courseId);
      };

      joinAndSync();
      if (socket) {
        socket.on('connect', joinAndSync);
      }

      return () => {
        leaveCourse(courseId);
        if (socket) {
          socket.off('connect', joinAndSync);
        }
      };
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const response = await courseAPI.getCourseById(courseId);
      setCourse(response.data.course);
    } catch (error) {
      console.error('Failed to fetch course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveCourse = async () => {
    if (!confirm('Are you sure you want to leave this course?')) return;
    
    try {
      await courseAPI.leaveCourse(courseId);
      router.push('/courses');
    } catch (error) {
      console.error('Failed to leave course:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AcademicCapIcon className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h2>
          <p className="text-gray-500 mb-8">The course you are looking for might have been deleted or moved.</p>
          <button 
            onClick={() => router.push('/courses')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 lg:px-8 shadow-sm z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/courses')}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">
                  {course.code}
                </span>
                <span className="text-[10px] text-gray-400 font-medium uppercase truncate max-w-[100px] lg:max-w-none">
                  {course.semester} {course.year}
                </span>
              </div>
              <h1 className="font-bold text-gray-900 text-base lg:text-lg truncate">
                {course.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setActiveTab('students')}
              title="Classmates"
              className={`p-2.5 rounded-xl  ${
                activeTab === 'students' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UsersIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              title="Settings"
              className={`p-2.5 rounded-xl  ${
                activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CogIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="flex mt-6 space-x-8 border-t border-gray-50 pt-2 -mb-4">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 pb-3 text-sm font-bold border-b-2  ${
              activeTab === 'chat'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span>Class Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center space-x-2 pb-3 text-sm font-bold border-b-2  ${
              activeTab === 'announcements'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <MegaphoneIcon className="w-4 h-4" />
            <span>Announcements</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chat' && course.conversationId && (
          <ChatBox conversationId={course.conversationId} />
        )}
        
        {activeTab === 'announcements' && (
          <div className="flex-1 overflow-y-auto p-6 lg:p-12 bg-gray-50">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MegaphoneIcon className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Announcements Yet</h3>
                <p className="text-gray-500">Your instructor hasn't posted any announcements for this course.</p>
              </div>
            </div>
          </div>
        )}

        {Object.keys(course).length > 0 && activeTab === 'students' && (
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50">
            <div className="max-w-2xl mx-auto space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                      <AcademicCapIcon className="w-5 h-5" />
                    </span>
                    <span>Instructor</span>
                  </h3>
                </div>
                <div className="bg-white shadow-sm ring-1 ring-black ring-opacity-5 rounded-2xl p-4 flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {course.instructor?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg leading-tight">{course.instructor?.name}</h4>
                    <p className="text-sm text-blue-600 font-semibold mt-1 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                      <span>Verified Educator</span>
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center">
                      <UsersIcon className="w-5 h-5" />
                    </span>
                    <span>Classmates ({course.students?.length || 0})</span>
                  </h3>
                </div>
                <div className="bg-white shadow-sm ring-1 ring-black ring-opacity-5 rounded-2xl overflow-hidden divide-y divide-gray-50">
                  {course.students?.length > 0 ? course.students?.map((student) => (
                    <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                          {student.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{student.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 tracking-wide uppercase font-medium">{student.studentId || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Online"></div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-gray-400 italic text-sm">No students enrolled yet</div>
                  )}
                </div>
              </section>

              <button
                onClick={handleLeaveCourse}
                className="w-full py-4 px-6 border border-red-100 text-red-500 font-bold rounded-2xl hover:bg-red-50 hover:border-red-200 flex items-center justify-center space-x-2 group"
              >
                <span className="group-hover:">Leave Course Room</span>
              </button>
            </div>
          </div>
        ) || null}

        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50">
            <div className="max-w-2xl mx-auto space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Course Preferences</h3>
              
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 leading-tight">Student-to-Student Chat</p>
                    <p className="text-sm text-gray-500 mt-1">Allow students to message each other in the class room</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full ${course.settings?.allowStudentChat ? 'bg-blue-600' : 'bg-gray-200'} relative   cursor-pointer`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm   ${course.settings?.allowStudentChat ? 'left-7' : 'left-1'}`}></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 leading-tight">Collaborative File Sharing</p>
                    <p className="text-sm text-gray-500 mt-1">Permit students to upload documents and resources</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full ${course.settings?.allowFileSharing ? 'bg-blue-600' : 'bg-gray-200'} relative   cursor-pointer`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm   ${course.settings?.allowFileSharing ? 'left-7' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <p className="text-blue-800 text-sm font-medium">
                  <strong className="block mb-1 italic">Note</strong>
                  Only the verified instructor or a campus administrator can modify the core settings of this educational course.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

