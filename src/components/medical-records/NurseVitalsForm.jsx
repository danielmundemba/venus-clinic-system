import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vitalsSchema } from '../../utils/validators';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import { Save, Loader2, Activity, Thermometer, Heart, Wind, Droplets, Ruler, Weight, AlertCircle, CheckCircle2 } from 'lucide-react';

const NurseVitalsForm = ({ patientId, recordId, initialData, readOnly, visitInfo, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(!readOnly && !initialData?.temperature);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { addVitals, loading } = useMedicalRecords(patientId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      temperature: '',
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      pulseRate: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: '',
      ...initialData
    }
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const onSubmit = async (data) => {
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      await addVitals(recordId, data);
      setIsEditing(false);
      setSubmitSuccess(true);
      onUpdate?.();
    } catch (err) {
      console.error('Failed to save vitals:', err);
      setSubmitError(err.message || 'Failed to save vitals. Please try again.');
    }
  };

  // Auto-dismiss success message
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => setSubmitSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  // Read-only view for doctors or when not editing
  if (readOnly && !isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-venus-text-primary">Vital Signs</h3>
        </div>

        {!initialData?.temperature ? (
          <div className="p-6 text-center bg-venus-bg-tertiary rounded-lg border border-dashed border-venus-border">
            <Activity className="w-8 h-8 text-venus-text-muted mx-auto mb-2" />
            <p className="text-venus-text-muted">No vitals recorded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <VitalCard 
              icon={Thermometer} 
              label="Temperature" 
              value={`${initialData.temperature}°C`} 
              normal="36.1-37.2°C"
            />
            <VitalCard 
              icon={Heart} 
              label="Blood Pressure" 
              value={`${initialData.bloodPressureSystolic}/${initialData.bloodPressureDiastolic} mmHg`} 
              normal="120/80 mmHg"
            />
            <VitalCard 
              icon={Activity} 
              label="Pulse Rate" 
              value={`${initialData.pulseRate} bpm`} 
              normal="60-100 bpm"
            />
            <VitalCard 
              icon={Wind} 
              label="Respiratory Rate" 
              value={`${initialData.respiratoryRate} /min`} 
              normal="12-20 /min"
            />
            <VitalCard 
              icon={Droplets} 
              label="Oxygen Saturation" 
              value={`${initialData.oxygenSaturation}%`} 
              normal="95-100%"
            />
            <VitalCard 
              icon={Weight} 
              label="Weight" 
              value={`${initialData.weight} kg`} 
              normal=""
            />
            <VitalCard 
              icon={Ruler} 
              label="Height" 
              value={`${initialData.height} cm`} 
              normal=""
            />
          </div>
        )}

        {initialData?.recordedAt && (
          <p className="text-xs text-venus-text-muted">
            Recorded: {new Date(initialData.recordedAt?.toDate?.() || initialData.recordedAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-venus-text-primary">
          {initialData?.temperature ? 'Update Vitals' : 'Record Vital Signs'}
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
          <span className="text-sm font-medium">Vitals saved successfully!</span>
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

      {/* Visit Info Reference */}
      {visitInfo && (
        <div className="p-3 bg-venus-bg-tertiary rounded-lg border border-venus-border">
          <p className="text-sm text-venus-text-muted">
            <span className="font-medium text-venus-text-secondary">Chief Complaint:</span>{' '}
            {visitInfo.chiefComplaint || 'Not recorded'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Temperature (°C) *
          </label>
          <input
            {...register('temperature')}
            type="text"
            className="input-field"
            placeholder="36.5"
            disabled={!isEditing && readOnly}
          />
          {errors.temperature && (
            <p className="mt-1 text-xs text-venus-danger">{errors.temperature.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            BP Systolic (mmHg) *
          </label>
          <input
            {...register('bloodPressureSystolic')}
            type="text"
            className="input-field"
            placeholder="120"
            disabled={!isEditing && readOnly}
          />
          {errors.bloodPressureSystolic && (
            <p className="mt-1 text-xs text-venus-danger">{errors.bloodPressureSystolic.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            BP Diastolic (mmHg) *
          </label>
          <input
            {...register('bloodPressureDiastolic')}
            type="text"
            className="input-field"
            placeholder="80"
            disabled={!isEditing && readOnly}
          />
          {errors.bloodPressureDiastolic && (
            <p className="mt-1 text-xs text-venus-danger">{errors.bloodPressureDiastolic.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Pulse Rate (bpm) *
          </label>
          <input
            {...register('pulseRate')}
            type="text"
            className="input-field"
            placeholder="72"
            disabled={!isEditing && readOnly}
          />
          {errors.pulseRate && (
            <p className="mt-1 text-xs text-venus-danger">{errors.pulseRate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Respiratory Rate (/min) *
          </label>
          <input
            {...register('respiratoryRate')}
            type="text"
            className="input-field"
            placeholder="16"
            disabled={!isEditing && readOnly}
          />
          {errors.respiratoryRate && (
            <p className="mt-1 text-xs text-venus-danger">{errors.respiratoryRate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Oxygen Saturation (%) *
          </label>
          <input
            {...register('oxygenSaturation')}
            type="text"
            className="input-field"
            placeholder="98"
            disabled={!isEditing && readOnly}
          />
          {errors.oxygenSaturation && (
            <p className="mt-1 text-xs text-venus-danger">{errors.oxygenSaturation.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Weight (kg) *
          </label>
          <input
            {...register('weight')}
            type="text"
            className="input-field"
            placeholder="70"
            disabled={!isEditing && readOnly}
          />
          {errors.weight && (
            <p className="mt-1 text-xs text-venus-danger">{errors.weight.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Height (cm) *
          </label>
          <input
            {...register('height')}
            type="text"
            className="input-field"
            placeholder="175"
            disabled={!isEditing && readOnly}
          />
          {errors.height && (
            <p className="mt-1 text-xs text-venus-danger">{errors.height.message}</p>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-venus-primary-500 text-white rounded-lg hover:bg-venus-primary-600 transition-colors font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Vitals
              </>
            )}
          </button>

          {initialData?.temperature && (
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

// Helper component for read-only vital display
const VitalCard = ({ icon: Icon, label, value, normal }) => (
  <div className="p-4 bg-venus-bg-tertiary rounded-lg border border-venus-border">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-venus-primary-400" />
      <span className="text-xs font-medium text-venus-text-muted uppercase tracking-wide">{label}</span>
    </div>
    <p className="text-lg font-semibold text-venus-text-primary">{value}</p>
    {normal && <p className="text-xs text-venus-text-muted mt-1">Normal: {normal}</p>}
  </div>
);

export default NurseVitalsForm;