import { useState, useRef } from 'react';
import { authAPI, chatAPI } from '../services/api';
import { 
  UserIcon, 
  EnvelopeIcon, 
  AcademicCapIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  IdentificationIcon,
  BuildingLibraryIcon,
  CameraIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';
import { getFullFileUrl, compressImage } from '../utils/helpers';

export default function ProfileCard({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    department: user?.department || '',
    faculty: user?.faculty || '',
    level: user?.level || '',
    avatar: user?.avatar || '',
    status: user?.status || 'Available'
  });
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.updateProfile(formData);
      onUpdate?.(response.data.user);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingAvatar(true);
    try {
      // Compress to 400x400 before upload
      const compressed = await compressImage(file, 400, 400, 0.7);
      
      const data = new FormData();
      data.append('file', compressed);
      const response = await chatAPI.uploadMessageAttachment(data);
      if (response.data?.url || response.data?.fileUrl) {
        const uploadedUrl = response.data.url || response.data.fileUrl;
        setFormData(prev => ({ ...prev, avatar: uploadedUrl }));
        
        const updatedUser = await authAPI.updateProfile({ ...formData, avatar: uploadedUrl });
        onUpdate?.(updatedUser.data.user);
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'bg-rose-500 text-white shadow-rose-200';
      case 'LECTURER': return 'bg-violet-600 text-white shadow-violet-200 font-black';
      case 'COURSE_REP': return 'bg-amber-500 text-white shadow-amber-200 font-bold';
      case 'STUDENT': return 'bg-emerald-600 text-white shadow-emerald-200';
      default: return 'bg-slate-600 text-white shadow-slate-200';
    }
  };

  return (
    <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
      {/* Cover Header */}
      <div className="h-32 bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="absolute top-4 right-6">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2.5 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-xl shadow-lg active: group"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Profile Content Wrapper */}
      <div className="px-8 pb-10">
        {/* Avatar Section */}
        <div className="relative -mt-14 mb-6 flex items-end justify-between">
          <div className="relative group">
            <div className="w-28 h-28 rounded-[2rem] bg-white p-1.5 shadow-xl relative flex-shrink-0">
              <div className="w-full h-full rounded-[1.6rem] bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-inner overflow-hidden">
                {formData.avatar || user?.avatar ? (
                  <img src={getFullFileUrl(formData.avatar || user?.avatar)} decoding="async" alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-white/60 rounded-[2rem] flex items-center justify-center backdrop-blur-sm z-10">
                  <div className="w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full" />
                </div>
              )}
            </div>
            {isEditing && (
              <label 
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-2 bg-white text-primary-600 rounded-lg shadow-lg border border-slate-100 hover: active: z-20 cursor-pointer"
              >
                <CameraIcon className="w-4 h-4" />
                <input 
                  type="file" 
                  id="avatar-upload" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                />
              </label>
            )}
          </div>

          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${getRoleBadgeColor(user?.role)}`}>
            {user?.role || 'User'}
          </div>
        </div>

        <div className="flex-1 text-slate-900">
          {isEditing ? (
            <form 
              onSubmit={handleSubmit} 
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Faculty</label>
                  <div className="relative">
                    <BuildingLibraryIcon className="absolute left-3 top-1/2 -/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.faculty}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Department</label>
                  <div className="relative">
                    <BuildingLibraryIcon className="absolute left-3 top-1/2 -/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Current Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 font-black text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <option value="">Select Level</option>
                    <option value="100">Level 100</option>
                    <option value="200">Level 200</option>
                    <option value="300">Level 300</option>
                    <option value="400">Level 400</option>
                    <option value="OTHER">Other / Postgraduate</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Status Message</label>
                  <div className="relative">
                    <ChatBubbleBottomCenterTextIcon className="absolute left-3 top-1/2 -/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-600/20 flex items-center justify-center space-x-2"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-slate-100 text-slate-500 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 flex items-center justify-center space-x-2"
                >
                  <XMarkIcon className="w-4 h-4" />
                  <span>Dismiss</span>
                </button>
              </div>
            </form>
          ) : (
            <div 
              className="space-y-6"
            >
              {/* Identity Header */}
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{user?.name}</h2>
                <div className="flex items-center space-x-2 mt-1">
                   <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                    Level {user?.level || 'N/A'}
                  </span>
                  <div className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight italic">
                      "{user?.status || 'Available'}"
                    </span>
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-400 mt-2 flex items-center">
                  <EnvelopeIcon className="w-3.5 h-3.5 mr-2" />
                  {user?.email}
                </p>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-2 text-primary-600 mb-1.5 uppercase font-black tracking-widest text-[9px]">
                    <BuildingLibraryIcon className="w-3.5 h-3.5" />
                    <span>Faculty</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 truncate">{user?.faculty || 'Not Specified'}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-2 text-indigo-600 mb-1.5 uppercase font-black tracking-widest text-[9px]">
                    <BuildingLibraryIcon className="w-3.5 h-3.5" />
                    <span>Department</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 truncate">{user?.department || 'Not Specified'}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 md:col-span-2">
                  <div className="flex items-center space-x-2 text-amber-600 mb-1.5 uppercase font-black tracking-widest text-[9px]">
                    <IdentificationIcon className="w-3.5 h-3.5" />
                    <span>Identification</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{user?.studentId || user?.instructorId || 'N/A'}</p>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex items-center space-x-4 pt-2 border-t border-slate-50 uppercase">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 tracking-widest">Academic Status</span>
                  <div className="flex items-center mt-1 text-emerald-600 space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-black">Active Member</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-100" />
                <div className="flex flex-col flex-1">
                   <span className="text-[8px] font-black text-slate-400 tracking-widest">Innovation Hub</span>
                   <div className="flex items-center mt-1 text-primary-600 space-x-1.5">
                    <AcademicCapIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black">KTU Student Network</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
