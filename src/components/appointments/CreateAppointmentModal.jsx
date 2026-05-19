import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  X, 
  Search, 
  Calendar, 
  Clock, 
  Stethoscope, 
  FileText, 
  AlertCircle,
  User
} from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  duration: z.number().min(5).max(240).default(30),
  type: z.enum(['scheduled', 'walk-in']),
  notes: z.string().max(500, 'Notes must be under 500 characters').optional()
});

const CreateAppointmentModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialDate = null,
  initialPatient = null,
  loading = false
}) => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [fetchingDoctors, setFetchingDoctors] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const searchRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      duration: 30,
      type: 'scheduled',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      notes: ''
    }
  });

  const watchType = watch('type');

  // Fetch doctors
  useEffect(() => {
    if (!isOpen) return;

    const fetchDoctors = async () => {
      setFetchingDoctors(true);
      try {
        const q = query(collection(db, 'doctors'), orderBy('lastName'));
        const snapshot = await getDocs(q);
        setDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching doctors:', err);
      } finally {
        setFetchingDoctors(false);
      }
    };

    fetchDoctors();
  }, [isOpen]);

  // Fetch patients for search
  useEffect(() => {
    if (!isOpen || !showPatientSearch || searchQuery.length < 2) {
      setPatients([]);
      return;
    }

    const fetchPatients = async () => {
      setFetchingPatients(true);
      try {
        // Simple query - get all and filter client-side to avoid index issues
        const q = query(collection(db, 'patients'), orderBy('lastName'));
        const snapshot = await getDocs(q);
        const allPatients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filtered = allPatients.filter(p => {
          const fullName = `${p.firstName || ''} ${p.lastName || ''} ${p.phone || ''}`.toLowerCase();
          return fullName.includes(searchQuery.toLowerCase());
        }).slice(0, 10);
        setPatients(filtered);
      } catch (err) {
        console.error('Error fetching patients:', err);
        setPatients([]);
      } finally {
        setFetchingPatients(false);
      }
    };

    const timeoutId = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, showPatientSearch, searchQuery]);

  // Click outside to close search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowPatientSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set initial patient if provided
  useEffect(() => {
    if (initialPatient && isOpen) {
      setSelectedPatient(initialPatient);
      setValue('patientId', initialPatient.id);
      setValue('patientName', `${initialPatient.firstName || ''} ${initialPatient.lastName || ''}`.trim());
    }
  }, [initialPatient, isOpen, setValue]);

  // Set initial date
  useEffect(() => {
    if (initialDate && isOpen) {
      const d = initialDate instanceof Date ? initialDate : new Date(initialDate);
      if (!isNaN(d.getTime())) {
        setValue('date', d.toISOString().split('T')[0]);
      }
    }
  }, [initialDate, isOpen, setValue]);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setValue('patientId', patient.id);
    setValue('patientName', `${patient.firstName || ''} ${patient.lastName || ''}`.trim());
    setShowPatientSearch(false);
    setSearchQuery('');
  };

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const handleClose = () => {
    reset();
    setSelectedPatient(null);
    setSearchQuery('');
    setShowPatientSearch(false);
    onClose();
  };

  // Generate time slots
  const timeSlots = [];
  for (let i = 8; i <= 18; i++) {
    timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${i.toString().padStart(2, '0')}:30`);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-venus-bg-primary border border-venus-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-venus-border">
          <div>
            <h2 className="text-xl font-bold text-venus-text-primary">Create Appointment</h2>
            <p className="text-sm text-venus-text-muted mt-1">Schedule a new patient appointment</p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-venus-bg-elevated text-venus-text-muted hover:text-venus-text-primary transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-5">
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-2">
              Patient <span className="text-venus-danger">*</span>
            </label>

            {selectedPatient ? (
              <div className="flex items-center gap-3 p-3 bg-venus-bg-secondary border border-venus-border rounded-lg">
                <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-venus-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-venus-text-primary">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-xs text-venus-text-muted">
                    {selectedPatient.phone || selectedPatient.email || 'No contact info'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setValue('patientId', '');
                    setValue('patientName', '');
                  }}
                  className="text-venus-danger hover:text-venus-danger/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={searchRef}>
                <div 
                  onClick={() => setShowPatientSearch(true)}
                  className="input-field w-full flex items-center gap-2 cursor-pointer text-venus-text-muted"
                >
                  <Search className="w-4 h-4" />
                  <span>Search for a patient...</span>
                </div>

                {showPatientSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-venus-bg-secondary border border-venus-border rounded-lg shadow-xl">
                    <div className="p-3 border-b border-venus-border">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type patient name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="input-field w-full pl-10"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {fetchingPatients ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin w-5 h-5 border-2 border-venus-primary-400 border-t-transparent rounded-full mx-auto" />
                        </div>
                      ) : patients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-venus-text-muted">
                          {searchQuery.length < 2 ? 'Type at least 2 characters' : 'No patients found'}
                        </div>
                      ) : (
                        patients.map(patient => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => handlePatientSelect(patient)}
                            className="w-full text-left p-3 hover:bg-venus-bg-elevated transition-colors border-b border-venus-border/30 last:border-0"
                          >
                            <p className="text-sm font-medium text-venus-text-primary">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-xs text-venus-text-muted">
                              {patient.phone || patient.email || 'No contact'}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {errors.patientId && (
              <p className="text-xs text-venus-danger mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.patientId.message}
              </p>
            )}
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-2">
              Doctor <span className="text-venus-danger">*</span>
            </label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
              <select
                {...register('doctorId')}
                className="input-field w-full pl-10"
                disabled={fetchingDoctors}
              >
                <option value="">{fetchingDoctors ? 'Loading doctors...' : 'Select a doctor'}</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.firstName || ''} {doc.lastName || ''} 
                    {doc.specialization ? `(${doc.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {errors.doctorId && (
              <p className="text-xs text-venus-danger mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.doctorId.message}
              </p>
            )}
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-2">
                Date <span className="text-venus-danger">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  type="date"
                  {...register('date')}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field w-full pl-10"
                />
              </div>
              {errors.date && (
                <p className="text-xs text-venus-danger mt-1">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-2">
                Time <span className="text-venus-danger">*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <select
                  {...register('time')}
                  className="input-field w-full pl-10"
                >
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
              {errors.time && (
                <p className="text-xs text-venus-danger mt-1">{errors.time.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-2">
                Duration (min)
              </label>
              <select
                {...register('duration', { valueAsNumber: true })}
                className="input-field w-full"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-2">
              Appointment Type
            </label>
            <div className="flex gap-3">
              <label className={`
                flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${watchType === 'scheduled' 
                  ? 'border-venus-primary-400 bg-venus-primary-500/10' 
                  : 'border-venus-border bg-venus-bg-secondary hover:border-venus-border-hover'
                }
              `}>
                <input
                  type="radio"
                  value="scheduled"
                  {...register('type')}
                  className="sr-only"
                />
                <Calendar className={`w-5 h-5 ${watchType === 'scheduled' ? 'text-venus-primary-400' : 'text-venus-text-muted'}`} />
                <div>
                  <p className={`text-sm font-medium ${watchType === 'scheduled' ? 'text-venus-primary-400' : 'text-venus-text-primary'}`}>
                    Scheduled
                  </p>
                  <p className="text-xs text-venus-text-muted">Standard appointment</p>
                </div>
              </label>

              <label className={`
                flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${watchType === 'walk-in' 
                  ? 'border-venus-info bg-venus-info/10' 
                  : 'border-venus-border bg-venus-bg-secondary hover:border-venus-border-hover'
                }
              `}>
                <input
                  type="radio"
                  value="walk-in"
                  {...register('type')}
                  className="sr-only"
                />
                <Clock className={`w-5 h-5 ${watchType === 'walk-in' ? 'text-venus-info' : 'text-venus-text-muted'}`} />
                <div>
                  <p className={`text-sm font-medium ${watchType === 'walk-in' ? 'text-venus-info' : 'text-venus-text-primary'}`}>
                    Walk-in
                  </p>
                  <p className="text-xs text-venus-text-muted">Auto check-in on creation</p>
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-2">
              Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-venus-text-muted" />
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Add any relevant notes about the appointment..."
                className="input-field w-full pl-10 resize-none"
              />
            </div>
            {errors.notes && (
              <p className="text-xs text-venus-danger mt-1">{errors.notes.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-venus-border">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Create Appointment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAppointmentModal;