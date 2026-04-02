import { useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { authAPI } from '../services/api';
import { initSocket } from '../services/socket';
import { 
  AcademicCapIcon, 
  CameraIcon, 
  UserCircleIcon,
  XMarkIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function Register() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    department: '',
    role: 'STUDENT'
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Strict validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.studentId.trim() || !formData.department.trim()) {
      setError('All campus details are mandatory.');
      setLoading(false);
      return;
    }

    if (!avatar) {
      setError('Please upload a profile picture.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('studentId', formData.studentId);
      data.append('department', formData.department);
      data.append('role', formData.role);
      data.append('avatar', avatar);

      const response = await authAPI.register(data);
      const { token, user } = response.data;

      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Initialize socket
      initSocket();

      toast.success('Welcome to Campus Chat!');
      // Redirect to inbox
      router.push('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up | Campus Chat</title>
      </Head>

      <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
           <div className="flex justify-center">
              <div className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-200 rotate-3">
                 <AcademicCapIcon className="w-10 h-10 text-white -rotate-3" />
              </div>
           </div>
           <h2 className="mt-8 text-center text-3xl font-black tracking-tight text-gray-900 uppercase italic">
              Join the Hub
           </h2>
           <p className="mt-2 text-center text-sm font-bold text-gray-400 uppercase tracking-widest">
              Create your global campus identity
           </p>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="bg-white py-12 px-6 shadow-2xl shadow-blue-100 rounded-[3rem] border border-gray-50 sm:px-12">
            {error && (
              <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl text-sm font-bold flex items-center space-x-3">
                 <XMarkIcon className="w-5 h-5 shrink-0" />
                 <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Avatar Upload Section */}
              <div className="flex flex-col items-center justify-center space-y-4">
                 <div className="relative group">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-32 h-32 rounded-[2.5rem] border-4 flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-300 ${
                        avatarPreview ? 'border-blue-500 shadow-xl scale-105' : 'border-dashed border-gray-200 hover:border-blue-400 bg-gray-50'
                      }`}
                    >
                       {avatarPreview ? (
                          <img src={avatarPreview} className="w-full h-full object-cover" alt="Preview" />
                       ) : (
                          <div className="flex flex-col items-center space-y-1 text-gray-400">
                             <UserCircleIcon className="w-12 h-12" />
                             <span className="text-[10px] font-black uppercase tracking-tighter">Choose Photo</span>
                          </div>
                       )}
                       
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <CameraIcon className="w-8 h-8 text-white" />
                       </div>
                    </div>
                    {avatarPreview && (
                       <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center border-4 border-white shadow-lg">
                          <CheckBadgeIcon className="w-4 h-4 text-white" />
                       </div>
                    )}
                 </div>
                 <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                 />
                 <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic animate-pulse">
                    Profile Picture Required*
                 </p>
              </div>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2 leading-none">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-5 py-4 bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 rounded-2xl text-sm font-bold text-gray-900 transition-all placeholder:text-gray-300"
                    placeholder="John Doe"
                    required
                  />
                </div>

                {/* Email Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2 leading-none">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full px-5 py-4 bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 rounded-2xl text-sm font-bold text-gray-900 transition-all placeholder:text-gray-300"
                    placeholder="john@campus.edu"
                    required
                  />
                </div>

                {/* Role Toggles */}
                <div className="sm:col-span-2">
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3 leading-none">
                     I am a...
                   </label>
                   <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
                        className={`py-4 px-6 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all ${
                          formData.role === 'STUDENT' 
                            ? 'border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-200 scale-105' 
                            : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-100'
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'INSTRUCTOR' })}
                        className={`py-4 px-6 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all ${
                          formData.role === 'INSTRUCTOR' 
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105' 
                            : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-100'
                        }`}
                      >
                        Instructor
                      </button>
                   </div>
                </div>

                {/* ID and Dept */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2 leading-none">
                    {formData.role === 'INSTRUCTOR' ? 'Staff ID' : 'Student ID'}
                  </label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="block w-full px-5 py-4 bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 rounded-2xl text-sm font-bold text-gray-900 transition-all"
                    placeholder="XX-XXXX"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2 leading-none">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="block w-full px-5 py-4 bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 rounded-2xl text-sm font-bold text-gray-900 transition-all"
                    placeholder="CS / ENG"
                    required
                  />
                </div>

                {/* Passwords */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2 leading-none">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="block w-full px-5 py-4 bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 rounded-2xl text-sm font-bold text-gray-900 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2 leading-none">
                    Confirm
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="block w-full px-5 py-4 bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 rounded-2xl text-sm font-bold text-gray-900 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-5 px-4 border border-transparent text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-2xl shadow-blue-300 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center space-x-3">
                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       <span>Confirming...</span>
                    </div>
                  ) : (
                    'Finalize Registration'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-10 pt-8 border-t border-gray-50 text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Already part of the hub?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-800 transition-colors underline underline-offset-4 decoration-blue-200">
                  Login here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
