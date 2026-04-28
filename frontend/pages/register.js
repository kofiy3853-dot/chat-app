import { useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { authAPI, pushAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

import { initSocket } from '../services/socket';
import { requestFirebaseNotificationPermission } from '../config/firebase';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { compressImage } from '../utils/helpers';

// New specialized components
import RoleSelection from '../components/registration/RoleSelection';
import StudentForm from '../components/registration/StudentForm';
import CourseRepForm from '../components/registration/CourseRepForm';
import LecturerForm from '../components/registration/LecturerForm';

export default function Register() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState('role'); // 'role' or 'form'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    staffId: '',
    department: '',
    faculty: '',
    level: '',
    phone: '',
    coursesTeaching: [],
    role: 'STUDENT'
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelection = (selectedRole) => {
    setFormData(prev => ({ ...prev, role: selectedRole }));
    setStep('form');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      try {
        const compressed = await compressImage(file, 400, 400, 0.7);
        setAvatar(compressed);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result);
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.error('Compression failed:', err);
        toast.error('Failed to process image');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { name, email, password, confirmPassword, role } = formData;

    // Basic common validation
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Essential profile details are mandatory.');
      toast.error('Please fill in your profile info.');
      setLoading(false);
      return;
    }

    // Password match check — run early before file/network checks
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      toast.error('Passwords do not match.');
      setLoading(false);
      return;
    }

    // Role-specific field validation
    if (role === 'LECTURER') {
      if (!formData.staffId?.trim()) {
        setError('Staff ID is required for lecturers.');
        toast.error('Staff ID is required.');
        setLoading(false);
        return;
      }
    } else {
      if (!formData.studentId?.trim() || !formData.level) {
        setError('Student ID and Level are required.');
        toast.error('Please fill in your Student ID and Level.');
        setLoading(false);
        return;
      }
    }

    // Domain validation
    const normalizedEmail = email.toLowerCase().trim();
    const isKtuEmail = normalizedEmail.endsWith('@stu.ktu.edu.gh') || 
                       normalizedEmail.endsWith('@staff.ktu.edu.gh') || 
                       normalizedEmail.endsWith('@ktu.edu.gh');
    
    if (!isKtuEmail) {
      setError('Registration is restricted to KTU university emails.');
      toast.error('Access Denied. Use your university email.');
      setLoading(false);
      return;
    }

    if (role === 'LECTURER' && !normalizedEmail.endsWith('@staff.ktu.edu.gh') && !normalizedEmail.endsWith('@ktu.edu.gh')) {
        setError('Lecturers must use a staff or institution email (@staff.ktu.edu.gh).');
        toast.error('Staff email required for lecturers.');
        setLoading(false);
        return;
    }

    if (!avatar) {
      setError('Please upload a profile picture.');
      toast.error('Profile photo is mandatory.');
      setLoading(false);
      return;
    }

    // (Password match already validated above — skip duplicate check)

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', normalizedEmail);
      data.append('password', formData.password);
      data.append('department', formData.department);
      data.append('faculty', formData.faculty);
      data.append('role', formData.role);

      // Role specific fields must be appended BEFORE the file for Multer
      if (role === 'LECTURER') {
        data.append('staffId', formData.staffId);
        data.append('phone', formData.phone);
        if (formData.coursesTeaching && formData.coursesTeaching.length > 0) {
            data.append('coursesTeaching', formData.coursesTeaching.join(','));
        }
      } else {
        data.append('studentId', formData.studentId);
        data.append('level', formData.level);
      }

      // Append file last
      data.append('avatar', avatar);

      const response = await authAPI.register(data);
      const { token, user, redirectTo } = response.data;

      // Sync with global AuthContext
      login(user, token);
      
      try {
        const fcmToken = await requestFirebaseNotificationPermission();
        if(fcmToken) {
         await pushAPI.updateFcmToken(fcmToken).catch(() => {});

        }
      } catch (fcmError) {
        console.warn('FCM fail-safe:', fcmError);
      }

      toast.success('Registration successful! Welcome to the hub.');
    } catch (err) {
      console.error('REGISTRATION ERROR:', err.response?.data || err);
      const msg = err.response?.data?.message || 'Registration failed. Please check your details.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    const commonProps = {
      formData,
      setFormData,
      avatarPreview,
      onFileChange: handleFileChange,
      loading,
      onSubmit: handleSubmit,
      onBack: () => setStep('role')
    };

    switch (formData.role) {
      case 'LECTURER': return <LecturerForm {...commonProps} />;
      case 'COURSE_REP': return <CourseRepForm {...commonProps} />;
      case 'STUDENT': 
      default: return <StudentForm {...commonProps} />;
    }
  };

  return (
    <>
      <Head>
        <title>Join Campus Hub | Registration</title>
      </Head>

      <div className="h-full w-full bg-[#FAFAFA] px-4 py-12 flex flex-col items-center overflow-y-auto">
        <div className="max-w-xl w-full">
          {/* Global Header */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-[2rem] shadow-xl shadow-primary-200 hover: active: mb-6">
              <AcademicCapIcon className="w-12 h-12 text-white" />
            </Link>
            <h1 className="text-3xl font-black text-app-primary tracking-tightest">CAMPUS HUB</h1>
            <p className="text-sm font-medium text-app-muted mt-2 uppercase tracking-widest italic">Koforidua Technical University</p>
          </div>

          {/* Card Container */}
          <div className="bg-surface rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white p-8 sm:p-12 relative overflow-hidden">
            {/* Elegant Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
            
            {error && (
              <div className="mb-8 p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-bold uppercase tracking-tight flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                {error}
              </div>
            )}

            {step === 'role' ? (
              <RoleSelection onSelect={handleRoleSelection} />
            ) : (
              renderForm()
            )}

            <div className="mt-10 text-center border-t border-gray-50 pt-8">
              <p className="text-sm text-app-muted font-medium">
                Already part of the network?{' '}
                <Link href="/login" className="text-primary-600 hover:text-primary-700 font-bold ml-1">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center opacity-30">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-muted">© 2026 KU Connect • Secure Academic Portal</p>
          </div>
        </div>
      </div>
    </>
  );
}
