import { useState } from 'react';
import { AcademicCapIcon, BookOpenIcon, CalendarIcon, HashtagIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { courseAPI } from '../../services/api';

export default function CreateCourseForm({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    semester: 'Fall',
    year: new Date().getFullYear(),
    department: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await courseAPI.createCourse(formData);
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Course Code & Name */}
      <div className="grid grid-cols-1 gap-4">
        <div className="relative">
          <HashtagIcon className="absolute left-4 top-1/2 -/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            name="code"
            placeholder="Course Code (e.g. CS101)"
            required
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
            className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500/20 pl-12 pr-4 py-3.5 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary-500/5"
          />
        </div>
        <div className="relative">
          <BookOpenIcon className="absolute left-4 top-1/2 -/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            name="name"
            placeholder="Course Name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500/20 pl-12 pr-4 py-3.5 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary-500/5"
          />
        </div>
      </div>

      {/* Description */}
      <div className="relative">
        <ChatBubbleBottomCenterTextIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
        <textarea
          name="description"
          placeholder="Brief description..."
          rows="3"
          value={formData.description}
          onChange={handleChange}
          className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500/20 pl-12 pr-4 py-4 rounded-2xl text-sm font-medium placeholder:text-slate-300 focus:ring-4 focus:ring-primary-500/5 resize-none"
        ></textarea>
      </div>

      {/* Semester & Year */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <CalendarIcon className="absolute left-4 top-1/2 -/2 w-5 h-5 text-slate-400" />
          <select
            name="semester"
            value={formData.semester}
            onChange={handleChange}
            className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500/20 pl-12 pr-4 py-3.5 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-primary-500/5 appearance-none"
          >
            <option value="Fall">Fall</option>
            <option value="Spring">Spring</option>
            <option value="Summer">Summer</option>
            <option value="Winter">Winter</option>
          </select>
        </div>
        <div className="relative">
          <AcademicCapIcon className="absolute left-4 top-1/2 -/2 w-5 h-5 text-slate-400" />
          <input
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            className="w-full bg-slate-50 border-2 border-slate-50 focus:border-primary-500/20 pl-12 pr-4 py-3.5 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-primary-500/5"
          />
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-[2] bg-slate-900 text-white px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-primary-600 hover:shadow-primary-500/30 active: disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Launch Course'}
        </button>
      </div>
    </form>
  );
}
