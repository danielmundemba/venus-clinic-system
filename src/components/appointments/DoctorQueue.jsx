import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  Play, 
  CheckCircle, 
  FileText, 
  AlertCircle,
  ChevronRight,
  Activity
} from 'lucide-react';
import { useAppointments } from '../../hooks/useAppointments';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from './StatusBadge';

const DoctorQueue = ({ 
  onStartConsultation, 
  onViewRecord,
  onViewAll,
  compact = false 
}) => {
  const { user } = useAuth();
  const { getTodaysAppointments, updateStatus } = useAppointments();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userId = user?.uid || user?.id;

  useEffect(() => {
    let mounted = true;

    const loadAppointments = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const todays = await getTodaysAppointments(userId);
        if (mounted) {
          setAppointments(todays);
        }
      } catch (err) {
        console.error('Error loading queue:', err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAppointments();

    // Refresh every 2 minutes
    const interval = setInterval(loadAppointments, 120000);
    return () => { 
      mounted = false; 
      clearInterval(interval); 
    };
  }, [userId, getTodaysAppointments]);

  const handleStartConsultation = async (appointmentId) => {
    setActionLoading(true);
    try {
      await updateStatus(appointmentId, 'in-progress');
      onStartConsultation?.(appointmentId);
      // Refresh list
      const todays = await getTodaysAppointments(userId);
      setAppointments(todays);
    } catch (err) {
      console.error('Error starting consultation:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (appointmentId) => {
    setActionLoading(true);
    try {
      await updateStatus(appointmentId, 'completed');
      const todays = await getTodaysAppointments(userId);
      setAppointments(todays);
    } catch (err) {
      console.error('Error completing appointment:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const calculateWaitTime = (appointment) => {
    if (!appointment.checkedInAt && !appointment.createdAt) return null;
    const checkTime = appointment.checkedInAt?.toDate 
      ? appointment.checkedInAt.toDate() 
      : appointment.createdAt?.toDate 
        ? appointment.createdAt.toDate() 
        : new Date(appointment.createdAt || appointment.date);
    const now = new Date();
    const diffMs = now - checkTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getActionButton = (appointment) => {
    switch (appointment.status) {
      case 'checked-in':
        return (
          <button
            onClick={() => handleStartConsultation(appointment.id)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-venus-primary-500 hover:bg-venus-primary-600 text-white text-xs font-medium rounded-lg transition-all"
          >
            <Play className="w-3 h-3" />
            Start
          </button>
        );
      case 'in-progress':
        return (
          <button
            onClick={() => handleComplete(appointment.id)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-venus-success hover:bg-venus-success/80 text-white text-xs font-medium rounded-lg transition-all"
          >
            <CheckCircle className="w-3 h-3" />
            Complete
          </button>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 text-xs text-venus-success">
            <CheckCircle className="w-3 h-3" />
            Done
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-venus-warning" />;
      case 'checked-in': return <User className="w-4 h-4 text-venus-primary-400" />;
      case 'in-progress': return <Activity className="w-4 h-4 text-venus-info animate-pulse" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-venus-success" />;
      default: return <Clock className="w-4 h-4 text-venus-text-muted" />;
    }
  };

  const activeAppointments = appointments.filter(a => 
    ['pending', 'checked-in', 'in-progress'].includes(a.status)
  );
  const completedToday = appointments.filter(a => a.status === 'completed').length;

  if (loading) {
    return (
      <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-venus-primary-400 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-6">
        <div className="flex items-center gap-2 text-venus-danger">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">Failed to load queue: {error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-3 text-xs text-venus-primary-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-venus-bg-secondary border border-venus-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-venus-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-venus-primary-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-venus-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-venus-text-primary">
                Today's Queue
              </h3>
              <p className="text-xs text-venus-text-muted">
                {activeAppointments.length} waiting • {completedToday} completed
              </p>
            </div>
          </div>
          {!compact && (
            <button 
              onClick={onViewAll}
              className="text-sm text-venus-primary-400 hover:text-venus-primary-300 flex items-center gap-1 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Queue List */}
      <div className="divide-y divide-venus-border/50">
        {appointments.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-10 h-10 text-venus-text-muted mx-auto mb-3" />
            <p className="text-sm text-venus-text-muted">No appointments for today</p>
            <p className="text-xs text-venus-text-muted/70 mt-1">
              Your schedule is clear
            </p>
          </div>
        ) : (
          appointments.map((appointment) => {
            const waitTime = calculateWaitTime(appointment);
            const isActive = ['checked-in', 'in-progress'].includes(appointment.status);

            return (
              <div 
                key={appointment.id}
                className={`
                  p-4 transition-all hover:bg-venus-bg-elevated
                  ${isActive ? 'bg-venus-bg-elevated/50' : ''}
                  ${appointment.status === 'in-progress' ? 'border-l-2 border-l-venus-info' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Queue Number / Status */}
                  <div className="flex-shrink-0">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${appointment.status === 'in-progress' 
                        ? 'bg-venus-info text-white' 
                        : 'bg-venus-bg-tertiary text-venus-text-muted'
                      }
                    `}>
                      {getStatusIcon(appointment.status)}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-venus-text-primary truncate">
                        {appointment.patientName || 'Unknown Patient'}
                      </span>
                      <StatusBadge status={appointment.status} size="sm" showDot={false} />
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-venus-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {appointment.time || 'N/A'}
                      </span>
                      {waitTime && appointment.status === 'checked-in' && (
                        <span className="text-xs text-venus-warning flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Waiting {waitTime}
                        </span>
                      )}
                      {appointment.type === 'walk-in' && (
                        <span className="text-xs text-venus-info bg-venus-info/10 px-1.5 py-0.5 rounded">
                          Walk-in
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onViewRecord?.(appointment.patientId, appointment.id)}
                      className="p-1.5 text-venus-text-muted hover:text-venus-primary-400 hover:bg-venus-primary-500/10 rounded-lg transition-all"
                      title="View patient record"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    {getActionButton(appointment)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compact Footer */}
      {compact && appointments.length > 0 && (
        <div className="p-3 border-t border-venus-border bg-venus-bg-tertiary">
          <button 
            onClick={onViewAll}
            className="w-full text-center text-sm text-venus-primary-400 hover:text-venus-primary-300 transition-colors"
          >
            View Full Schedule
          </button>
        </div>
      )}
    </div>
  );
};

export default DoctorQueue;