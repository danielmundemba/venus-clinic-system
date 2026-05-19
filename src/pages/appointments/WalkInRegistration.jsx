import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, MapPin, AlertCircle, CheckCircle, ArrowRight, Activity 
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAppointments } from '../../hooks/useAppointments';
import { useAuditLog } from '../../hooks/useAuditLog';
import { useAuth } from '../../context/AuthContext';

const walkInSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.string().optional(),
  reasonForVisit: z.string().min(1, 'Reason for visit is required'),
  preferredDoctor: z.string().optional()
});

const WalkInRegistration = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isReceptionist } = useAuth();
  const { createAppointment } = useAppointments();
  const { logAction } = useAuditLog();

  const [step, setStep] = useState(1);
  const [createdPatient, setCreatedPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(walkInSchema),
    defaultValues: { gender: 'male' }
  });

  // Load doctors for step 2
  useEffect(() => {
    if (step !== 2) return;

    const loadDoctors = async () => {
      try {
        const q = query(collection(db, 'doctors'), orderBy('lastName'));
        const snapshot = await getDocs(q);
        setDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error loading doctors:', err);
      }
    };
    loadDoctors();
  }, [step]);

  const onSubmitPatient = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const patientData = {
        ...data,
        type: 'walk-in',
        registeredAt: serverTimestamp(),
        registeredBy: user?.uid || user?.id || 'unknown',
        isActive: true
      };

      const patientRef = await addDoc(collection(db, 'patients'), patientData);
      const patient = { id: patientRef.id, ...data };
      setCreatedPatient(patient);

      await logAction({
        action: 'REGISTER_WALK_IN',
        targetId: patientRef.id,
        details: `Walk-in patient registered: ${data.firstName} ${data.lastName}`
      });

      setStep(2);
    } catch (err) {
      setError(err.message);
      console.error('Error registering walk-in:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSelectDoctor = async (doctorId) => {
    if (!createdPatient) return;

    setLoading(true);
    try {
      const doctor = doctors.find(d => d.id === doctorId);
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const result = await createAppointment({
        patientId: createdPatient.id,
        patientName: `${createdPatient.firstName} ${createdPatient.lastName}`.trim(),
        doctorId: doctorId || '',
        doctorName: doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Unassigned',
        date: now.toISOString().split('T')[0],
        time: timeString,
        duration: 30,
        type: 'walk-in',
        notes: createdPatient.reasonForVisit || 'Walk-in patient'
      });

      await logAction({
        action: 'CREATE_WALK_IN_APPOINTMENT',
        targetId: result.id,
        details: `Auto-created walk-in appointment for ${createdPatient.firstName} ${createdPatient.lastName}`
      });

      setStep(3);
    } catch (err) {
      setError(err.message);
      console.error('Error creating walk-in appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin && !isReceptionist) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-venus-danger mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-venus-text-primary">Access Denied</h2>
        <p className="text-venus-text-muted mt-2">Only receptionists and admins can register walk-in patients.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">Walk-in Registration</h1>
        <p className="text-venus-text-muted mt-1">Register a walk-in patient and add them to the queue</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { num: 1, label: 'Patient Info' },
          { num: 2, label: 'Assign Doctor' },
          { num: 3, label: 'Complete' }
        ].map((s, i) => (
          <React.Fragment key={s.num}>
            <div className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              ${step >= s.num 
                ? 'bg-venus-primary-500/15 text-venus-primary-400' 
                : 'bg-venus-bg-tertiary text-venus-text-muted'
              }
            `}>
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${step >= s.num ? 'bg-venus-primary-500 text-white' : 'bg-venus-bg-secondary text-venus-text-muted'}
              `}>
                {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
              </div>
              {s.label}
            </div>
            {i < 2 && (
              <ArrowRight className="w-4 h-4 text-venus-text-muted" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-venus-danger/10 border border-venus-danger/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-venus-danger flex-shrink-0" />
          <p className="text-sm text-venus-danger">{error}</p>
        </div>
      )}

      {/* Step 1: Patient Form */}
      {step === 1 && (
        <form onSubmit={handleSubmit(onSubmitPatient)} className="bg-venus-bg-secondary border border-venus-border rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-2">
                First Name <span className="text-venus-danger">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input {...register('firstName')} className="input-field w-full pl-10" placeholder="John" />
              </div>
              {errors.firstName && (
                <p className="text-xs text-venus-danger mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-2">
                Last Name <span className="text-venus-danger">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input {...register('lastName')} className="input-field w-full pl-10" placeholder="Doe" />
              </div>
              {errors.lastName && (
                <p className="text-xs text-venus-danger mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-2">
                Phone <span className="text-venus-danger">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input {...register('phone')} className="input-field w-full pl-10" placeholder="+260 97..." />
              </div>
              {errors.phone && (
                <p className="text-xs text-venus-danger mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-2">Email</label>
              <input {...register('email')} type="email" className="input-field w-full" placeholder="optional@email.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-2">Gender</label>
              <select {...register('gender')} className="input-field w-full">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-2">Date of Birth</label>
              <input {...register('dateOfBirth')} type="date" className="input-field w-full" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-2">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-venus-text-muted" />
              <textarea {...register('address')} rows={2} className="input-field w-full pl-10 resize-none" placeholder="Patient address..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-primary mb-2">
              Reason for Visit <span className="text-venus-danger">*</span>
            </label>
            <textarea 
              {...register('reasonForVisit')} 
              rows={3} 
              className="input-field w-full resize-none" 
              placeholder="Describe the reason for visit..."
            />
            {errors.reasonForVisit && (
              <p className="text-xs text-venus-danger mt-1">{errors.reasonForVisit.message}</p>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  Next: Assign Doctor
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Doctor Selection */}
      {step === 2 && createdPatient && (
        <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-6 space-y-5">
          <div className="bg-venus-success/10 border border-venus-success/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-venus-success" />
              <div>
                <p className="text-sm font-medium text-venus-success">
                  Patient registered: {createdPatient.firstName} {createdPatient.lastName}
                </p>
                <p className="text-xs text-venus-text-muted">Now assign a doctor to create the appointment</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-venus-text-primary">Select Doctor</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {doctors.map(doctor => (
              <button
                key={doctor.id}
                onClick={() => onSelectDoctor(doctor.id)}
                disabled={loading}
                className="flex items-center gap-3 p-4 bg-venus-bg-tertiary border border-venus-border hover:border-venus-primary-400 hover:bg-venus-primary-500/5 rounded-lg transition-all text-left"
              >
                <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-venus-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-venus-text-primary">
                    Dr. {doctor.firstName || ''} {doctor.lastName || ''}
                  </p>
                  <p className="text-xs text-venus-text-muted">
                    {doctor.specialization || 'General Practitioner'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => onSelectDoctor('')}
              disabled={loading}
              className="text-sm text-venus-text-muted hover:text-venus-text-primary transition-colors"
            >
              Skip doctor assignment →
            </button>
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              className="btn-secondary"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="bg-venus-bg-secondary border border-venus-border rounded-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-venus-success/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-venus-success" />
          </div>
          <h2 className="text-xl font-bold text-venus-text-primary">Walk-in Complete!</h2>
          <p className="text-venus-text-muted">
            {createdPatient?.firstName} {createdPatient?.lastName} has been registered and added to the appointment queue.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <button 
              onClick={() => navigate('/appointments')}
              className="btn-primary"
            >
              View Appointments
            </button>
            <button 
              onClick={() => {
                setStep(1);
                setCreatedPatient(null);
                setError(null);
              }}
              className="btn-secondary"
            >
              Register Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkInRegistration;