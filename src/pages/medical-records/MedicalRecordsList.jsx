import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, collectionGroup, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import { 
  ClipboardList, 
  Eye, 
  Loader2, 
  User, 
  Calendar,
  Clock,
  Stethoscope,
  Pill,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Filter,
  Plus
} from 'lucide-react';

const statusConfig = {
  reception: { label: 'Reception', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: ClipboardList },
  nurse: { label: 'Nurse/Vitals', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Stethoscope },
  doctor: { label: 'Doctor', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: Stethoscope },
  pharmacy: { label: 'Pharmacy', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: Pill },
  billing: { label: 'Billing', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: CreditCard },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 },
};

const MedicalRecordsList = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [indexUrl, setIndexUrl] = useState(null);

  useEffect(() => {
    loadRecords();
  }, [statusFilter]);

  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    setIndexUrl(null);

    try {
      let recordsQuery;

      if (statusFilter === 'all') {
        recordsQuery = query(
          collectionGroup(db, 'MedicalRecords'),
          where('status', 'in', ['reception', 'nurse', 'doctor', 'pharmacy', 'billing']),
          orderBy('createdAt', 'desc')
        );
      } else {
        recordsQuery = query(
          collectionGroup(db, 'MedicalRecords'),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(recordsQuery);
      const recordsData = snapshot.docs.map(doc => {
        const pathParts = doc.ref.path.split('/');
        return { 
          id: doc.id, 
          patientId: pathParts[1],
          ...doc.data() 
        };
      });

      // Fetch patient names
      const patientIds = [...new Set(recordsData.map(r => r.patientId))];
      const patientMap = {};

      await Promise.all(patientIds.map(async (pid) => {
        const patientDoc = await getDoc(doc(db, 'users', pid));
        if (patientDoc.exists()) {
          const data = patientDoc.data();
          patientMap[pid] = {
            name: `${data.firstName} ${data.lastName}`,
            phone: data.phone,
          };
        }
      }));

      setRecords(recordsData.map(r => ({
        ...r,
        patientName: patientMap[r.patientId]?.name || 'Unknown',
        patientPhone: patientMap[r.patientId]?.phone || '',
      })));
    } catch (error) {
      console.error('Failed to load medical records:', error);

      if (error.message && error.message.includes('index')) {
        setError('Firestore index required for collection group query.');
        setIndexUrl('https://console.firebase.google.com/project/venus-clinic-system/firestore/indexes');
      } else {
        setError(`Failed to load records: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const canCreateVisit = () => ['admin', 'receptionist'].includes(userRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">Medical Records</h1>
          <p className="text-venus-text-muted mt-1">Manage patient visits and workflow</p>
        </div>
        {canCreateVisit() && (
          <button
            onClick={() => navigate('/medical-records/create')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Visit
          </button>
        )}
      </div>

      {error && (
        <div className="card bg-venus-danger/5 border-venus-danger/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-venus-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-venus-danger font-medium">{error}</p>
              {indexUrl && (
                <a href={indexUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-venus-primary-400 underline mt-1 inline-block">
                  Create required Firestore index →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-venus-text-muted" />
          <span className="text-sm font-medium text-venus-text-secondary">Filter by Status</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all' ? 'bg-venus-primary-500 text-white' : 'bg-venus-bg-tertiary text-venus-text-secondary hover:bg-venus-primary-500/10'
            }`}>
            All Active
          </button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === key ? 'bg-venus-primary-500 text-white' : 'bg-venus-bg-tertiary text-venus-text-secondary hover:bg-venus-primary-500/10'
              }`}>
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-venus-bg-tertiary border-b border-venus-border">
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Patient</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Visit</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Checked In By</th>
                <th className="text-right text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-venus-border">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 text-venus-primary-400 animate-spin mx-auto" />
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-venus-text-muted">
                  No active medical records found
                </td></tr>
              ) : (
                records.map((record) => {
                  const statusInfo = statusConfig[record.status] || statusConfig.reception;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={record.id} className="hover:bg-venus-bg-tertiary/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-venus-primary-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-venus-text-primary">{record.patientName}</p>
                            <p className="text-xs text-venus-text-muted">{record.patientPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-venus-text-secondary">
                            <Calendar className="w-3.5 h-3.5 text-venus-text-muted" />
                            {record.visitDate}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-venus-text-muted">
                            <Clock className="w-3.5 h-3.5" />
                            {record.visitTime}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border ${statusInfo.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-venus-text-secondary">{record.reception?.checkedInBy || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => navigate(`/medical-records/${record.patientId}/${record.id}`)}
                          className="p-2 text-venus-text-muted hover:text-venus-primary-400 hover:bg-venus-primary-500/10 rounded-lg transition-colors"
                          title="View Record">
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordsList;