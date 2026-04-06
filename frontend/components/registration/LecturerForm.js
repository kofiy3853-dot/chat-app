import { useRef } from 'react';
import { BriefcaseIcon, CameraIcon, CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const FACULTIES = ['EBIS', 'FAST', 'FOE', 'FBME', 'FAS', 'FVAST'];

export default function LecturerForm({ formData, setFormData, avatarPreview, onFileChange, loading, onSubmit, onBack }) {
  const fileInputRef = useRef(null);
  const courseInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addCourse = () => {
    const course = courseInputRef.current.value.trim();
    if (course && !formData.coursesTeaching.includes(course)) {
      setFormData(prev => ({
        ...prev,
        coursesTeaching: [...prev.coursesTeaching, course]
      }));
      courseInputRef.current.value = '';
    }
  };

  const removeCourse = (course) => {
    setFormData(prev => ({
      ...prev,
      coursesTeaching: prev.coursesTeaching.filter(c => c !== course)
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center space-x-4 mb-8">
        <button type="button" onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900 capitalize italic tracking-tight">Lecturer Profile</h2>
      </div>

      {/* Avatar Selection */}
      <div className="flex flex-col items-center justify-center mb-4">
        <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
          <div className={`w-24 h-24 rounded-full border-2 overflow-hidden bg-gray-50 flex items-center justify-center transition-colors ${
            avatarPreview ? 'border-primary-600' : 'border-dashed border-gray-300 hover:border-primary-400'
          }`}>
            {avatarPreview ? (
              <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
            ) : (
              <BriefcaseIcon className="w-10 h-10 text-gray-300" />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
              <CameraIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          {avatarPreview && (
            <div className="absolute -bottom-1 -right-1 bg-primary-600 text-white p-1 rounded-full border-2 border-white">
              <CheckIcon className="w-3 h-3" />
            </div>
          )}
        </div>
        <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
        <span className="text-xs font-medium text-gray-400 mt-3 uppercase tracking-tighter">Official Portrait Recommended*</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Full Name (with Titles)</label>
          <input
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="Dr. Jane Smith"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">University Email (@staff.ktu.edu.gh)</label>
          <input
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="jsmith@staff.ktu.edu.gh"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Staff ID</label>
          <input
            name="staffId"
            type="text"
            required
            value={formData.staffId}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="KTU-LECT-XXXX"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Phone Number</label>
          <input
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="+233 XXX XXX XXX"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Faculty</label>
          <select
            name="faculty"
            required
            value={formData.faculty}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-bold"
          >
            <option value="">Select Faculty</option>
            {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Department</label>
          <input
            name="department"
            type="text"
            required
            value={formData.department}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="Head of Dept."
          />
        </div>

        {/* Courses Multi-select */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Courses Teaching</label>
          <div className="flex space-x-2 mb-3">
            <input
              ref={courseInputRef}
              type="text"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
              placeholder="e.g. CSC 301"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCourse())}
            />
            <button
              type="button"
              onClick={addCourse}
              className="px-4 py-3 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.coursesTeaching.map(course => (
              <span key={course} className="inline-flex items-center px-3 py-1 bg-white border border-primary-100 text-primary-700 text-xs font-bold rounded-lg group hover:border-primary-300 transition-all">
                {course}
                <button type="button" onClick={() => removeCourse(course)} className="ml-2 text-primary-300 group-hover:text-red-500">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Confirm Password</label>
          <input
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-100 mt-6 active:scale-95 uppercase tracking-widest text-xs"
      >
        {loading ? 'Registering Lecturer...' : 'Complete Registration'}
      </button>
    </form>
  );
}
