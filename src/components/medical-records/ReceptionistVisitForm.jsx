import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { visitInfoSchema } from '../../utils/validators';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import { formatDateForInput } from '../../utils/formatters';
import { Save, Loader2, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

const ReceptionistVisitForm = ({ patientId, recordId, initialData, readOnly, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(!readOnly && !initialData?.visitDate);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { updateVisitInfo, createVisit, loading } = useMedicalRecords(patientId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(visitInfoSchema),
    defaultValues: {
      visitDate: formatDateForInput(new Date()),
      visitTime: new Date().toTimeString().slice(0, 5),
      visitType: 'outpatient',
      chiefComplaint: '',
      paymentStatus: 'pending',
      ...initialData,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        visitDate: initialData.visitDate
          ? formatDateForInput(initialData.visitDate)
          : formatDateForInput(new Date()),
        visitTime: initialData.visitTime || new Date().toTimeString().slice(0, 5),
        visitType: initialData.visitType || 'outpatient',
        chiefComplaint: initialData.chiefComplaint || '',
        paymentStatus: initialData.paymentStatus || 'pending',
      });
    }
  }, [initialData, reset]);

  // Auto-dismiss success message
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => setSubmitSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  const onSubmit = async (data) => {
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      if (recordId) {
        await updateVisitInfo(recordId, data);
      } else {
        await createVisit(data);
      }
      setIsEditing(false);
      setSubmitSuccess(true);
      onUpdate?.();
    } catch (err) {
      console.error('Failed to save visit info:', err);
      setSubmitError(err.message || 'Failed to save visit. Please try again.');
    }
  };

  // Read-only view for non-receptionists
  if (readOnly && !isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-venus-text-primary">Visit Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-venus-text-muted uppercase tracking-wide">
              Visit Date
            </label>
            <p className="text-venus-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-venus-primary-400" />
              {initialData?.visitDate ? formatDateForInput(initialData.visitDate) : 'Not set'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-venus-text-muted uppercase tracking-wide">
              Visit Time
            </label>
            <p className="text-venus-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-venus-primary-400" />
              {initialData?.visitTime || 'Not set'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-venus-text-muted uppercase tracking-wide">
              Visit Type
            </label>
            <p className="text-venus-text-primary capitalize">
              {initialData?.visitType || 'Not set'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-venus-text-muted uppercase tracking-wide">
              Payment Status
            </label>
            <p className="text-venus-text-primary capitalize">
              {initialData?.paymentStatus || 'pending'}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-venus-text-muted uppercase tracking-wide">
            Chief Complaint
          </label>
          <p className="text-venus-text-primary whitespace-pre-wrap">
            {initialData?.chiefComplaint || 'Not recorded'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-venus-text-primary">
          {recordId ? 'Edit Visit Information' : 'Create New Visit'}
        </h3>
        {readOnly && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm text-venus-primary-400 hover:text-venus-primary-300"
          >
            Edit
          </button>
        )}
      </div>

      {/* Success message */}
      {submitSuccess && (
        <div className="flex items-center gap-2 p-3 bg-venus-success/10 border border-venus-success/30 rounded-lg text-venus-success">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            {recordId ? 'Visit updated successfully!' : 'Visit created successfully!'}
          </span>
        </div>
      )}

      {/* Error message */}
      {submitError && (
        <div className="flex items-start gap-2 p-3 bg-venus-danger/10 border border-venus-danger/30 rounded-lg text-venus-danger">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Failed to save</p>
            <p className="text-xs">{submitError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Visit Date *
          </label>
          <input
            {...register('visitDate')}
            type="date"
            className="input-field"
            disabled={!isEditing}
          />
          {errors.visitDate && (
            <p className="mt-1 text-xs text-venus-danger">{errors.visitDate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Visit Time *
          </label>
          <input
            {...register('visitTime')}
            type="time"
            className="input-field"
            disabled={!isEditing}
          />
          {errors.visitTime && (
            <p className="mt-1 text-xs text-venus-danger">{errors.visitTime.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Visit Type *
          </label>
          <select {...register('visitType')} className="input-field" disabled={!isEditing}>
            <option value="outpatient">Outpatient</option>
            <option value="follow-up">Follow-up</option>
            <option value="emergency">Emergency</option>
            <option value="review">Review</option>
          </select>
          {errors.visitType && (
            <p className="mt-1 text-xs text-venus-danger">{errors.visitType.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Payment Status *
          </label>
          <select {...register('paymentStatus')} className="input-field" disabled={!isEditing}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="insurance">Insurance</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
          Chief Complaint / Reason for Visit *
        </label>
        <textarea
          {...register('chiefComplaint')}
          rows="3"
          className="input-field"
          placeholder="Describe the patient's chief complaint..."
          disabled={!isEditing}
        />
        {errors.chiefComplaint && (
          <p className="mt-1 text-xs text-venus-danger">{errors.chiefComplaint.message}</p>
        )}
      </div>

      {isEditing && (
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-venus-primary-500 text-white rounded-lg hover:bg-venus-primary-600 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {recordId ? 'Update Visit' : 'Create Visit'}
              </>
            )}
          </button>

          {recordId && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                reset(initialData);
              }}
              className="px-6 py-2.5 text-venus-text-secondary hover:text-venus-text-primary transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
};

export default ReceptionistVisitForm;