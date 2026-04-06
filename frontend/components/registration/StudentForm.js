import { useRef } from 'react';
import { UserIcon, CameraIcon, CheckIcon } from '@heroicons/react/24/outline';

const FACULTIES = ['EBIS', 'FAST', 'FOE', 'FBME', 'FAS', 'FVAST'];
const LEVELS = ['100', '200', '300', '400'];

export default function StudentForm({ formData, setFormData, avatarPreview, onFileChange, loading, onSubmit, onBack }) {
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center space-x-4 mb-8">
        <button type="button" onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900 capitalize italic tracking-tight">Student Details</h2>
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
              <UserIcon className="w-10 h-10 text-gray-300" />
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
        <span className="text-xs font-medium text-gray-400 mt-3 uppercase tracking-tighter">Profile Photo Required*</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Full Name</label>
          <input
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="John Doe"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">University Email</label>
          <input
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="your-name@stu.ktu.edu.gh"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Student ID</label>
          <input
            name="studentId"
            type="text"
            required
            value={formData.studentId}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-medium"
            placeholder="0420"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Level</label>
          <select
            name="level"
            required
            value={formData.level}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-bold"
          >
            <option value="">Select Level</option>
            {LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Faculty</label>
          <select
            name="faculty"
            required
            value={formData.faculty}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm font-bold uppercase"
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
            placeholder="Computer Science"
          />
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
        {loading ? 'Processing...' : 'Complete Registration'}
      </button>
    </form>
  );
}
