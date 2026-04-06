import { useRef } from 'react';
import { AcademicCapIcon, CameraIcon, CheckIcon } from '@heroicons/react/24/outline';

const FACULTIES = ['EBIS', 'FAST', 'FOE', 'FBME', 'FAS', 'FVAST'];
const LEVELS = ['100', '200', '300', '400'];

const DEPT_BY_FACULTY = {
  FAST: ['Computer Science', 'Information Technology', 'Computer Engineering', 'Statistics'],
  EBIS: ['Business Administration', 'Accounting', 'Marketing', 'Finance', 'Human Resource Management', 'Secretaryship & Management Studies'],
  FOE: ['Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Chemical Engineering'],
  FBME: ['Biomedical Engineering', 'Medical Laboratory Science'],
  FAS: ['Applied Sciences', 'Mathematics', 'Physics', 'Chemistry'],
  FVAST: ['Agriculture', 'Food Science', 'Veterinary Science'],
};

export default function CourseRepForm({ formData, setFormData, avatarPreview, onFileChange, loading, onSubmit, onBack }) {
  const fileInputRef = useRef(null);
  const departments = DEPT_BY_FACULTY[formData.faculty] || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'faculty') {
      setFormData(prev => ({ ...prev, faculty: value, department: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center space-x-4 mb-8">
        <button type="button" onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900 capitalize italic tracking-tight">CR Registration</h2>
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
              <AcademicCapIcon className="w-10 h-10 text-gray-300" />
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
        <span className="text-xs font-medium text-gray-400 mt-3 uppercase tracking-tighter">Upload Profile Photo*</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label htmlFor="cr-name" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Full Name</label>
          <input
            id="cr-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="Your Full Name"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="cr-email" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">University Email</label>
          <input
            id="cr-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="your-name@stu.ktu.edu.gh"
          />
        </div>

        <div>
          <label htmlFor="cr-studentId" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Student ID</label>
          <input
            id="cr-studentId"
            name="studentId"
            type="text"
            required
            autoComplete="off"
            value={formData.studentId}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="e.g. 04201234"
          />
        </div>

        <div>
          <label htmlFor="cr-level" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Level</label>
          <select
            id="cr-level"
            name="level"
            required
            autoComplete="off"
            value={formData.level}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-bold"
          >
            <option value="">Select Level</option>
            {LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="cr-faculty" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Faculty</label>
          <select
            id="cr-faculty"
            name="faculty"
            required
            autoComplete="off"
            value={formData.faculty}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-bold uppercase"
          >
            <option value="">Select Faculty</option>
            {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="cr-department" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Department</label>
          <select
            id="cr-department"
            name="department"
            required
            autoComplete="off"
            value={formData.department}
            onChange={handleChange}
            disabled={!formData.faculty}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium disabled:opacity-50"
          >
            <option value="">{formData.faculty ? 'Select Department' : 'Select Faculty First'}</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="cr-password" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Password</label>
          <input
            id="cr-password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="cr-confirmPassword" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Confirm Password</label>
          <input
            id="cr-confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
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
        {loading ? 'Processing...' : 'Complete Registration'}
      </button>
    </form>
  );
}
