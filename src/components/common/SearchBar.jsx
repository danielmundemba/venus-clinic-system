import { useState, useCallback, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchPatients } from '../../firebase/db';

const SearchBar = ({ onSelect, placeholder = 'Search patients...' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (!term.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const patients = await searchPatients(term);
        setResults(patients);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const handleSelect = (patient) => {
    onSelect(patient);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full max-w-xl">
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
          placeholder={placeholder}
          className="w-full bg-venus-bg-tertiary border border-venus-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-venus-text-primary placeholder-venus-text-muted focus:border-venus-primary-500 focus:ring-1 focus:ring-venus-primary-500 transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-venus-primary-400 animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-venus-text-muted hover:text-venus-text-primary"
          >
            <X className="w-5 h-5" />
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
              className="w-full text-left px-4 py-3 hover:bg-venus-bg-tertiary border-b border-venus-border last:border-0 transition-colors"
            >
              <p className="text-sm font-medium text-venus-text-primary">
                {patient.firstName} {patient.lastName}
              </p>
              <p className="text-xs text-venus-text-muted mt-0.5">
                {patient.phone} • {patient.nrcNumber || 'No NRC'}
              </p>
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

export default SearchBar;