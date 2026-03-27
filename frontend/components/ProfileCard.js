import { useState } from 'react';
import { authAPI } from '../services/api';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  AcademicCapIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function ProfileCard({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    department: user?.department || ''
  });
  const [loading, setLoading] = useState(false);

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

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700 font-bold border border-red-200';
      case 'INSTRUCTOR':
        return 'bg-purple-100 text-purple-700 font-bold border border-purple-200';
      case 'STUDENT':
        return 'bg-green-100 text-green-700 font-bold border border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 font-bold border border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Avatar */}
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Computer Science"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <CheckIcon className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2"
            >
              <XMarkIcon className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Name */}
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium text-gray-900">{user?.name}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center space-x-3">
            <EnvelopeIcon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center space-x-3">
            <AcademicCapIcon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getRoleBadgeColor(user?.role)}`}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>
          </div>

          {/* Department */}
          {user?.department && (
            <div className="flex items-center space-x-3">
              <AcademicCapIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium text-gray-900">{user.department}</p>
              </div>
            </div>
          )}

          {/* Student ID */}
          {user?.studentId && (
            <div className="flex items-center space-x-3">
              <AcademicCapIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Student ID</p>
                <p className="font-medium text-gray-900">{user.studentId}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
