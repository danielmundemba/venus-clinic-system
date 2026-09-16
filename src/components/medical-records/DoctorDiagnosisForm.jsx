import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { diagnosisSchema } from '../../utils/validators';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import { Save, Loader2, Plus, Trash2, Stethoscope, Pill, FlaskConical, ScanLine, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

const DoctorDiagnosisForm = ({ patientId, recordId, initialData, readOnly, vitals, visitInfo, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(!readOnly && !initialData?.primaryDiagnosis);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { addDiagnosis, loading } = useMedicalRecords(patientId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      primaryDiagnosis: '',
      secondaryDiagnosis: '',
      icdCode: '',
      physicalExamination: '',
      presentIllness: '',
      pastMedicalHistory: '',
      surgicalHistory: '',
      familyHistory: '',
      socialHistory: '',
      allergies: [],
      currentMedications: [],
      labRequests: '',
      imagingRequests: '',
      prescribedMedications: '',
      procedures: '',
      doctorInstructions: '',
      followUpInstructions: '',
      ...initialData
    }
  });

  const { fields: allergyFields, append: appendAllergy, remove: removeAllergy } = useFieldArray({
    control,
    name: 'allergies'
  });

  const { fields: medFields, append: appendMed, remove: removeMed } = useFieldArray({
    control,
    name: 'currentMedications'
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        allergies: initialData.allergies || [],
        currentMedications: initialData.currentMedications || []
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data) => {
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      await addDiagnosis(recordId, data);
      setIsEditing(false);
      setSubmitSuccess(true);
      onUpdate?.();
    } catch (err) {
      console.error('Failed to save diagnosis:', err);
      setSubmitError(err.message || 'Failed to save diagnosis. Please try again.');
    }
  };

  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => setSubmitSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  if (readOnly && !isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-venus-text-primary">Diagnosis & Treatment</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visitInfo && (
            <div className="p-3 bg-venus-bg-tertiary rounded-lg border border-venus-border">
              <p className="text-xs font-medium text-venus-text-muted uppercase mb-1">Chief Complaint</p>
              <p className="text-sm text-venus-text-primary">{visitInfo.chiefComplaint || 'N/A'}</p>
            </div>
          )}
          {vitals?.temperature && (
            <div className="p-3 bg-venus-bg-tertiary rounded-lg border border-venus-border">
              <p className="text-xs font-medium text-venus-text-muted uppercase mb-1">Latest Vitals</p>
              <p className="text-sm text-venus-text-primary">
                T: {vitals.temperature}°C | BP: {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} | P: {vitals.pulseRate}
              </p>
            </div>
          )}
        </div>
        {!initialData?.primaryDiagnosis ? (
          <div className="p-6 text-center bg-venus-bg-tertiary rounded-lg border border-dashed border-venus-border">
            <Stethoscope className="w-8 h-8 text-venus-text-muted mx-auto mb-2" />
            <p className="text-venus-text-muted">No diagnosis recorded yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-venus-bg-tertiary rounded-lg border border-venus-border">
                <p className="text-xs font-medium text-venus-text-muted uppercase mb-1">Primary Diagnosis</p>
                <p className="text-venus-text-primary font-medium">{initialData.primaryDiagnosis}</p>
              </div>
              {initialData.secondaryDiagnosis && (
                <div className="p-4 bg-venus-bg-tertiary rounded-lg border border-venus-border">
                  <p className="text-xs font-medium text-venus-text-muted uppercase mb-1">Secondary Diagnosis</p>
                  <p className="text-venus-text-primary">{initialData.secondaryDiagnosis}</p>
                </div>
              )}
              {initialData.icdCode && (
                <div className="p-4 bg-venus-bg-tertiary rounded-lg border border-venus-border">
                  <p className="text-xs font-medium text-venus-text-muted uppercase mb-1">ICD Code</p>
                  <p className="text-venus-text-primary font-mono">{initialData.icdCode}</p>
                </div>
              )}
            </div>
            <SectionReadOnly title="History" icon={FileText}>
              {initialData.presentIllness && <InfoRow label="Present Illness" value={initialData.presentIllness} />}
              {initialData.pastMedicalHistory && <InfoRow label="Past Medical History" value={initialData.pastMedicalHistory} />}
              {initialData.surgicalHistory && <InfoRow label="Surgical History" value={initialData.surgicalHistory} />}
              {initialData.familyHistory && <InfoRow label="Family History" value={initialData.familyHistory} />}
              {initialData.socialHistory && <InfoRow label="Social History" value={initialData.socialHistory} />}
            </SectionReadOnly>
            {initialData.physicalExamination && (
              <SectionReadOnly title="Physical Examination" icon={Stethoscope}>
                <p className="text-sm text-venus-text-primary whitespace-pre-wrap">{initialData.physicalExamination}</p>
              </SectionReadOnly>
            )}
            {initialData.allergies?.length > 0 && (
              <SectionReadOnly title="Allergies" icon={Pill}>
                <div className="space-y-2">
                  {initialData.allergies.map((allergy, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="font-medium text-venus-text-primary">{allergy.name}</span>
                      <span className="text-venus-text-secondary">{allergy.reaction}</span>
                      <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                        allergy.severity === 'severe' ? 'bg-red-500/10 text-red-400' :
                        allergy.severity === 'moderate' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-green-500/10 text-green-400'
                      }`}>
                        {allergy.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionReadOnly>
            )}
            {initialData.currentMedications?.length > 0 && (
              <SectionReadOnly title="Current Medications" icon={Pill}>
                <div className="space-y-2">
                  {initialData.currentMedications.map((med, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="font-medium text-venus-text-primary">{med.name}</span>
                      <span className="text-venus-text-secondary">{med.dosage}</span>
                      <span className="text-venus-text-muted">{med.frequency}</span>
                    </div>
                  ))}
                </div>
              </SectionReadOnly>
            )}
            {(initialData.labRequests || initialData.imagingRequests) && (
              <SectionReadOnly title="Lab & Imaging Requests" icon={FlaskConical}>
                {initialData.labRequests && <InfoRow label="Laboratory" value={initialData.labRequests} />}
                {initialData.imagingRequests && <InfoRow label="Imaging" value={initialData.imagingRequests} />}
              </SectionReadOnly>
            )}
            <SectionReadOnly title="Treatment Plan" icon={ScanLine}>
              {initialData.prescribedMedications && <InfoRow label="Prescribed Medications" value={initialData.prescribedMedications} />}
              {initialData.procedures && <InfoRow label="Procedures" value={initialData.procedures} />}
              {initialData.doctorInstructions && <InfoRow label="Doctor Instructions" value={initialData.doctorInstructions} />}
              {initialData.followUpInstructions && <InfoRow label="Follow-up Instructions" value={initialData.followUpInstructions} />}
            </SectionReadOnly>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-venus-text-primary">
          {initialData?.primaryDiagnosis ? 'Update Diagnosis' : 'Add Diagnosis & Treatment'}
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

      {submitSuccess && (
        <div className="flex items-center gap-2 p-3 bg-venus-success/10 border border-venus-success/30 rounded-lg text-venus-success">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Diagnosis saved successfully!</span>
        </div>
      )}

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
        {visitInfo && (
          <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <p className="text-xs font-medium text-blue-400 uppercase mb-1">Chief Complaint</p>
            <p className="text-sm text-venus-text-primary">{visitInfo.chiefComplaint || 'N/A'}</p>
          </div>
        )}
        {vitals?.temperature && (
          <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
            <p className="text-xs font-medium text-green-400 uppercase mb-1">Vitals Summary</p>
            <p className="text-sm text-venus-text-primary">
              T: {vitals.temperature}°C | BP: {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} | P: {vitals.pulseRate}
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold text-venus-text-primary mb-4 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-venus-primary-400" />
          Diagnosis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Primary Diagnosis *
            </label>
            <input
              {...register('primaryDiagnosis')}
              type="text"
              className="input-field"
              placeholder="e.g., Hypertension"
            />
            {errors.primaryDiagnosis && (
              <p className="mt-1 text-xs text-venus-danger">{errors.primaryDiagnosis.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Secondary Diagnosis
            </label>
            <input
              {...register('secondaryDiagnosis')}
              type="text"
              className="input-field"
              placeholder="If applicable"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              ICD Code
            </label>
            <input
              {...register('icdCode')}
              type="text"
              className="input-field"
              placeholder="e.g., I10"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold text-venus-text-primary mb-4">Medical History</h4>
        <div className="space-y-4">
          {['presentIllness', 'pastMedicalHistory', 'surgicalHistory', 'familyHistory', 'socialHistory'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5 capitalize">
                {field.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <textarea
                {...register(field)}
                rows="2"
                className="input-field"
                placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}...`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold text-venus-text-primary mb-4">Physical Examination</h4>
        <textarea
          {...register('physicalExamination')}
          rows="4"
          className="input-field"
          placeholder="Detailed physical examination findings..."
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-venus-text-primary">Allergies</h4>
          <button
            type="button"
            onClick={() => appendAllergy({ name: '', reaction: '', severity: 'mild' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-venus-primary-500/20 text-venus-primary-400 hover:bg-venus-primary-500/30 rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Allergy
          </button>
        </div>
        {allergyFields.length === 0 ? (
          <p className="text-sm text-venus-text-muted">No allergies recorded</p>
        ) : (
          <div className="space-y-3">
            {allergyFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-venus-bg-tertiary rounded-lg border border-venus-border">
                <input
                  {...register(`allergies.${index}.name`)}
                  type="text"
                  placeholder="Allergy name"
                  className="input-field"
                />
                <input
                  {...register(`allergies.${index}.reaction`)}
                  type="text"
                  placeholder="Reaction"
                  className="input-field"
                />
                <div className="flex gap-2">
                  <select {...register(`allergies.${index}.severity`)} className="input-field flex-1">
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeAllergy(index)}
                    className="p-2 text-venus-danger hover:bg-venus-danger/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-venus-text-primary">Current Medications</h4>
          <button
            type="button"
            onClick={() => appendMed({ name: '', dosage: '', frequency: '' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-venus-primary-500/20 text-venus-primary-400 hover:bg-venus-primary-500/30 rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Medication
          </button>
        </div>
        {medFields.length === 0 ? (
          <p className="text-sm text-venus-text-muted">No medications recorded</p>
        ) : (
          <div className="space-y-3">
            {medFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-venus-bg-tertiary rounded-lg border border-venus-border">
                <input
                  {...register(`currentMedications.${index}.name`)}
                  type="text"
                  placeholder="Medication name"
                  className="input-field"
                />
                <input
                  {...register(`currentMedications.${index}.dosage`)}
                  type="text"
                  placeholder="Dosage"
                  className="input-field"
                />
                <div className="flex gap-2">
                  <input
                    {...register(`currentMedications.${index}.frequency`)}
                    type="text"
                    placeholder="Frequency"
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeMed(index)}
                    className="p-2 text-venus-danger hover:bg-venus-danger/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold text-venus-text-primary mb-4">Lab & Imaging Requests</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Laboratory Tests
            </label>
            <textarea
              {...register('labRequests')}
              rows="3"
              className="input-field"
              placeholder="e.g., Full Blood Count, Urinalysis..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Imaging Requests
            </label>
            <textarea
              {...register('imagingRequests')}
              rows="3"
              className="input-field"
              placeholder="e.g., Chest X-ray, Ultrasound..."
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold text-venus-text-primary mb-4">Treatment Plan</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Prescribed Medications & Instructions *
            </label>
            <textarea
              {...register('prescribedMedications')}
              rows="3"
              className="input-field"
              placeholder="Medication names, dosages, and instructions..."
            />
            {errors.prescribedMedications && (
              <p className="mt-1 text-xs text-venus-danger">{errors.prescribedMedications.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Procedures
            </label>
            <textarea
              {...register('procedures')}
              rows="2"
              className="input-field"
              placeholder="Any procedures recommended..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Doctor Instructions
            </label>
            <textarea
              {...register('doctorInstructions')}
              rows="2"
              className="input-field"
              placeholder="Special instructions for the patient..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Follow-up Instructions
            </label>
            <textarea
              {...register('followUpInstructions')}
              rows="2"
              className="input-field"
              placeholder="When to return, what to monitor, etc..."
            />
          </div>
        </div>
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
                Save Diagnosis
              </>
            )}
          </button>
          {initialData?.primaryDiagnosis && (
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

const SectionReadOnly = ({ title, icon: Icon, children }) => (
  <div className="card">
    <h4 className="text-sm font-semibold text-venus-text-primary mb-3 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-venus-primary-400" />}
      {title}
    </h4>
    {children}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="mb-2">
    <span className="text-xs font-medium text-venus-text-muted">{label}:</span>
    <p className="text-sm text-venus-text-primary whitespace-pre-wrap">{value}</p>
  </div>
);

export default DoctorDiagnosisForm;