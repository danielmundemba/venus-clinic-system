import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { ROLE_COLORS } from "../../styles/theme";

const Navbar = () => {
  const { userRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-venus-bg-secondary border-b border-venus-border flex items-center justify-between px-6">
      {/* Spacer where quick search used to be */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-venus-text-secondary hover:text-venus-text-primary hover:bg-venus-bg-tertiary rounded-lg transition-all"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Role badge */}
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full border capitalize ${ROLE_COLORS[userRole] || ""}`}
        >
          {userRole}
        </span>
      </div>
    </header>
  );
};

export default Navbar;
