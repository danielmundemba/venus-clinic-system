import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Bell, Moon, Sun, Search, X, Loader2, User } from 'lucide-react';
import { ROLE_COLORS } from '../../styles/theme';
import { searchPatients } from '../../firebase/db';

const Navbar = () => {
  const { user, userRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (!term.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const patients = await searchPatients(term);
        setResults(patients);
      } catch (error) {
        console.error('Quick search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (patient) => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    navigate(`/patients/${patient.id}`);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <header className="h-16 bg-venus-bg-secondary border-b border-venus-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-xl relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-venus-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Quick search..."
            className="w-full bg-venus-bg-tertiary border border-venus-border rounded-lg pl-10 pr-10 py-2 text-sm text-venus-text-primary placeholder-venus-text-muted focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500 transition-all"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-primary-400 animate-spin" />
          )}
          {!loading && query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-venus-text-muted hover:text-venus-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Results */}
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-venus-bg-secondary border border-venus-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {results.map((patient) => (
              <button
                key={patient.id}
                onClick={() => handleSelect(patient)}
                className="w-full text-left px-4 py-3 hover:bg-venus-bg-tertiary border-b border-venus-border last:border-0 transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-venus-primary-500/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-venus-primary-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-venus-text-primary truncate">
                    {patient.firstName} {patient.lastName}
                    {patient.isStaff && (
                      <span className="ml-2 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-500/20">
                        Staff
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-venus-text-muted mt-0.5 truncate">
                    {patient.phone || 'No phone'} • {patient.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && query && !loading && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-venus-bg-secondary border border-venus-border rounded-lg shadow-lg z-50 p-4 text-center">
            <p className="text-sm text-venus-text-muted">No patients found</p>
          </div>
        )}
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

// Debounce utility
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export default Navbar;