import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope,
  ChevronDown,
  X
} from 'lucide-react';
import StatusBadge from './StatusBadge';

const AppointmentList = ({ 
  appointments = [], 
  onSelectAppointment, 
  onCreateAppointment,
  doctors = [],
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date, status, patient

  const statusColors = {
    pending: 'border-l-venus-warning',
    'checked-in': 'border-l-venus-primary-400',
    'in-progress': 'border-l-venus-info',
    completed: 'border-l-venus-success',
    cancelled: 'border-l-venus-danger'
  };

  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        (app.patientName || '').toLowerCase().includes(query) ||
        (app.doctorName || '').toLowerCase().includes(query) ||
        (app.notes || '').toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Doctor filter
    if (doctorFilter !== 'all') {
      filtered = filtered.filter(app => app.doctorId === doctorFilter);
    }

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      filtered = filtered.filter(app => {
        const appDate = app.date instanceof Date ? app.date : new Date(app.date);
        return appDate.toDateString() === today.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      filtered = filtered.filter(app => {
        const appDate = app.date instanceof Date ? app.date : new Date(app.date);
        return appDate >= today && appDate <= weekEnd;
      });
    } else if (dateFilter === 'month') {
      const monthEnd = new Date(today);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      filtered = filtered.filter(app => {
        const appDate = app.date instanceof Date ? app.date : new Date(app.date);
        return appDate >= today && appDate <= monthEnd;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
        return (a.time || '').localeCompare(b.time || '');
      }
      if (sortBy === 'patient') {
        return (a.patientName || '').localeCompare(b.patientName || '');
      }
      if (sortBy === 'status') {
        const order = { pending: 0, 'checked-in': 1, 'in-progress': 2, completed: 3, cancelled: 4 };
        return (order[a.status] || 0) - (order[b.status] || 0);
      }
      return 0;
    });

    return filtered;
  }, [appointments, searchQuery, statusFilter, doctorFilter, dateFilter, sortBy]);

  const activeFiltersCount = [statusFilter, doctorFilter, dateFilter].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setStatusFilter('all');
    setDoctorFilter('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (d.toDateString() === today.toDateString()) return 'Today';

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
          <input
            type="text"
            placeholder="Search patients, doctors, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full pl-10"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-venus-text-muted hover:text-venus-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all
              ${showFilters || activeFiltersCount > 0
                ? 'bg-venus-primary-500/10 border-venus-primary-400 text-venus-primary-400'
                : 'bg-venus-bg-secondary border-venus-border text-venus-text-primary hover:border-venus-border-hover'
              }
            `}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-venus-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field text-sm py-2"
          >
            <option value="date">Sort by Date</option>
            <option value="patient">Sort by Patient</option>
            <option value="status">Sort by Status</option>
          </select>

          <button 
            onClick={onCreateAppointment}
            className="btn-primary text-sm whitespace-nowrap"
          >
            + New Appointment
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-venus-text-primary">Filter Appointments</h4>
            {activeFiltersCount > 0 && (
              <button 
                onClick={clearFilters}
                className="text-xs text-venus-danger hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-venus-text-muted mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field text-sm w-full"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="checked-in">Checked In</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-venus-text-muted mb-1 block">Doctor</label>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="input-field text-sm w-full"
              >
                <option value="all">All Doctors</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.firstName} {doc.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-venus-text-muted mb-1 block">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input-field text-sm w-full"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-venus-text-muted">
          {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Appointment List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-venus-primary-400 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-venus-text-muted">Loading appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12 bg-venus-bg-secondary border border-venus-border rounded-xl">
            <Calendar className="w-12 h-12 text-venus-text-muted mx-auto mb-3" />
            <p className="text-venus-text-muted font-medium">No appointments found</p>
            <p className="text-sm text-venus-text-muted/70 mt-1">
              {activeFiltersCount > 0 ? 'Try adjusting your filters' : 'Create your first appointment'}
            </p>
            {activeFiltersCount > 0 && (
              <button 
                onClick={clearFilters}
                className="mt-3 text-sm text-venus-primary-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              onClick={() => onSelectAppointment?.(appointment)}
              className={`
                group bg-venus-bg-secondary border border-venus-border rounded-xl p-4 
                hover:border-venus-border-hover hover:bg-venus-bg-elevated 
                cursor-pointer transition-all duration-200
                border-l-4 ${statusColors[appointment.status] || statusColors.pending}
              `}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Time Column */}
                <div className="sm:w-24 flex-shrink-0">
                  <div className="text-sm font-semibold text-venus-text-primary">
                    {appointment.time || 'N/A'}
                  </div>
                  <div className="text-xs text-venus-text-muted">
                    {formatDate(appointment.date)}
                  </div>
                </div>

                {/* Patient Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-venus-text-muted flex-shrink-0" />
                    <span className="text-sm font-medium text-venus-text-primary truncate">
                      {appointment.patientName || 'Unknown Patient'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-venus-text-muted">
                      <Stethoscope className="w-3 h-3" />
                      Dr. {appointment.doctorName || 'Unassigned'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-venus-text-muted">
                      <Clock className="w-3 h-3" />
                      {appointment.duration || 30} min
                    </span>
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${appointment.type === 'walk-in' 
                        ? 'bg-venus-info/10 text-venus-info' 
                        : 'bg-venus-primary-500/10 text-venus-primary-400'
                      }
                    `}>
                      {appointment.type === 'walk-in' ? 'Walk-in' : 'Scheduled'}
                    </span>
                  </div>
                  {appointment.notes && (
                    <p className="text-xs text-venus-text-muted mt-2 truncate">
                      {appointment.notes}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <StatusBadge status={appointment.status} size="sm" />
                  <ChevronDown className="w-4 h-4 text-venus-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AppointmentList;