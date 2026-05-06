import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema } from '../../utils/validators';
import { createDocument } from '../../firebase/db';
import { useAuditLog } from '../../hooks/useAuditLog';
import { generateSearchableName, calculateAge } from '../../utils/formatters';
import { UserPlus, Loader2, Check } from 'lucide-react';

const PatientRegistration = ({ onSuccess, isWalkIn = false }) => {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);
    try {
      const patientData = {
        ...data,
        searchableName: generateSearchableName(data.firstName, data.lastName),
        age,
        isActive: true,
      };

      const docRef = await createDocument('patients', patientData);
      
      await logAction('create', 'patient', docRef.id, {
        name: `${data.firstName} ${data.lastName}`,
        type: isWalkIn ? 'walk-in' : 'registration',
      });

      setSuccess(true);
      reset();
      
      if (onSuccess) {
        onSuccess({ id: docRef.id, ...patientData });
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to register patient: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {success && (
        <div className="flex items-center gap-2 p-4 bg-venus-success/10 border border-venus-success/30 rounded-lg text-venus-success">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">Patient registered successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            First Name *
          </label>
          <input
            {...register('firstName')}
            className="input-field"
            placeholder="John"
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-venus-danger">{errors.firstName.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Last Name *
          </label>
          <input
            {...register('lastName')}
            className="input-field"
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-venus-danger">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* NRC Number */}
      <div>
        <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
          NRC Number
        </label>
        <input
          {...register('nrcNumber')}
          className="input-field"
          placeholder="123456/78/9"
        />
        {errors.nrcNumber && (
          <p className="mt-1 text-xs text-venus-danger">{errors.nrcNumber.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Date of Birth *
          </label>
          <input
            {...register('DOB')}
            type="date"
            className="input-field"
          />
          {errors.DOB && (
            <p className="mt-1 text-xs text-venus-danger">{errors.DOB.message}</p>
          )}
          {age !== null && (
            <p className="mt-1 text-xs text-venus-text-muted">{age} years old</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Gender *
          </label>
          <select
            {...register('gender')}
            className="input-field"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && (
            <p className="mt-1 text-xs text-venus-danger">{errors.gender.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Phone Number *
          </label>
          <input
            {...register('phone')}
            className="input-field"
            placeholder="+260 97 1234567"
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-venus-danger">{errors.phone.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            className="input-field"
            placeholder="patient@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-venus-danger">{errors.email.message}</p>
          )}
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
          Address *
        </label>
        <textarea
          {...register('address')}
          rows={2}
          className="input-field resize-none"
          placeholder="123 Main Street, Kitwe"
        />
        {errors.address && (
          <p className="mt-1 text-xs text-venus-danger">{errors.address.message}</p>
        )}
      </div>

      {/* Emergency Contact */}
      <div className="border border-venus-border rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-venus-text-secondary">Emergency Contact (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-venus-text-muted mb-1">Name</label>
            <input
              {...register('emergencyContactName')}
              className="input-field"
              placeholder="Contact name"
            />
          </div>
          <div>
            <label className="block text-xs text-venus-text-muted mb-1">Phone</label>
            <input
              {...register('emergencyContactPhone')}
              className="input-field"
              placeholder="+260 97 1234567"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Registering...
          </>
        ) : (
          <>
            <UserPlus className="w-5 h-5" />
            {isWalkIn ? 'Register Walk-in Patient' : 'Register Patient'}
          </>
        )}
      </button>
    </form>
  );
};

export default PatientRegistration;