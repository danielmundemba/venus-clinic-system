import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  List,
  Clock,
  User,
  Stethoscope
} from 'lucide-react';
import StatusBadge from './StatusBadge';

const AppointmentCalendar = ({ 
  appointments = [], 
  onSelectAppointment, 
  onDateSelect,
  onCreateAppointment,
  filters = {}
}) => {
  const [view, setView] = useState('month'); // month, week, day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const statusColors = {
    pending: 'border-l-venus-warning bg-venus-warning/10',
    'checked-in': 'border-l-venus-primary-400 bg-venus-primary-500/10',
    'in-progress': 'border-l-venus-info bg-venus-info/10',
    completed: 'border-l-venus-success bg-venus-success/10',
    cancelled: 'border-l-venus-danger bg-venus-danger/10'
  };

  // Navigation
  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  // Calendar helpers
  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month padding to fill 6 rows (42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const getWeekData = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push({ date: d });
    }
    return days;
  };

  const getAppointmentsForDate = (date) => {
    return appointments.filter(app => {
      const appDate = app.date instanceof Date ? app.date : new Date(app.date);
      return appDate.toDateString() === date.toDateString();
    }).sort((a, b) => {
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!selectedDay) return false;
    return date.toDateString() === selectedDay.toDateString();
  };

  const formatDateHeader = () => {
    const options = { year: 'numeric', month: 'long' };
    if (view === 'day') {
      options.day = 'numeric';
    }
    return currentDate.toLocaleDateString('en-US', options);
  };

  // Time slots for day/week view
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 8; i <= 18; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const getAppointmentPosition = (appointment) => {
    const time = appointment.time || '09:00';
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = (hours - 8) * 60 + minutes;
    const duration = appointment.duration || 30;
    const top = (startMinutes / 30) * 48; // 48px per 30min slot
    const height = (duration / 30) * 48;
    return { top, height };
  };

  // Render month view
  const renderMonthView = () => {
    const days = getMonthData();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-venus-text-muted py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ date, isCurrentMonth }, index) => {
            const dayApps = getAppointmentsForDate(date);
            const hasApps = dayApps.length > 0;

            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedDay(date);
                  onDateSelect?.(date);
                }}
                className={`
                  min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all
                  ${isCurrentMonth 
                    ? 'bg-venus-bg-secondary border-venus-border hover:border-venus-border-hover' 
                    : 'bg-venus-bg-primary/50 border-venus-border/30'
                  }
                  ${isToday(date) ? 'ring-2 ring-venus-primary-400 ring-offset-1 ring-offset-venus-bg-primary' : ''}
                  ${isSelected(date) ? 'border-venus-primary-400 bg-venus-primary-500/5' : ''}
                `}
              >
                <div className={`
                  text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday(date) ? 'bg-venus-primary-500 text-white' : ''}
                  ${!isCurrentMonth ? 'text-venus-text-muted/50' : 'text-venus-text-primary'}
                `}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayApps.slice(0, 3).map((app, i) => (
                    <div
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAppointment?.(app);
                      }}
                      className={`
                        text-xs px-1.5 py-0.5 rounded border-l-2 truncate cursor-pointer
                        ${statusColors[app.status] || statusColors.pending}
                      `}
                    >
                      {app.time} {app.patientName || 'Patient'}
                    </div>
                  ))}
                  {dayApps.length > 3 && (
                    <div className="text-xs text-venus-text-muted px-1.5">
                      +{dayApps.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const days = getWeekData();

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {days.map(({ date }, index) => {
            const dayApps = getAppointmentsForDate(date);
            return (
              <div 
                key={index}
                onClick={() => {
                  setSelectedDay(date);
                  onDateSelect?.(date);
                }}
                className={`
                  text-center p-3 rounded-lg border cursor-pointer transition-all
                  ${isToday(date) ? 'bg-venus-primary-500/10 border-venus-primary-400' : 'bg-venus-bg-secondary border-venus-border'}
                  ${isSelected(date) ? 'ring-2 ring-venus-primary-400' : ''}
                `}
              >
                <div className="text-xs text-venus-text-muted uppercase">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`
                  text-lg font-bold mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full
                  ${isToday(date) ? 'bg-venus-primary-500 text-white' : 'text-venus-text-primary'}
                `}>
                  {date.getDate()}
                </div>
                <div className="mt-2 space-y-1">
                  {dayApps.slice(0, 2).map((app, i) => (
                    <div key={i} className="text-xs text-venus-text-muted truncate">
                      {app.time} {app.patientName || 'Patient'}
                    </div>
                  ))}
                  {dayApps.length > 2 && (
                    <div className="text-xs text-venus-primary-400">
                      +{dayApps.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Week timeline */}
        <div className="bg-venus-bg-secondary border border-venus-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[80px_1fr] divide-x divide-venus-border">
            <div className="bg-venus-bg-tertiary">
              {timeSlots.map((slot, i) => (
                <div key={i} className="h-12 flex items-center justify-center text-xs text-venus-text-muted border-b border-venus-border/30">
                  {slot}
                </div>
              ))}
            </div>
            <div className="relative">
              {timeSlots.map((slot, i) => (
                <div key={i} className="h-12 border-b border-venus-border/20" />
              ))}
              {days.map(({ date }, dayIndex) => {
                const dayApps = getAppointmentsForDate(date);
                return dayApps.map((app, appIndex) => {
                  const pos = getAppointmentPosition(app);
                  return (
                    <div
                      key={`${dayIndex}-${appIndex}`}
                      onClick={() => onSelectAppointment?.(app)}
                      className={`
                        absolute left-0 right-0 mx-1 rounded border-l-2 px-2 py-1 cursor-pointer
                        text-xs overflow-hidden hover:brightness-110 transition-all
                        ${statusColors[app.status] || statusColors.pending}
                      `}
                      style={{
                        top: `${pos.top}px`,
                        height: `${Math.max(pos.height, 24)}px`,
                        left: `${(dayIndex / 7) * 100}%`,
                        width: `${100 / 7 - 1}%`
                      }}
                    >
                      <div className="font-medium truncate">{app.patientName || 'Patient'}</div>
                      <div className="text-venus-text-muted truncate">{app.time}</div>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayApps = getAppointmentsForDate(currentDate);

    return (
      <div className="bg-venus-bg-secondary border border-venus-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-venus-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-venus-text-primary">
                {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <p className="text-sm text-venus-text-muted">
                {dayApps.length} appointment{dayApps.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button 
              onClick={() => onCreateAppointment?.(currentDate)}
              className="btn-primary text-sm"
            >
              + New Appointment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[80px_1fr] divide-x divide-venus-border">
          <div className="bg-venus-bg-tertiary">
            {timeSlots.map((slot, i) => (
              <div key={i} className="h-12 flex items-center justify-center text-xs text-venus-text-muted border-b border-venus-border/30">
                {slot}
              </div>
            ))}
          </div>
          <div className="relative">
            {timeSlots.map((slot, i) => (
              <div key={i} className="h-12 border-b border-venus-border/20" />
            ))}
            {dayApps.map((app, index) => {
              const pos = getAppointmentPosition(app);
              return (
                <div
                  key={index}
                  onClick={() => onSelectAppointment?.(app)}
                  className={`
                    absolute left-2 right-2 rounded-lg border-l-3 p-3 cursor-pointer
                    hover:brightness-110 transition-all
                    ${statusColors[app.status] || statusColors.pending}
                  `}
                  style={{
                    top: `${pos.top}px`,
                    height: `${Math.max(pos.height, 40)}px`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-venus-text-muted" />
                      <span className="text-sm font-medium text-venus-text-primary">
                        {app.time} - {app.duration}min
                      </span>
                    </div>
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-sm text-venus-text-secondary">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {app.patientName || 'Unknown Patient'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      {app.doctorName || 'Unassigned'}
                    </span>
                  </div>
                  {app.notes && (
                    <p className="mt-1 text-xs text-venus-text-muted truncate">{app.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-venus-bg-secondary border border-venus-border hover:border-venus-border-hover text-venus-text-primary transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-venus-text-primary min-w-[200px] text-center">
            {formatDateHeader()}
          </h2>
          <button 
            onClick={() => navigate(1)}
            className="p-2 rounded-lg bg-venus-bg-secondary border border-venus-border hover:border-venus-border-hover text-venus-text-primary transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button 
            onClick={goToToday}
            className="ml-2 px-3 py-2 text-sm font-medium bg-venus-bg-secondary border border-venus-border hover:border-venus-border-hover rounded-lg text-venus-text-primary transition-all"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-venus-bg-secondary border border-venus-border rounded-lg p-1">
            {['month', 'week', 'day'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize
                  ${view === v 
                    ? 'bg-venus-primary-500 text-white' 
                    : 'text-venus-text-muted hover:text-venus-text-primary'
                  }
                `}
              >
                {v === 'month' && <CalendarIcon className="w-4 h-4 inline mr-1" />}
                {v === 'week' && <CalendarIcon className="w-4 h-4 inline mr-1" />}
                {v === 'day' && <List className="w-4 h-4 inline mr-1" />}
                {v}
              </button>
            ))}
          </div>
          <button 
            onClick={() => onCreateAppointment?.(selectedDay || currentDate)}
            className="btn-primary text-sm"
          >
            + New
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-4">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {/* Selected Day Detail (for month view) */}
      {view === 'month' && selectedDay && (
        <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-venus-text-primary">
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <button 
              onClick={() => onCreateAppointment?.(selectedDay)}
              className="btn-primary text-sm"
            >
              + Add Appointment
            </button>
          </div>
          <div className="space-y-2">
            {getAppointmentsForDate(selectedDay).map((app) => (
              <div
                key={app.id}
                onClick={() => onSelectAppointment?.(app)}
                className={`
                  flex items-center gap-4 p-3 rounded-lg border-l-3 cursor-pointer
                  hover:bg-venus-bg-elevated transition-all
                  ${statusColors[app.status] || statusColors.pending}
                `}
              >
                <div className="text-sm font-medium text-venus-text-primary w-16">
                  {app.time}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-venus-text-primary truncate">
                    {app.patientName || 'Unknown Patient'}
                  </div>
                  <div className="text-xs text-venus-text-muted">
                    Dr. {app.doctorName || 'Unassigned'} • {app.duration}min
                  </div>
                </div>
                <StatusBadge status={app.status} size="sm" />
              </div>
            ))}
            {getAppointmentsForDate(selectedDay).length === 0 && (
              <p className="text-sm text-venus-text-muted text-center py-4">
                No appointments for this day
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;