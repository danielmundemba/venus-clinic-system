import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Bell, Moon, Sun, Search } from 'lucide-react';
import { ROLE_COLORS } from '../../styles/theme';

const Navbar = () => {
  const { user, userRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-venus-bg-secondary border-b border-venus-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-venus-text-muted" />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full bg-venus-bg-tertiary border border-venus-border rounded-lg pl-10 pr-4 py-2 text-sm text-venus-text-primary placeholder-venus-text-muted focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500 transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-venus-text-secondary hover:text-venus-text-primary hover:bg-venus-bg-tertiary rounded-lg transition-all"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-venus-text-secondary hover:text-venus-text-primary hover:bg-venus-bg-tertiary rounded-lg transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-venus-danger rounded-full"></span>
        </button>

        {/* Role badge */}
        <span className={`px-3 py-1 text-xs font-medium rounded-full border capitalize ${ROLE_COLORS[userRole] || ''}`}>
          {userRole}
        </span>
      </div>
    </header>
  );
};

export default Navbar;