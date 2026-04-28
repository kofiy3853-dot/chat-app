import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AcademicCapIcon, UsersIcon, ChatBubbleLeftIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { getInitials, getAvatarColor } from '../../utils/helpers';
import { getSocket } from '../../services/socket';

export default function CourseCard({ course }) {
  const [localUnreadCount, setLocalUnreadCount] = useState(course?.unreadCount || 0);

  useEffect(() => {
    setLocalUnreadCount(course?.unreadCount || 0);
  }, [course?.unreadCount]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleNotification = (data) => {
        if (data.courseId === course.id) {
          setLocalUnreadCount(prev => prev + 1);
        }
      };

      socket.on('course-notification', handleNotification);
      return () => socket.off('course-notification', handleNotification);
    }
  }, [course.id]);

  if (!course) return null;

  const instructorName = course.instructor?.name || 'Unknown Instructor';
  const studentCount = course.students?.length || 0;

  return (
    <div
      className="group relative bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-primary-500/5"
    >
      <Link href={`/courses/${course.id}`} className="absolute inset-0 z-10 rounded-[2rem]"></Link>
      
      {/* Header Info */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-primary-100/50">
            {course.code}
          </span>
          <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-slate-100">
            {course.semester} {course.year}
          </span>
        </div>
        <button className="relative z-20 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl">
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Course Title */}
      <div className="mb-6">
        <h3 className="text-xl font-black text-slate-900 group-hover:text-primary-600 leading-tight line-clamp-2">
          {course.name}
        </h3>
        {course.description && (
          <p className="mt-2 text-sm text-slate-500 line-clamp-2 font-medium leading-relaxed">
            {course.description}
          </p>
        )}
      </div>

      {/* Instructor & Stats */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-50">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${getAvatarColor(instructorName)} flex items-center justify-center text-white text-xs font-black shadow-sm group-hover:  `}>
            {getInitials(instructorName)}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Instructor</span>
            <span className="text-sm font-black text-slate-800 tracking-tight">{instructorName}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-1 text-slate-400">
              <UsersIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-black tracking-tight">{studentCount}</span>
            </div>
          </div>
          
          {localUnreadCount > 0 && (
            <div className={`flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-primary-600 text-white rounded-lg text-[10px] font-black shadow-lg shadow-primary-500/30  ${localUnreadCount > (course.unreadCount || 0) ? '' : ''}`}>
              {localUnreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
