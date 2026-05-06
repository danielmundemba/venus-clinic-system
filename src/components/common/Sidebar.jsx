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
  Activity
} from 'lucide-react';
import { logoutUser } from '../../firebase/auth';

const Sidebar = () => {
  const { user, userRole, isAdmin, isDoctor, isReceptionist, isNurse } = useAuth();
  const location = useLocation();

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      roles: ['admin', 'doctor', 'receptionist', 'nurse']
    },
    { 
      path: '/patients', 
      label: 'Patients', 
      icon: Users,
      roles: ['admin', 'doctor', 'receptionist', 'nurse']
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
      icon: FileText,
      roles: ['admin', 'doctor', 'nurse']
    },
    { 
      path: '/billing', 
      label: 'Billing', 
      icon: Receipt,
      roles: ['admin', 'receptionist']
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

  const filteredNav = navItems.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className="w-64 bg-venus-bg-secondary border-r border-venus-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-venus-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-venus-primary-500 rounded-lg flex items-center justify-center shadow-glow">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-venus-text-primary">Venus</h1>
            <p className="text-xs text-venus-text-muted">Clinic System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          location.pathname.startsWith(`${item.path}/`);
          
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
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-venus-border">
        <div className="mb-4 px-4 py-2 bg-venus-bg-tertiary rounded-lg">
          <p className="text-sm font-medium text-venus-text-primary truncate">
            {user?.displayName || 'User'}
          </p>
          <p className="text-xs text-venus-text-muted capitalize">{userRole}</p>
        </div>
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