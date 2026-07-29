import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPatientMedicalRecords } from '../../firebase/db';
import { formatDate } from '../../utils/formatters';
import {
  ClipboardList,
  Receipt,
  CalendarClock,
  Wallet,
  Loader2,
  AlertCircle,
  ChevronRight,
  Stethoscope,
} from 'lucide-react';

const statusLabels = {
  reception: 'Checked In',
  nurse: 'With Nurse',
  doctor: 'With Doctor',
  pharmacy: 'At Pharmacy',
  billing: 'Awaiting Billing',
  completed: 'Completed',
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-5">
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

// This component is deliberately reused in two places:
//  - as the whole page for a patient-only account
//  - embedded under /my-health for staff, who are also patients here
// so both audiences see the exact same "my own health" view.
const MyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.uid) loadRecords();
  }, [user?.uid]);

  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      // Sorted newest first (by createdAt), same shape as a single record
      // from getMedicalRecord(patientId, recordId).
      const data = await getPatientMedicalRecords(user.uid);
      setRecords(data || []);
    } catch (err) {
      console.error('Failed to load your records:', err);
      setError('Could not load your health records right now.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-venus-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-venus-danger" />
        <p className="text-venus-danger">{error}</p>
      </div>
    );
  }

  const latest = records[0];
  const activeRecord = records.find(r => r.status && r.status !== 'completed');
  const outstandingBalance = records.reduce((sum, r) => {
    if (r.billing && !r.billing.paid) return sum + (r.billing.totalAmount || 0);
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Hi {user?.displayName?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-venus-text-muted mt-1">Here's a look at your health record with us</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Visits"
          value={records.length}
          icon={ClipboardList}
          color="bg-venus-primary-500/20 text-venus-primary-400"
        />
        <StatCard
          title="Last Visit"
          value={latest ? formatDate(latest.visitDate) : '—'}
          icon={CalendarClock}
          color="bg-venus-info/20 text-venus-info"
        />
        <StatCard
          title="Current Status"
          value={activeRecord ? (statusLabels[activeRecord.status] || activeRecord.status) : 'No active visit'}
          icon={Stethoscope}
          color="bg-venus-warning/20 text-venus-warning"
        />
        <StatCard
          title="Outstanding Balance"
          value={`K${outstandingBalance}`}
          icon={Wallet}
          color={outstandingBalance > 0 ? 'bg-venus-danger/20 text-venus-danger' : 'bg-venus-success/20 text-venus-success'}
        />
      </div>

      <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-venus-text-primary">Recent Visits</h2>
          <button
            onClick={() => navigate('/my-records')}
            className="text-sm text-venus-primary-400 hover:text-venus-primary-300 flex items-center gap-1 transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {records.length === 0 ? (
          <p className="text-venus-text-muted text-sm italic">You don't have any visits on record yet.</p>
        ) : (
          <div className="space-y-3">
            {records.slice(0, 3).map((record) => (
              <button
                key={record.id}
                onClick={() => navigate('/my-records')}
                className="w-full flex items-center gap-4 p-3 bg-venus-bg-tertiary hover:bg-venus-bg-elevated rounded-lg transition-all duration-200 text-left"
              >
                <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-venus-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-venus-text-primary">
                    {record.doctor?.diagnosis ? record.doctor.diagnosis : 'Visit in progress'}
                  </p>
                  <p className="text-xs text-venus-text-muted">
                    {formatDate(record.visitDate)} • {statusLabels[record.status] || record.status}
                  </p>
                </div>
                {record.billing && !record.billing.paid && (
                  <span className="flex items-center gap-1 text-xs text-venus-danger">
                    <Receipt className="w-3.5 h-3.5" />
                    Unpaid
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-venus-text-muted" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDashboard;