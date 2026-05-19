import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  List, 
  Plus,
  RefreshCw,
  X,
  ChevronRight,
  Clock,
  User,
  Stethoscope,
  FileText,
  AlertCircle
} from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../hooks/useAppointments';
import { useAuditLog } from '../../hooks/useAuditLog';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';
import AppointmentList from '../../components/appointments/AppointmentList';
import CreateAppointmentModal from '../../components/appointments/CreateAppointmentModal';
import StatusBadge from '../../components/appointments/StatusBadge';

// Inline Modal fallback in case your Modal component has different props
const ModalFallback = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-venus-bg-primary border border-venus-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-venus-border">
          <h2 className="text-xl font-bold text-venus-text-primary">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-venus-bg-elevated text-venus-text-muted hover:text-venus-text-primary transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const AppointmentsPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isReceptionist, isDoctor } = useAuth();
  const { 
    appointments, 
    loading, 
    getAppointments, 
    createAppointment, 
    updateStatus,
    deleteAppointment
  } = useAppointments();
  const { logAction } = useAuditLog();

  const [viewMode, setViewMode] = useState('calendar');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [pageError, setPageError] = useState(null);

  // Load doctors once on mount
  useEffect(() => {
    let mounted = true;
    const loadDoctors = async () => {
      try {
        const q = query(collection(db, 'doctors'), orderBy('lastName'));
        const snapshot = await getDocs(q);
        if (mounted) {
          setDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (err) {
        console.error('Error loading doctors:', err);
        if (mounted) setPageError('Failed to load doctors: ' + err.message);
      }
    };
    loadDoctors();
    return () => { mounted = false; };
  }, []);

  // Load appointments when filters change
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        await getAppointments(filters);
      } catch (err) {
        console.error('Error loading appointments:', err);
        if (mounted) setPageError('Failed to load appointments: ' + err.message);
      }
    };
    load();
    return () => { mounted = false; };
  }, [filters, getAppointments]);

  const getDoctorName = useCallback((doctorId) => {
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor ? `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Unassigned';
  }, [doctors]);

  // Enrich appointments with names
  const enrichedAppointments = appointments.map(app => ({
    ...app,
    doctorName: getDoctorName(app.doctorId),
    patientName: app.patientName || 'Unknown Patient'
  }));

  const handleCreateAppointment = async (formData) => {
    setActionLoading(true);
    setPageError(null);
    try {
      const doctor = doctors.find(d => d.id === formData.doctorId);
      const result = await createAppointment({
        ...formData,
        doctorName: doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Unassigned'
      });

      await logAction({
        action: 'CREATE_APPOINTMENT',
        targetId: result.id,
        details: `Created ${formData.type} appointment for patient ${formData.patientName}`
      });

      setShowCreateModal(false);
      await getAppointments(filters);
    } catch (err) {
      console.error('Error creating appointment:', err);
      setPageError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedAppointment) return;
    setActionLoading(true);
    try {
      await updateStatus(selectedAppointment.id, newStatus, cancelReason);

      await logAction({
        action: 'UPDATE_APPOINTMENT_STATUS',
        targetId: selectedAppointment.id,
        details: `Status changed to ${newStatus}`
      });

      setShowDetailModal(false);
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedAppointment(null);
      await getAppointments(filters);
    } catch (err) {
      console.error('Error updating status:', err);
      setPageError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;

    setActionLoading(true);
    try {
      await deleteAppointment(selectedAppointment.id);

      await logAction({
        action: 'DELETE_APPOINTMENT',
        targetId: selectedAppointment.id,
        details: `Deleted appointment for ${selectedAppointment.patientName}`
      });

      setShowDetailModal(false);
      setSelectedAppointment(null);
      await getAppointments(filters);
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setPageError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  };

  const handleDateSelect = (date) => {
    setShowCreateModal(true);
  };

  const getAvailableActions = (status) => {
    const actions = [];

    if (isReceptionist || isAdmin) {
      if (status === 'pending') {
        actions.push({ label: 'Check In', status: 'checked-in', color: 'btn-primary' });
      }
    }

    if (isDoctor) {
      if (status === 'checked-in') {
        actions.push({ label: 'Start Consultation', status: 'in-progress', color: 'btn-primary' });
      }
      if (status === 'in-progress') {
        actions.push({ label: 'Complete', status: 'completed', color: 'btn-primary' });
      }
    }

    if ((isReceptionist || isAdmin || isDoctor) && 
        ['pending', 'checked-in', 'in-progress'].includes(status)) {
      actions.push({ label: 'Cancel', status: 'cancelled', color: 'btn-danger' });
    }

    return actions;
  };

  // If there's a fatal page error, show it
  if (pageError && !loading && appointments.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-venus-danger mx-auto mb-4" />
        <h2 className="text-xl font-bold text-venus-text-primary mb-2">Error Loading Page</h2>
        <p className="text-venus-text-muted mb-4">{pageError}</p>
        <button onClick={() => { setPageError(null); getAppointments(filters); }} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">Appointments</h1>
          <p className="text-venus-text-muted mt-1">
            Manage patient appointments and schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => getAppointments(filters)}
            className="p-2 rounded-lg bg-venus-bg-secondary border border-venus-border hover:border-venus-border-hover text-venus-text-muted hover:text-venus-text-primary transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-venus-bg-secondary border border-venus-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5
                ${viewMode === 'calendar' 
                  ? 'bg-venus-primary-500 text-white' 
                  : 'text-venus-text-muted hover:text-venus-text-primary'
                }
              `}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5
                ${viewMode === 'list' 
                  ? 'bg-venus-primary-500 text-white' 
                  : 'text-venus-text-muted hover:text-venus-text-primary'
                }
              `}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {pageError && (
        <div className="bg-venus-danger/10 border border-venus-danger/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-venus-danger flex-shrink-0" />
          <p className="text-sm text-venus-danger">{pageError}</p>
          <button onClick={() => setPageError(null)} className="ml-auto text-xs text-venus-danger hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      {loading && appointments.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-venus-primary-400 border-t-transparent rounded-full" />
        </div>
      ) : viewMode === 'calendar' ? (
        <AppointmentCalendar
          appointments={enrichedAppointments}
          onSelectAppointment={handleSelectAppointment}
          onDateSelect={handleDateSelect}
          onCreateAppointment={() => setShowCreateModal(true)}
          filters={filters}
        />
      ) : (
        <AppointmentList
          appointments={enrichedAppointments}
          onSelectAppointment={handleSelectAppointment}
          onCreateAppointment={() => setShowCreateModal(true)}
          doctors={doctors}
          loading={loading}
        />
      )}

      {/* Create Modal */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAppointment}
        loading={actionLoading}
      />

      {/* Detail Modal */}
      <ModalFallback
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAppointment(null);
        }}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedAppointment.status} size="md" />
              <span className={`
                text-xs px-2 py-1 rounded-full
                ${selectedAppointment.type === 'walk-in' 
                  ? 'bg-venus-info/10 text-venus-info' 
                  : 'bg-venus-primary-500/10 text-venus-primary-400'
                }
              `}>
                {selectedAppointment.type === 'walk-in' ? 'Walk-in' : 'Scheduled'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-venus-bg-tertiary p-3 rounded-lg">
                <p className="text-xs text-venus-text-muted mb-1">Patient</p>
                <p className="text-sm font-medium text-venus-text-primary">
                  {selectedAppointment.patientName}
                </p>
              </div>
              <div className="bg-venus-bg-tertiary p-3 rounded-lg">
                <p className="text-xs text-venus-text-muted mb-1">Doctor</p>
                <p className="text-sm font-medium text-venus-text-primary">
                  {selectedAppointment.doctorName}
                </p>
              </div>
              <div className="bg-venus-bg-tertiary p-3 rounded-lg">
                <p className="text-xs text-venus-text-muted mb-1">Date & Time</p>
                <p className="text-sm font-medium text-venus-text-primary">
                  {selectedAppointment.date instanceof Date 
                    ? selectedAppointment.date.toLocaleDateString() 
                    : new Date(selectedAppointment.date).toLocaleDateString()
                  } at {selectedAppointment.time}
                </p>
              </div>
              <div className="bg-venus-bg-tertiary p-3 rounded-lg">
                <p className="text-xs text-venus-text-muted mb-1">Duration</p>
                <p className="text-sm font-medium text-venus-text-primary">
                  {selectedAppointment.duration || 30} minutes
                </p>
              </div>
            </div>

            {selectedAppointment.notes && (
              <div className="bg-venus-bg-tertiary p-3 rounded-lg">
                <p className="text-xs text-venus-text-muted mb-1">Notes</p>
                <p className="text-sm text-venus-text-primary">{selectedAppointment.notes}</p>
              </div>
            )}

            {selectedAppointment.cancellationReason && (
              <div className="bg-venus-danger/10 border border-venus-danger/30 p-3 rounded-lg">
                <p className="text-xs text-venus-danger mb-1">Cancellation Reason</p>
                <p className="text-sm text-venus-text-primary">{selectedAppointment.cancellationReason}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-venus-border">
              {getAvailableActions(selectedAppointment.status).map((action) => (
                <button
                  key={action.status}
                  onClick={() => {
                    if (action.status === 'cancelled') {
                      setShowCancelModal(true);
                    } else {
                      handleStatusChange(action.status);
                    }
                  }}
                  disabled={actionLoading}
                  className={action.color}
                >
                  {action.label}
                </button>
              ))}

              {(isAdmin || isReceptionist) && (
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="btn-danger ml-auto"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </ModalFallback>

      {/* Cancel Modal */}
      <ModalFallback
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancelReason('');
        }}
        title="Cancel Appointment"
      >
        <div className="space-y-4">
          <p className="text-sm text-venus-text-secondary">
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </p>
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-2">
              Reason for Cancellation <span className="text-venus-danger">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Enter cancellation reason..."
              className="input-field w-full resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
              }}
              className="btn-secondary"
            >
              Back
            </button>
            <button
              onClick={() => handleStatusChange('cancelled')}
              disabled={!cancelReason.trim() || actionLoading}
              className="btn-danger"
            >
              {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </ModalFallback>
    </div>
  );
};

export default AppointmentsPage;