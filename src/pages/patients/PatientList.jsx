import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { formatDate } from '../../utils/formatters';
import PatientRegistration from './PatientRegistration';
import { useAuditLog } from '../../hooks/useAuditLog';
import { 
  Plus, 
  Eye, 
  Users, 
  Loader2, 
  Phone, 
  Calendar,
  Search,
  Mail,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  X,
  PartyPopper,
  UserCheck,
  Activity,
  RefreshCw,
  Shield,
  Stethoscope,
  Pill,
  HeartPulse
} from 'lucide-react';

const PatientList = () => {
  const navigate = useNavigate();
  const { logAction } = useAuditLog();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const patientsPerPage = 10;

  // Role config for staff badges — same as UserManagement
  const staffRoleConfig = {
    admin: { label: 'Admin', icon: Shield, color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
    doctor: { label: 'Doctor', icon: Stethoscope, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    receptionist: { label: 'Receptionist', icon: Phone, color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    pharmacist: { label: 'Pharmacist', icon: Pill, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    nurse: { label: 'Nurse', icon: HeartPulse, color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
  };

  // Fetch ALL isPatient=true (regular patients + staff who are also patients)
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('isPatient', '==', true),   // ← includes staff patients
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setPatients(patientData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching patients:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleToggleStatus = async (patientId, currentStatus) => {
    try {
      const userRef = doc(db, 'users', patientId);
      await updateDoc(userRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });
      await logAction('update', 'patient', patientId, { 
        field: 'isActive', 
        newValue: !currentStatus 
      });
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    const matchesSearch = 
      searchQuery === '' || 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && patient.isActive !== false) ||
      (statusFilter === 'inactive' && patient.isActive === false);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);
  const startIndex = (currentPage - 1) * patientsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + patientsPerPage);

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'P';
  };

  const getStats = () => {
    const activePatients = patients.filter(p => p.isActive !== false);
    const staffPatients = patients.filter(p => p.isStaff === true);
    const regularPatients = patients.filter(p => p.isStaff !== true);
    const thisMonth = patients.filter(p => {
      const created = p.createdAt instanceof Date ? p.createdAt : p.createdAt?.toDate?.();
      if (!created) return false;
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    });

    return [
      { 
        title: 'Total Patients', 
        value: patients.length.toLocaleString(), 
        icon: Users, 
        color: 'bg-violet-500/20 text-violet-400' 
      },
      { 
        title: 'Active', 
        value: activePatients.length.toLocaleString(), 
        icon: UserCheck, 
        color: 'bg-emerald-500/20 text-emerald-400' 
      },
      { 
        title: 'Staff Patients', 
        value: staffPatients.length.toLocaleString(), 
        icon: Shield, 
        color: 'bg-amber-500/20 text-amber-400' 
      },
      { 
        title: 'This Month', 
        value: thisMonth.length.toLocaleString(), 
        icon: Calendar, 
        color: 'bg-sky-500/20 text-sky-400' 
      },
    ];
  };

  const stats = getStats();

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card hover:bg-venus-bg-elevated transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-venus-text-muted mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-venus-text-primary">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  const handleRegistrationSuccess = (patient) => {
    setShowRegisterModal(false);
    setSuccessMessage(
      `${patient.firstName} ${patient.lastName} was registered successfully. ` +
      `They can now log in with their email and the default password (123456).`
    );
  };

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] sm:max-w-md flex items-start gap-3 p-4 bg-emerald-950 border border-emerald-500/40 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-2 bg-emerald-500/20 rounded-full shrink-0">
            <PartyPopper className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-300">Success!</p>
            <p className="text-sm text-emerald-400/90">{successMessage}</p>
          </div>
          <button 
            onClick={() => setSuccessMessage('')}
            className="p-1 hover:bg-emerald-500/20 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-emerald-300" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">Patients</h1>
          <p className="text-venus-text-muted mt-1">
            All patient records — including staff members who are also registered as patients.
          </p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Register Patient
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Filters Bar */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-venus-text-muted" />
            <div className="flex gap-1.5">
              <button
                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  statusFilter === 'all' 
                    ? 'bg-violet-500 text-white shadow-sm' 
                    : 'bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  statusFilter === 'active' 
                    ? 'bg-emerald-500 text-white shadow-sm' 
                    : 'bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => { setStatusFilter('inactive'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  statusFilter === 'inactive' 
                    ? 'bg-red-500 text-white shadow-sm' 
                    : 'bg-venus-bg-tertiary text-venus-text-muted hover:bg-venus-bg-elevated hover:text-venus-text-primary'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-venus-text-muted hover:text-venus-text-primary" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-venus-text-primary">
              All Patients
            </h2>
            <span className="px-2.5 py-1 bg-venus-bg-tertiary rounded-full text-xs font-medium text-venus-text-muted">
              {filteredPatients.length} patients
            </span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-venus-text-muted" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-venus-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-venus-text-muted" />
            </div>
            <p className="text-venus-text-primary font-medium">No patients found</p>
            <p className="text-sm text-venus-text-muted mt-1 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters or search to see more results' 
                : 'Patients will appear here once they are registered'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-venus-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Patient</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Role</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Contact</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Registered</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-venus-text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-venus-border/50">
                  {paginatedPatients.map((patient) => {
                    const isStaffPatient = patient.isStaff === true;
                    const roleCfg = isStaffPatient ? staffRoleConfig[patient.role] : null;
                    const RoleIcon = roleCfg?.icon;

                    return (
                      <tr 
                        key={patient.id} 
                        className="hover:bg-venus-bg-elevated transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold">
                              {getInitials(patient.firstName, patient.lastName)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-venus-text-primary">
                                  {patient.firstName} {patient.lastName}
                                </p>
                                {isStaffPatient && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-500/20">
                                    Staff
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-venus-text-muted">
                                {patient.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isStaffPatient && roleCfg ? (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleCfg.color}`}>
                              <RoleIcon className="w-3.5 h-3.5" />
                              {roleCfg.label}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-slate-500/15 text-slate-400 border-slate-500/30">
                              <Users className="w-3.5 h-3.5" />
                              Patient
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm text-venus-text-secondary">
                              <Phone className="w-3.5 h-3.5 text-venus-text-muted" />
                              {patient.phone || 'N/A'}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-venus-text-muted">
                              <Mail className="w-3.5 h-3.5" />
                              {patient.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleStatus(patient.id, patient.isActive)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer hover:opacity-80 ${
                              patient.isActive !== false 
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }`}
                            title="Click to toggle status"
                          >
                            {patient.isActive !== false ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-sm text-venus-text-muted">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(patient.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors text-venus-text-muted hover:text-venus-text-primary"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-venus-border">
                <p className="text-sm text-venus-text-muted">
                  Showing <span className="font-medium text-venus-text-primary">{startIndex + 1}</span> to <span className="font-medium text-venus-text-primary">{Math.min(startIndex + patientsPerPage, filteredPatients.length)}</span> of <span className="font-medium text-venus-text-primary">{filteredPatients.length}</span> patients
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-venus-border hover:bg-venus-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                          currentPage === page 
                            ? 'bg-violet-500 text-white shadow-sm' 
                            : 'border border-venus-border hover:bg-venus-bg-elevated text-venus-text-primary'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-venus-border hover:bg-venus-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <PatientRegistration 
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
};

export default PatientList;