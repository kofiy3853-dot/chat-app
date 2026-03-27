import { useEffect, useState } from 'react';
import Link from 'next/link';
import { courseAPI } from '../services/api';
import { AcademicCapIcon, UsersIcon } from '@heroicons/react/24/outline';

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await courseAPI.getCourses();
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-100 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <AcademicCapIcon className="w-16 h-16 mx-auto mb-4 text-blue-100" />
          <h3 className="text-lg font-semibold text-gray-900">No courses yet</h3>
          <p className="text-sm mt-1 text-gray-500 max-w-xs mx-auto">Join a course to see announcements, chat with students, and access course materials.</p>
        </div>
      ) : (
        courses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    {course.code}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">
                    {course.semester} {course.year}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {course.name}
                </h3>
                {course.description && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs font-semibold text-gray-500">
                <div className="flex items-center space-x-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
                  <UsersIcon className="w-3.5 h-3.5" />
                  <span>{course._count?.students || course.students?.length || 0} students</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                  {course.instructor?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-medium">Instructor</span>
                  <span className="text-xs font-bold text-gray-800">
                    {course.instructor?.name}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

