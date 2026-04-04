import { useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { authAPI } from '../services/api';
import { initSocket } from '../services/socket';
import { initOneSignal } from '../services/oneSignal';
import { 
  AcademicCapIcon, 
  CameraIcon, 
  UserIcon,
  CheckIcon
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
    faculty: '',
    level: '',
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
    const { name, email, studentId, department, faculty, level, password } = formData;
    if (!name.trim() || !email.trim() || !studentId.trim() || !department.trim() || !faculty || !level) {
      setError('All fields are mandatory.');
      toast.error('Please fill in all campus details.');
      setLoading(false);
      return;
    }

    if (!formData.email.toLowerCase().endsWith('@ktu.edu.gh')) {
      setError('Only @ktu.edu.gh emails are allowed.');
      toast.error('Access Denied. Use your university email.');
      setLoading(false);
      return;
    }

    if (!avatar) {
      setError('Please upload a profile picture.');
      toast.error('Profile picture is required.');
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
      data.append('faculty', formData.faculty);
      data.append('level', formData.level);
      data.append('role', formData.role);
      data.append('avatar', avatar);

      const response = await authAPI.register(data);
      const { token, user, redirectTo } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      initSocket();
      
      // Initialize OneSignal
      initOneSignal(user);

      // Redirect based on role
      toast.success('Account created successfully!');
      if (user.role === "NANA") {
        router.replace("/nana");
      } else {
        router.replace(redirectTo || "/");
      }
    } catch (err) {
      console.error("REGISTER FRONTEND ERROR:", err.message);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Account | Campus Chat</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-xl w-full">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-200">
              <AcademicCapIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Account</h1>
            <p className="text-gray-500 mt-2">Join your global campus network</p>
          </div>

          {/* Registration Card */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 sm:p-12">
            {error && (
              <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Selection */}
              <div className="flex flex-col items-center justify-center mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
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
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <span className="text-xs font-medium text-gray-400 mt-3">Upload Profile Photo*</span>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    placeholder="John Doe"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    placeholder="your-name@ktu.edu.gh"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
                      className={`px-3 py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                        formData.role === 'STUDENT' 
                          ? 'border-primary-600 bg-primary-50 text-primary-600' 
                          : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'COURSE_REP' })}
                      className={`px-3 py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                        formData.role === 'COURSE_REP' 
                          ? 'border-primary-600 bg-primary-50 text-primary-600' 
                          : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      CR
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'LECTURER' })}
                      className={`px-3 py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                        formData.role === 'LECTURER' 
                          ? 'border-primary-600 bg-primary-50 text-primary-600' 
                          : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      Lecturer
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Faculty</label>
                    <select
                      value={formData.faculty}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm font-bold uppercase"
                    >
                      <option value="" disabled>Select</option>
                      {['EBIS', 'FAST', 'FOE', 'FBME', 'FAS', 'FVAST'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Level</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm font-bold"
                    >
                      <option value="" disabled>Select</option>
                      {['100', '200', '300', '400'].map(l => (
                        <option key={l} value={l}>Level {l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.role === 'LECTURER' ? 'Staff ID' : 'Student ID'}
                  </label>
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    required
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    placeholder="XX-XXXX"
                  />
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    id="department"
                    name="department"
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    placeholder="e.g. Computer Science"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-100 mt-4 active:scale-95"
              >
                {loading ? 'Processing...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-primary-600 hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
