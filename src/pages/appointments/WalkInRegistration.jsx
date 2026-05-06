import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientRegistration from '../patients/PatientRegistration';
import { createDocument } from '../../firebase/db';
import { useAuditLog } from '../../hooks/useAuditLog';
import { useAuth } from '../../context/AuthContext';
import { appointmentSchema } from '../../utils/validators';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Calendar, Clock, Stethoscope, Loader2 } from 'lucide-react';

const WalkInRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [step, setStep] = useState(1); // 1: Register patient, 2: Create appointment
  const [registeredPatient, setRegisteredPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      type: 'walk-in',
    },
  });

  const handlePatientRegistered = (patient) => {
    setRegisteredPatient(patient);
    setStep(2);
    // Load doctors for selection
    loadDoctors();
  };

  const loadDoctors = async () => {
    // This would fetch from your doctors collection
    // For now, using placeholder
    setDoctors([
      { id: 'doc1', name: 'Dr. Smith', specialty: 'General Practice' },
      { id: 'doc2', name: 'Dr. Jones', specialty: 'Pediatrics' },
    ]);
  };

  const onSubmitAppointment = async (data) => {
    setSubmitting(true);
    try {
      const appointmentData = {
        ...data,
        patientId: registeredPatient.id,
        type: 'walk-in',
        status: 'checked-in',
        createdBy: user.uid,
      };

      const docRef = await createDocument('appointments', appointmentData);
      
      await logAction('create', 'appointment', docRef.id, {
        type: 'walk-in',
        patientId: registeredPatient.id,
        patientName: `${registeredPatient.firstName} ${registeredPatient.lastName}`,
      });

      navigate('/appointments');
    } catch (error) {
      console.error('Walk-in error:', error);
      alert('Failed to create walk-in appointment: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">Walk-in Registration</h1>
        <p className="text-venus-text-muted mt-1">
          Register a walk-in patient and create an immediate appointment
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-venus-primary-400' : 'text-venus-text-muted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 1 ? 'bg-venus-primary-500/20 border border-venus-primary-500/30' : 'bg-venus-bg-tertiary border border-venus-border'
          }`}>
            1
          </div>
          <span className="text-sm font-medium">Patient Info</span>
        </div>
        <div className="flex-1 h-px bg-venus-border" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-venus-primary-400' : 'text-venus-text-muted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 2 ? 'bg-venus-primary-500/20 border border-venus-primary-500/30' : 'bg-venus-bg-tertiary border border-venus-border'
          }`}>
            2
          </div>
          <span className="text-sm font-medium">Assign Doctor</span>
        </div>
      </div>

      {/* Step 1: Patient Registration */}
      {step === 1 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="w-5 h-5 text-venus-primary-400" />
            <h2 className="text-lg font-semibold text-venus-text-primary">Step 1: Register Patient</h2>
          </div>
          <PatientRegistration 
            onSuccess={handlePatientRegistered} 
            isWalkIn={true} 
          />
        </div>
      )}

      {/* Step 2: Create Walk-in Appointment */}
      {step === 2 && registeredPatient && (
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-venus-primary-400" />
            <h2 className="text-lg font-semibold text-venus-text-primary">Step 2: Assign to Doctor</h2>
          </div>

          {/* Patient Summary */}
          <div className="bg-venus-bg-tertiary border border-venus-border rounded-lg p-4 mb-6">
            <p className="text-sm text-venus-text-muted">Patient</p>
            <p className="text-lg font-medium text-venus-text-primary">
              {registeredPatient.firstName} {registeredPatient.lastName}
            </p>
            <p className="text-sm text-venus-text-muted">
              {registeredPatient.phone} • {registeredPatient.nrcNumber || 'No NRC'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmitAppointment)} className="space-y-4">
            <input type="hidden" {...register('patientId')} value={registeredPatient.id} />
            <input type="hidden" {...register('type')} value="walk-in" />

            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                Select Doctor *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {doctors.map((doctor) => (
                  <label
                    key={doctor.id}
                    className="flex items-center gap-3 p-4 bg-venus-bg-tertiary border border-venus-border rounded-lg cursor-pointer hover:border-venus-primary-500/50 transition-colors"
                  >
                    <input
                      {...register('doctorId')}
                      type="radio"
                      value={doctor.id}
                      className="w-4 h-4 text-venus-primary-500"
                    />
                    <div>
                      <Stethoscope className="w-5 h-5 text-venus-primary-400 mb-1" />
                      <p className="text-sm font-medium text-venus-text-primary">{doctor.name}</p>
                      <p className="text-xs text-venus-text-muted">{doctor.specialty}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.doctorId && (
                <p className="mt-1 text-xs text-venus-danger">{errors.doctorId.message}</p>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                  Date *
                </label>
                <input
                  {...register('date')}
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
                {errors.date && (
                  <p className="mt-1 text-xs text-venus-danger">{errors.date.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                  Time *
                </label>
                <input
                  {...register('time')}
                  type="time"
                  defaultValue={new Date().toTimeString().slice(0, 5)}
                  className="input-field"
                />
                {errors.time && (
                  <p className="mt-1 text-xs text-venus-danger">{errors.time.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                rows={2}
                className="input-field resize-none"
                placeholder="Reason for visit, symptoms, etc."
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5" />
                    Create Walk-in
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WalkInRegistration;