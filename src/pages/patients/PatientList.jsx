import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../../hooks/useFirestore';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import PatientRegistration from './PatientRegistration';
import { formatDate, calculateAge } from '../../utils/formatters';
import { 
  Plus, 
  Eye, 
  Users, 
  Loader2, 
  Phone, 
  MapPin, 
  Calendar,
  Search
} from 'lucide-react';

const PatientList = () => {
  const navigate = useNavigate();
  const { getAll, loading } = useFirestore('patients');
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await getAll([{ type: 'orderBy', field: 'createdAt', direction: 'desc' }]);
      setPatients(data);
      setFilteredPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  };

  const handleSearchSelect = (patient) => {
    navigate(`/patients/${patient.id}`);
  };

  const handleRegistrationSuccess = () => {
    setShowRegisterModal(false);
    loadPatients();
  };

  const stats = [
    { label: 'Total Patients', value: patients.length, icon: Users, color: 'text-venus-primary-400' },
    { label: 'This Month', value: patients.filter(p => {
      const created = p.createdAt?.toDate?.() || new Date(p.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length, icon: Calendar, color: 'text-venus-success' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">Patients</h1>
          <p className="text-venus-text-muted mt-1">Manage patient records and registrations</p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Register Patient
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-venus-text-primary">{stat.value}</p>
                <p className="text-xs text-venus-text-muted">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setSearchMode(!searchMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              searchMode 
                ? 'bg-venus-primary-500/20 text-venus-primary-400 border border-venus-primary-500/30' 
                : 'bg-venus-bg-tertiary text-venus-text-secondary border border-venus-border'
            }`}
          >
            <Search className="w-4 h-4" />
            {searchMode ? 'Hide Search' : 'Search Patients'}
          </button>
        </div>

        {searchMode && (
          <SearchBar 
            onSelect={handleSearchSelect}
            placeholder="Search by name, phone, or NRC..."
          />
        )}
      </div>

      {/* Patient Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-venus-bg-tertiary border-b border-venus-border">
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Patient</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Contact</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Age/Gender</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">NRC</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Registered</th>
                <th className="text-right text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-venus-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-venus-primary-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-venus-text-muted">
                    No patients found
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr 
                    key={patient.id} 
                    className="hover:bg-venus-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-venus-primary-400">
                            {patient.firstName[0]}{patient.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-venus-text-primary">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-xs text-venus-text-muted">ID: {patient.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-venus-text-secondary">
                          <Phone className="w-3.5 h-3.5 text-venus-text-muted" />
                          {patient.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-venus-text-muted">
                          <MapPin className="w-3.5 h-3.5" />
                          {patient.address.slice(0, 30)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-venus-text-secondary">
                        {calculateAge(patient.DOB)} yrs • {patient.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-venus-text-secondary font-mono">
                        {patient.nrcNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-venus-text-muted">
                        {formatDate(patient.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="p-2 text-venus-text-muted hover:text-venus-primary-400 hover:bg-venus-primary-500/10 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register New Patient"
        size="lg"
      >
        <PatientRegistration onSuccess={handleRegistrationSuccess} />
      </Modal>
    </div>
  );
};

export default PatientList;