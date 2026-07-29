import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../hooks/useAppointments';
import StatusBadge from '../../components/appointments/StatusBadge';
import { Calendar, Clock, Stethoscope, AlertCircle, Loader2 } from 'lucide-react';

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
];

const MyAppointments = () => {
  const { user } = useAuth();
  const { appointments, loading, error, getAppointments } = useAppointments();
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    if (user?.uid) getAppointments({ patientId: user.uid });
  }, [user?.uid, getAppointments]);

  const filtered = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(a => {
        const d = a.date instanceof Date ? a.date : new Date(a.date);
        if (filter === 'upcoming') return d >= now && a.status !== 'cancelled' && a.status !== 'completed';
        if (filter === 'past') return d < now || a.status === 'completed';
        return true;
      })
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        return filter === 'past' ? db - da : da - db;
      });
  }, [appointments, filter]);

  if (loading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-venus-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">My Appointments</h1>
        <p className="text-venus-text-muted mt-1">Everything scheduled with us</p>
      </div>

      {error && (
        <div className="bg-venus-danger/5 border border-venus-danger/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-venus-danger flex-shrink-0" />
          <p className="text-sm text-venus-danger">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-venus-primary-500 text-white'
                : 'bg-venus-bg-tertiary text-venus-text-secondary hover:bg-venus-primary-500/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-venus-bg-secondary border border-venus-border rounded-xl text-center py-12">
          <Calendar className="w-10 h-10 text-venus-text-muted mx-auto mb-3" />
          <p className="text-venus-text-muted text-sm">
            {filter === 'upcoming' ? "You don't have any upcoming appointments." : 'Nothing here yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const d = appt.date instanceof Date ? appt.date : new Date(appt.date);
            return (
              <div
                key={appt.id}
                className="bg-venus-bg-secondary border border-venus-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="sm:w-32 flex-shrink-0">
                  <p className="text-sm font-semibold text-venus-text-primary">
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-venus-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {appt.time}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-venus-text-primary flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-venus-text-muted" />
                    Dr. {appt.doctorName || 'Unassigned'}
                  </p>
                  {appt.notes && <p className="text-xs text-venus-text-muted mt-1">{appt.notes}</p>}
                  {appt.cancellationReason && (
                    <p className="text-xs text-venus-danger mt-1">Cancelled: {appt.cancellationReason}</p>
                  )}
                </div>
                <StatusBadge status={appt.status} size="sm" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAppointments;