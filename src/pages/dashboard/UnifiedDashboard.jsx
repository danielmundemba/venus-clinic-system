import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  CalendarCheck, 
  FileText, 
  TrendingUp,
  Clock,
  AlertCircle,
  Activity,
  ChevronRight
} from 'lucide-react';
import DoctorQueue from '../../components/appointments/DoctorQueue';

// Widget components
const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-5 hover:bg-venus-bg-elevated transition-all duration-200">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-venus-text-muted mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-venus-text-primary">{value}</h3>
        {trend !== undefined && (
          <p className={`text-sm mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-venus-success' : 'text-venus-danger'}`}>
            <TrendingUp className="w-4 h-4" />
            {trend > 0 ? '+' : ''}{trend}% from last week
          </p>
        )}
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
  const { user, userRole, isAdmin, isDoctor, isReceptionist, isNurse } = useAuth();

  // Role-specific stats
  const getStats = () => {
    if (isAdmin) return [
      { title: 'Total Patients', value: '1,234', icon: Users, trend: 12, color: 'bg-venus-primary-500/20 text-venus-primary-400' },
      { title: "Today's Appointments", value: '28', icon: CalendarCheck, trend: 5, color: 'bg-venus-success/20 text-venus-success' },
      { title: 'Pending Records', value: '15', icon: FileText, trend: -3, color: 'bg-venus-warning/20 text-venus-warning' },
      { title: 'Revenue Today', value: 'K 12,450', icon: TrendingUp, trend: 8, color: 'bg-venus-info/20 text-venus-info' },
    ];

    if (isDoctor) return [
      { title: 'My Patients Today', value: '12', icon: Users, color: 'bg-venus-primary-500/20 text-venus-primary-400' },
      { title: 'Pending Diagnoses', value: '5', icon: FileText, color: 'bg-venus-warning/20 text-venus-warning' },
      { title: 'Completed Today', value: '7', icon: CalendarCheck, color: 'bg-venus-success/20 text-venus-success' },
      { title: 'Avg. Consult Time', value: '18 min', icon: Clock, color: 'bg-venus-info/20 text-venus-info' },
    ];

    if (isReceptionist) return [
      { title: 'Checked In', value: '8', icon: Users, color: 'bg-venus-success/20 text-venus-success' },
      { title: 'Waiting', value: '4', icon: Clock, color: 'bg-venus-warning/20 text-venus-warning' },
      { title: "Today's Total", value: '28', icon: CalendarCheck, color: 'bg-venus-primary-500/20 text-venus-primary-400' },
      { title: 'Walk-ins', value: '3', icon: AlertCircle, color: 'bg-venus-info/20 text-venus-info' },
    ];

    // Nurse
    return [
      { title: 'Vitals Pending', value: '6', icon: Activity, color: 'bg-venus-warning/20 text-venus-warning' },
      { title: 'Assisting', value: '2', icon: Users, color: 'bg-venus-primary-500/20 text-venus-primary-400' },
      { title: 'Completed', value: '14', icon: CalendarCheck, color: 'bg-venus-success/20 text-venus-success' },
    ];
  };

  const getQuickActions = () => {
    const actions = [];

    if (isAdmin || isReceptionist) {
      actions.push(
        { icon: Users, label: 'Register New Patient', onClick: () => window.location.href = '/patients/register' },
        { icon: CalendarCheck, label: 'Schedule Appointment', onClick: () => window.location.href = '/appointments' },
      );
    }

    if (isDoctor || isNurse) {
      actions.push(
        { icon: FileText, label: 'Create Medical Record', onClick: () => window.location.href = '/patients' },
        { icon: Users, label: 'View Patient Queue', onClick: () => window.location.href = '/appointments' },
      );
    }

    if (isAdmin || isReceptionist) {
      actions.push(
        { icon: TrendingUp, label: 'Create Invoice', onClick: () => {} },
      );
    }

    return actions;
  };

  const stats = getStats();
  const quickActions = getQuickActions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.displayName?.split(' ')[0] || 'Doctor'}
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
                window.location.href = `/appointments?action=consult& id=${appointmentId}`;
              }}
              onViewRecord={(patientId) => {
                window.location.href = `/patients/${patientId}`;
              }}
              onViewAll={() => {
                window.location.href = '/appointments';
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

      {/* Admin/Receptionist Quick Actions */}
      {(isAdmin || isReceptionist) && (
        <div>
          <h2 className="text-lg font-semibold text-venus-text-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity (placeholder for now) */}
      <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-venus-text-primary">Recent Activity</h2>
          <button className="text-sm text-venus-primary-400 hover:text-venus-primary-300 flex items-center gap-1 transition-colors">
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-venus-bg-tertiary rounded-lg">
              <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-venus-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-venus-text-primary">New patient registered</p>
                <p className="text-xs text-venus-text-muted">John Doe • 2 minutes ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard;