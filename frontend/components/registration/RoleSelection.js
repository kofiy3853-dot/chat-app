import { AcademicCapIcon, UserIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

const roles = [
  {
    id: 'STUDENT',
    title: 'Student',
    description: 'Join as a regular student to chat with peers and access materials.',
    icon: UserIcon,
    color: 'bg-blue-50 text-blue-600 border-blue-100'
  },
  {
    id: 'COURSE_REP',
    title: 'Course Rep',
    description: 'Manage course announcements and represent your class.',
    icon: AcademicCapIcon,
    color: 'bg-purple-50 text-purple-600 border-purple-100'
  },
  {
    id: 'LECTURER',
    title: 'Lecturer',
    description: 'Create courses, upload materials, and manage student communication.',
    icon: BriefcaseIcon,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  }
];

export default function RoleSelection({ onSelect }) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900">Choose Your Role</h2>
        <p className="text-sm text-gray-500 mt-1">Select how you will participate in the campus network</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => onSelect(role.id)}
            className={`flex items-center p-5 rounded-2xl border-2 border-transparent bg-white shadow-sm hover:border-primary-500 hover:shadow-md transition-all text-left group active:scale-[0.98] outline-none`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${role.color} group-hover:scale-110 transition-transform`}>
              <role.icon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{role.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{role.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
