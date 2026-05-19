import { useState, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { calculateAge } from '../../utils/formatters';
import { Users, Loader2, AlertCircle, Search } from 'lucide-react';

const PatientSelector = ({ onSelect, onClose }) => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { getAll } = useFirestore('patients');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await getAll([
        { type: 'orderBy', field: 'createdAt', direction: 'desc' }
      ]);
      setPatients(data);
      setFilteredPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    const filtered = patients.filter(p => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      const nrc = (p.nrcNumber || '').toLowerCase();
      const searchLower = term.toLowerCase();
      
      return fullName.includes(searchLower) || 
             phone.includes(searchLower) || 
             nrc.includes(searchLower);
    });
    setFilteredPatients(filtered);
  };

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-venus-text-muted" />
        <input
          type="text"
          placeholder="Search by name, phone, or NRC..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="input-field pl-10"
          autoFocus
        />
      </div>

      {/* Patient List */}
      <div className="border border-venus-border rounded-lg overflow-hidden bg-venus-bg-secondary max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-venus-primary-400 animate-spin mx-auto" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-8 text-center text-venus-text-muted">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{searchTerm ? 'No patients found' : 'No patients available'}</p>
          </div>
        ) : (
          filteredPatients.map(patient => (
            <button
              key={patient.id}
              onClick={() => onSelect(patient)}
              className="w-full p-4 border-b border-venus-border last:border-b-0 hover:bg-venus-bg-tertiary transition-colors text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-venus-text-primary">
                    {patient.firstName} {patient.lastName}
                  </h4>
                  <div className="flex gap-4 mt-2 text-sm text-venus-text-muted">
                    <span>ID: {patient.id}</span>
                    <span>Age: {calculateAge(patient.DOB)}</span>
                    <span className="capitalize">{patient.gender}</span>
                  </div>
                  {patient.nrcNumber && (
                    <p className="text-sm text-venus-text-muted mt-1">NRC: {patient.nrcNumber}</p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <button
        onClick={onClose}
        className="w-full py-2 text-venus-text-muted hover:text-venus-text-primary transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

export default PatientSelector;
