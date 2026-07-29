import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  FileText, 
  Receipt, 
  Shield, 
  LogOut,
  Activity,
  ClipboardList,
  HeartPulse
} from 'lucide-react';
import { logoutUser } from '../../firebase/auth';

// Staff-facing navigation. 'patient' is intentionally never listed in any
// of these `roles` arrays — patient accounts only ever see the personal
// "My Health" section rendered below.
const navItems = [
  { 
    path: '/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    roles: ['admin', 'doctor', 'receptionist', 'nurse', 'pharmacist']
  },
  { 
    path: '/patients', 
    label: 'Patients', 
    icon: Users,
    roles: ['admin', 'doctor', 'receptionist', 'nurse', 'pharmacist']
  },
  { 
    path: '/appointments', 
    label: 'Appointments', 
    icon: CalendarDays,
    roles: ['admin', 'doctor', 'receptionist', 'nurse']
  },
  { 
    path: '/medical-records', 
    label: 'Medical Records', 
    icon: ClipboardList,
    roles: ['admin', 'receptionist', 'nurse', 'doctor', 'pharmacist']
  },
  { 
    path: '/admin/users', 
    label: 'User Management', 
    icon: Shield,
    roles: ['admin']
  },
  { 
    path: '/admin/audit', 
    label: 'Audit Logs', 
    icon: Activity,
    roles: ['admin']
  },
];

// "My Health" — every account has one, whether they're staff or a
// patient-only login. This is the patient's own view of themselves:
// their dashboard, their records, their bills.
const personalNavItems = [
  {
    path: '/my-health',
    label: 'My Dashboard',
    icon: HeartPulse,
  },
  {
    path: '/my-appointments',
    label: 'My Appointments',
    icon: CalendarDays,
  },
  {
    path: '/my-records',
    label: 'My Records & Billing',
    icon: Receipt,
  },
];

const Sidebar = () => {
  const { user, userRole } = useAuth();
  const location = useLocation();

  const filteredNav = navItems.filter(item => item.roles.includes(userRole));
  // Staff have items above the personal section, so a divider makes sense
  // there to separate "running the clinic" from "my own health info".
  // A patient-only account has nothing above it, so the divider would just
  // be a stray line at the top of an empty list — skip it.
  const showDivider = filteredNav.length > 0;

  const renderNavLink = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => `
          flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-venus-primary-500/10 text-venus-primary-400 border border-venus-primary-500/30' 
            : 'text-venus-text-secondary hover:bg-venus-bg-tertiary hover:text-venus-text-primary'
          }
        `}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.label}</span>
      </NavLink>
    );
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className="h-screen w-64 bg-venus-bg-secondary border-r border-venus-border flex flex-col sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-venus-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-glow logo-bg">
            <Activity className="w-6 h-6 logo-icon" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-venus-text-primary">Venus</h1>
            <p className="text-xs text-venus-text-muted">Clinic System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNav.map(renderNavLink)}

        <div className={showDivider ? 'pt-4 mt-4 border-t border-venus-border' : ''}>
          <p className="px-4 mb-1.5 text-xs font-semibold uppercase tracking-wide text-venus-text-muted">
            My Health
          </p>
          <div className="space-y-1">
            {personalNavItems.map(renderNavLink)}
          </div>
        </div>
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-venus-border">
        {/* Name/role block links to the user's own profile page, where
            they can edit their info and change their password. */}
        <NavLink
          to="/profile"
          className={({ isActive }) => `
            mb-4 block px-4 py-2 rounded-lg transition-all duration-200 border
            ${isActive
              ? 'bg-venus-primary-500/10 border-venus-primary-500/30'
              : 'bg-venus-bg-tertiary border-transparent hover:bg-venus-bg-elevated hover:border-venus-border'
            }
          `}
          title="View and edit your profile"
        >
          <p className="text-sm font-medium text-venus-text-primary truncate">
            {user?.displayName || 'User'}
          </p>
          <p className="text-xs text-venus-text-muted capitalize">{userRole}</p>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-venus-danger hover:bg-venus-danger/10 rounded-lg transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;