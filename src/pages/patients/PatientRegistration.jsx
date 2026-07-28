import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema } from '../../utils/validators';
import { registerPatient } from '../../firebase/auth';
import { useAuditLog } from '../../hooks/useAuditLog';
import { calculateAge } from '../../utils/formatters';
import { 
  UserPlus, 
  Loader2, 
  X, 
  AlertCircle,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Contact,
  HeartPulse
} from 'lucide-react';

const PatientRegistration = ({ isOpen, onClose, onSuccess, isWalkIn = false }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { logAction } = useAuditLog();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: 'male',
    },
  });

  const dob = watch('DOB');
  const age = dob ? calculateAge(dob) : null;

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError('');

    try {
      const patientData = {
        firstName: data.firstName,
        lastName: data.lastName,
        searchableName: `${data.firstName.toLowerCase()} ${data.lastName.toLowerCase()}`,
        phone: data.phone,
        DOB: data.DOB,
        gender: data.gender,
        age,
        nrcNumber: data.nrcNumber || null,
        address: data.address,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
      };

      const result = await registerPatient(data.email, '123456', patientData);

      await logAction('create', 'patient', result.uid, {
        name: `${data.firstName} ${data.lastName}`,
        type: isWalkIn ? 'walk-in' : 'registration',
        email: data.email,
        patientInfoId: result.patientInfoId,
      });

      reset();

      if (onSuccess) {
        onSuccess({ 
          id: result.uid, 
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          role: 'patient',
          isActive: true,
        });
      }
    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = 'Failed to register patient';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-venus-border shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-venus-text-primary">
              {isWalkIn ? 'Register Walk-in Patient' : 'Register New Patient'}
            </h3>
            <p className="text-xs text-venus-text-muted mt-0.5">
              Creates a patient account with default password 123456
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-venus-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
            {/* Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                  First Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                  <input
                    {...register('firstName')}
                    className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    placeholder="John"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                  <input
                    {...register('lastName')}
                    className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    placeholder="Doe"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  {...register('email')}
                  type="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  placeholder="patient@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
              <p className="mt-1 text-xs text-venus-text-muted">
                This will be used for login. Default password will be set to "123456".
              </p>
            </div>

            {/* NRC */}
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                NRC Number
              </label>
              <div className="relative">
                <Contact className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  {...register('nrcNumber')}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  placeholder="123456/78/9"
                />
              </div>
              {errors.nrcNumber && (
                <p className="mt-1 text-xs text-red-400">{errors.nrcNumber.message}</p>
              )}
            </div>

            {/* DOB + Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                  Date of Birth <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                  <input
                    {...register('DOB')}
                    type="date"
                    className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  />
                </div>
                {errors.DOB && (
                  <p className="mt-1 text-xs text-red-400">{errors.DOB.message}</p>
                )}
                {age !== null && (
                  <p className="mt-1 text-xs text-venus-text-muted">{age} years old</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                  Gender <span className="text-red-400">*</span>
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-xs text-red-400">{errors.gender.message}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-venus-text-muted" />
                <input
                  {...register('phone')}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  placeholder="+260 97 1234567"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-venus-text-muted" />
                <textarea
                  {...register('address')}
                  rows={2}
                  className="w-full pl-10 pr-4 py-2.5 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
                  placeholder="123 Main Street, Kitwe"
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-xs text-red-400">{errors.address.message}</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="border border-venus-border rounded-lg p-4 space-y-4">
              <h5 className="text-xs font-medium text-venus-text-muted">Emergency Contact (Optional)</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-venus-text-muted mb-1">Name</label>
                  <input
                    {...register('emergencyContactName')}
                    className="w-full px-3 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500"
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-venus-text-muted mb-1">Phone</label>
                  <input
                    {...register('emergencyContactPhone')}
                    className="w-full px-3 py-2 bg-venus-bg-tertiary border border-venus-border rounded-lg text-sm text-venus-text-primary placeholder-venus-text-muted focus:outline-none focus:border-violet-500"
                    placeholder="+260 97 1234567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Static footer — always visible, solid background */}
          <div className="shrink-0 border-t border-venus-border bg-white dark:bg-gray-900 px-6 py-4 space-y-3">
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-300">Error</p>
                  <p className="text-sm text-red-400/90">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="p-1 hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-venus-border text-venus-text-primary rounded-lg text-sm font-medium hover:bg-venus-bg-elevated transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {isWalkIn ? 'Register Walk-in' : 'Register Patient'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientRegistration;