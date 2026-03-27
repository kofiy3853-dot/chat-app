import Link from 'next/link';
import { AcademicCapIcon, UsersIcon, ChatBubbleLeftIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { getInitials, getAvatarColor, formatRelativeTime } from '../../utils/helpers';

export default function CourseCard({ course }) {
  if (!course) return null;

  const instructorName = course.instructor?.name || 'Unknown Instructor';
  const studentCount = course.students?.length || 0;
  const unreadCount = course.unreadCount || 0;

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300"
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
        <button className="relative z-20 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Course Title */}
      <div className="mb-6">
        <h3 className="text-xl font-black text-slate-900 group-hover:text-primary-600 transition-colors leading-tight line-clamp-2">
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
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${getAvatarColor(instructorName)} flex items-center justify-center text-white text-xs font-black shadow-sm group-hover:rotate-6 transition-transform duration-300`}>
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
          
          {unreadCount > 0 && (
            <div className="flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-primary-600 text-white rounded-lg text-[10px] font-black shadow-lg shadow-primary-500/30 animate-pulse">
              {unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* Notification Dot for Active State */}
      {course.isActive && (
        <span className="absolute top-4 right-4 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
      )}
    </motion.div>
  );
}
