import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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
  HeartPulse,
  Pill,
  ChevronRight,
} from "lucide-react";
import { logoutUser } from "../../firebase/auth";
import { DoorOpen } from "lucide-react";

// Staff-facing navigation. 'patient' is intentionally never listed in any
// of these `roles` arrays — patient accounts only ever see the personal
// "My Health" section rendered below.
const navItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "doctor", "receptionist", "nurse", "pharmacist"],
  },
  {
    path: "/patients",
    label: "Patients",
    icon: Users,
    roles: ["doctor", "receptionist", "nurse"],
  },
  {
    path: "/appointments",
    label: "Appointments",
    icon: CalendarDays,
    roles: ["doctor", "receptionist", "nurse"],
  },
  {
    path: "/medical-records",
    label: "Medical Records",
    icon: ClipboardList,
    roles: ["receptionist", "nurse", "doctor", "pharmacist"],
  },
  {
    path: "/admin/users",
    label: "User Management",
    icon: Shield,
    roles: ["admin"],
  },
  {
    path: "/admin/medications",
    label: "Medication Catalog",
    icon: Pill,
    roles: ["pharmacist"],
  },
  {
    path: "/admin/nurse-rooms",
    label: "Nurse Rooms",
    icon: DoorOpen,
    roles: ["admin"],
  },
  {
    path: "/admin/audit",
    label: "Audit Logs",
    icon: Activity,
    roles: ["admin"],
  },
];

// "My Health" — every account has one, whether they're staff or a
// patient-only login. This is the patient's own view of themselves:
// their dashboard, their records, their bills.
const personalNavItems = [
  {
    path: "/my-health",
    label: "My Dashboard",
    icon: HeartPulse,
  },
  {
    path: "/my-appointments",
    label: "My Appointments",
    icon: CalendarDays,
  },
  {
    path: "/my-records",
    label: "My Records & Billing",
    icon: Receipt,
  },
];

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase() || "U";
};

const Sidebar = () => {
  const { user, userRole } = useAuth();
  const location = useLocation();

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));
  const showDivider = filteredNav.length > 0;

  const renderNavLink = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => `
          flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
          ${
            isActive
              ? "bg-venus-primary-500/10 text-venus-primary-400 border border-venus-primary-500/30"
              : "text-venus-text-secondary hover:bg-venus-bg-tertiary hover:text-venus-text-primary"
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
      console.error("Logout error:", error);
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

        <div
          className={
            showDivider ? "pt-4 mt-4 border-t border-venus-border" : ""
          }
        >
          <p className="px-4 mb-1.5 text-xs font-semibold uppercase tracking-wide text-venus-text-muted">
            My Health
          </p>
          <div className="space-y-1">{personalNavItems.map(renderNavLink)}</div>
        </div>
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-venus-border">
        <NavLink
          to="/profile"
          className={({ isActive }) => `
            group mb-4 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 border cursor-pointer
            ${
              isActive
                ? "bg-venus-primary-500/10 border-venus-primary-500/30 shadow-sm"
                : "bg-venus-bg-tertiary border-transparent hover:bg-venus-bg-elevated hover:border-venus-border hover:shadow-sm"
            }
          `}
          title="View and edit your profile"
        >
          <div className="w-9 h-9 shrink-0 rounded-full bg-venus-primary-500/20 flex items-center justify-center text-venus-primary-400 text-xs font-bold">
            {getInitials(user?.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-venus-text-primary truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-venus-text-muted capitalize truncate">
              {userRole}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 text-venus-text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-venus-text-primary" />
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-venus-danger hover:bg-venus-danger/10 rounded-lg transition-all duration-200"
        >
          <LogOut className="w-5 h-5" style={{ transform: "scaleX(-1)" }} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
