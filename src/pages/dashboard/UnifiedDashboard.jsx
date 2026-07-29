import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { getActiveMedicalRecords, getRecentlyCompletedRecords } from '../../firebase/db';
import { formatDate } from '../../utils/formatters';
import DoctorQueue from '../../components/appointments/DoctorQueue';
import PageSkeleton from '../../components/common/PageSkeleton';
import {
  Users,
  CalendarCheck,
  FileText,
  TrendingUp,
  Activity,
  ChevronRight,
  Stethoscope,
  Pill,
  ClipboardList,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

const todayStr = () => new Date().toISOString().split('T')[0];
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-5 hover:bg-venus-bg-elevated transition-all duration-200">
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

const QuickAction = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-4 bg-venus-bg-tertiary hover:bg-venus-bg-elevated border border-venus-border hover:border-venus-border-hover rounded-lg transition-all duration-200 w-full text-left"
  >
    <Icon className="w-5 h-5 text-venus-primary-400" />
    <span className="text-sm font-medium text-venus-text-primary">{label}</span>
  </button>
);

const UnifiedDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, isAdmin, isDoctor, isReceptionist, isNurse } = useAuth();
  const isPharmacist = userRole === 'pharmacist';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activeRecords, completedToday] = await Promise.all([
        getActiveMedicalRecords(),
        getRecentlyCompletedRecords(startOfToday()),
      ]);

      const countByStatus = (status) => activeRecords.filter(r => r.status === status).length;
      const revenueToday = completedToday.reduce((sum, r) => sum + (r.billing?.totalAmount || 0), 0);

      let patientsCount = null;
      let appointmentsToday = null;

      // Only the roles that actually see these numbers pay the extra query cost.
      if (isAdmin || isReceptionist) {
        const patientsSnap = await getDocs(query(collection(db, 'users'), where('isPatient', '==', true)));
        patientsCount = patientsSnap.size;

        try {
          const apptSnap = await getDocs(query(collection(db, 'appointments'), where('date', '==', todayStr())));
          appointmentsToday = apptSnap.size;
        } catch (e) {
          // Appointments collection/field naming may not match — degrade
          // gracefully rather than breaking the whole dashboard over one stat.
          console.warn("Could not load today's appointments:", e);
        }
      }

      setMetrics({
        patientsCount,
        appointmentsToday,
        activeRecordsCount: activeRecords.length,
        completedTodayCount: completedToday.length,
        revenueToday,
        waitingReception: countByStatus('reception'),
        waitingNurse: countByStatus('nurse'),
        waitingDoctor: countByStatus('doctor'),
        waitingPharmacy: countByStatus('pharmacy'),
        waitingBilling: countByStatus('billing'),
      });

      // Recent activity: last few visits completed today, with patient names
      // resolved the same way MedicalRecordsList does it.
      const recent = completedToday.slice(0, 5);
      const patientIds = [...new Set(recent.map(r => r.patientId))];
      const nameMap = {};
      await Promise.all(patientIds.map(async (pid) => {
        const pDoc = await getDoc(doc(db, 'users', pid));
        if (pDoc.exists()) {
          const d = pDoc.data();
          nameMap[pid] = `${d.firstName || ''} ${d.lastName || ''}`.trim();
        }
      }));
      setRecentActivity(recent.map(r => ({ ...r, patientName: nameMap[r.patientId] || 'Unknown patient' })));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Could not load dashboard data right now.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isReceptionist]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const getStats = () => {
    if (isAdmin) return [
      { title: 'Total Patients', value: metrics.patientsCount ?? '—', icon: Users, color: 'bg-venus-primary-500/20 text-venus-primary-400' },
      { title: "Today's Appointments", value: metrics.appointmentsToday ?? '—', icon: CalendarCheck, color: 'bg-venus-success/20 text-venus-success' },
      { title: 'Active Visits', value: metrics.activeRecordsCount ?? 0, icon: FileText, color: 'bg-venus-warning/20 text-venus-warning' },
      { title: 'Revenue Today', value: `K${metrics.revenueToday ?? 0}`, icon: TrendingUp, color: 'bg-venus-info/20 text-venus-info' },
    ];

    if (isDoctor) return [
      { title: 'Waiting for Doctor', value: metrics.waitingDoctor ?? 0, icon: Stethoscope, color: 'bg-purple-500/20 text-purple-400' },
      { title: 'At Pharmacy', value: metrics.waitingPharmacy ?? 0, icon: Pill, color: 'bg-green-500/20 text-green-400' },
      { title: 'Awaiting Billing', value: metrics.waitingBilling ?? 0, icon: CreditCard, color: 'bg-orange-500/20 text-orange-400' },
      { title: 'Completed Today', value: metrics.completedTodayCount ?? 0, icon: CalendarCheck, color: 'bg-venus-success/20 text-venus-success' },
    ];

    if (isReceptionist) return [
      { title: 'Checked In', value: metrics.waitingReception ?? 0, icon: Users, color: 'bg-venus-success/20 text-venus-success' },
      { title: 'Active Visits', value: metrics.activeRecordsCount ?? 0, icon: ClipboardList, color: 'bg-venus-warning/20 text-venus-warning' },
      { title: "Today's Appointments", value: metrics.appointmentsToday ?? '—', icon: CalendarCheck, color: 'bg-venus-primary-500/20 text-venus-primary-400' },
      { title: 'Completed Today', value: metrics.completedTodayCount ?? 0, icon: CheckCircle2, color: 'bg-venus-info/20 text-venus-info' },
    ];

    if (isNurse) return [
      { title: 'Vitals Pending', value: metrics.waitingNurse ?? 0, icon: Activity, color: 'bg-venus-warning/20 text-venus-warning' },
      { title: 'With Doctor', value: metrics.waitingDoctor ?? 0, icon: Stethoscope, color: 'bg-purple-500/20 text-purple-400' },
      { title: 'Completed Today', value: metrics.completedTodayCount ?? 0, icon: CalendarCheck, color: 'bg-venus-success/20 text-venus-success' },
    ];

    if (isPharmacist) return [
      { title: 'Awaiting Dispensing', value: metrics.waitingPharmacy ?? 0, icon: Pill, color: 'bg-green-500/20 text-green-400' },
      { title: 'Awaiting Billing', value: metrics.waitingBilling ?? 0, icon: CreditCard, color: 'bg-orange-500/20 text-orange-400' },
      { title: 'Completed Today', value: metrics.completedTodayCount ?? 0, icon: CalendarCheck, color: 'bg-venus-success/20 text-venus-success' },
    ];

    return [];
  };

  const getQuickActions = () => {
    const actions = [];

    if (isAdmin || isReceptionist) {
      actions.push(
        { icon: UserPlus, label: 'Register New Patient', onClick: () => navigate('/patients/register') },
        { icon: CalendarCheck, label: 'Schedule Appointment', onClick: () => navigate('/appointments') },
        { icon: ClipboardList, label: 'Start New Visit', onClick: () => navigate('/medical-records/create') },
      );
    }

    if (isDoctor || isNurse) {
      actions.push(
        { icon: FileText, label: 'View Medical Records', onClick: () => navigate('/medical-records') },
        { icon: Users, label: 'View Patient Queue', onClick: () => navigate('/appointments') },
      );
    }

    if (isPharmacist) {
      actions.push(
        { icon: Pill, label: 'View Pharmacy Queue', onClick: () => navigate('/medical-records') },
      );
    }

    return actions;
  };

  if (loading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <AlertCircle className="w-10 h-10 text-venus-danger" />
        <p className="text-venus-danger">{error}</p>
        <button onClick={loadDashboard} className="btn-secondary">Retry</button>
      </div>
    );
  }

  const stats = getStats();
  const quickActions = getQuickActions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.displayName?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-venus-text-muted mt-1">
          Here's what's happening at the clinic today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Doctor/Nurse Queue Widget */}
      {(isDoctor || isNurse) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DoctorQueue
              compact={false}
              onStartConsultation={(appointmentId) => {
                navigate(`/appointments?action=consult&id=${appointmentId}`);
              }}
              onViewRecord={(patientId) => {
                navigate(`/patients/${patientId}`);
              }}
              onViewAll={() => {
                navigate('/appointments');
              }}
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-venus-text-primary">Quick Actions</h2>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <QuickAction key={index} {...action} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Admin/Receptionist/Pharmacist Quick Actions */}
      {(isAdmin || isReceptionist || isPharmacist) && (
        <div>
          <h2 className="text-lg font-semibold text-venus-text-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity — real completions from today */}
      <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-venus-text-primary">Recent Activity</h2>
          <button
            onClick={() => navigate('/medical-records')}
            className="text-sm text-venus-primary-400 hover:text-venus-primary-300 flex items-center gap-1 transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-venus-text-muted text-sm italic">No visits completed yet today.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((record) => (
              <div key={record.id} className="flex items-center gap-4 p-3 bg-venus-bg-tertiary rounded-lg">
                <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-venus-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-venus-text-primary">
                    {record.doctor?.diagnosis || 'Visit completed'} — {record.patientName}
                  </p>
                  <p className="text-xs text-venus-text-muted">
                    {formatDate(record.visitDate)} • K{record.billing?.totalAmount ?? 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedDashboard;