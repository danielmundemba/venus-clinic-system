import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { medicalRecordSchema } from '../../utils/validators';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

const MedicalRecordForm = ({ onSubmit, loading, initialData }) => {
  const [allergies, setAllergies] = useState(initialData?.allergies || []);
  const [medications, setMedications] = useState(initialData?.currentMedications || []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: initialData || {
      allergies: [],
      currentMedications: [],
      visitType: 'outpatient',
      paymentStatus: 'pending',
    },
  });

  const addAllergy = () => {
    setAllergies([...allergies, { name: '', reaction: '', severity: 'mild' }]);
  };

  const removeAllergy = (index) => {
    const updated = allergies.filter((_, i) => i !== index);
    setAllergies(updated);
  };

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '' }]);
  };

  const removeMedication = (index) => {
    const updated = medications.filter((_, i) => i !== index);
    setMedications(updated);
  };

  const handleFormSubmit = (data) => {
    const finalData = {
      ...data,
      allergies,
      currentMedications: medications,
    };
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Visit Information Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4">Visit Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Visit Date *
            </label>
            <input
              {...register('visitDate')}
              type="date"
              className="input-field"
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
            />
            {errors.visitTime && (
              <p className="mt-1 text-xs text-venus-danger">{errors.visitTime.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Visit Type *
            </label>
            <select {...register('visitType')} className="input-field">
              <option value="outpatient">Outpatient</option>
              <option value="follow-up">Follow-up</option>
              <option value="emergency">Emergency</option>
              <option value="review">Review</option>
            </select>
            {errors.visitType && (
              <p className="mt-1 text-xs text-venus-danger">{errors.visitType.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Chief Complaint Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4">Chief Complaint</h3>
        <div>
          <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
            Patient Complaint / Reason for Visit *
          </label>
          <textarea
            {...register('chiefComplaint')}
            rows="3"
            className="input-field"
            placeholder="Describe the patient's chief complaint..."
          />
          {errors.chiefComplaint && (
            <p className="mt-1 text-xs text-venus-danger">{errors.chiefComplaint.message}</p>
          )}
        </div>
      </div>

      {/* Medical History Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4">Medical History</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              History of Present Illness
            </label>
            <textarea
              {...register('presentIllness')}
              rows="2"
              className="input-field"
              placeholder="Details about current illness..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Past Medical History
            </label>
            <textarea
              {...register('pastMedicalHistory')}
              rows="2"
              className="input-field"
              placeholder="Previous illnesses, conditions..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Surgical History
            </label>
            <textarea
              {...register('surgicalHistory')}
              rows="2"
              className="input-field"
              placeholder="Previous surgeries..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Family History
            </label>
            <textarea
              {...register('familyHistory')}
              rows="2"
              className="input-field"
              placeholder="Family medical history..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Social History
            </label>
            <textarea
              {...register('socialHistory')}
              rows="2"
              className="input-field"
              placeholder="Occupation, lifestyle, habits..."
            />
          </div>
        </div>
      </div>

      {/* Allergies Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-venus-text-primary">Allergies</h3>
          <button
            type="button"
            onClick={addAllergy}
            className="flex items-center gap-2 px-3 py-1 bg-venus-primary-500/20 text-venus-primary-400 hover:bg-venus-primary-500/30 rounded transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Allergy
          </button>
        </div>

        <div className="space-y-3">
          {allergies.length === 0 ? (
            <p className="text-sm text-venus-text-muted">No allergies recorded</p>
          ) : (
            allergies.map((allergy, index) => (
              <div key={index} className="p-3 bg-venus-bg-tertiary rounded border border-venus-border space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Allergy name"
                    value={allergy.name}
                    onChange={(e) => {
                      const updated = [...allergies];
                      updated[index].name = e.target.value;
                      setAllergies(updated);
                    }}
                    className="input-field"
                  />
                  <input
                    type="text"
                    placeholder="Reaction"
                    value={allergy.reaction}
                    onChange={(e) => {
                      const updated = [...allergies];
                      updated[index].reaction = e.target.value;
                      setAllergies(updated);
                    }}
                    className="input-field"
                  />
                  <div className="flex gap-2">
                    <select
                      value={allergy.severity}
                      onChange={(e) => {
                        const updated = [...allergies];
                        updated[index].severity = e.target.value;
                        setAllergies(updated);
                      }}
                      className="input-field flex-1"
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAllergy(index)}
                      className="p-2 text-venus-danger hover:bg-venus-danger/10 rounded transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Current Medications Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-venus-text-primary">Current Medications</h3>
          <button
            type="button"
            onClick={addMedication}
            className="flex items-center gap-2 px-3 py-1 bg-venus-primary-500/20 text-venus-primary-400 hover:bg-venus-primary-500/30 rounded transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Medication
          </button>
        </div>

        <div className="space-y-3">
          {medications.length === 0 ? (
            <p className="text-sm text-venus-text-muted">No medications recorded</p>
          ) : (
            medications.map((med, index) => (
              <div key={index} className="p-3 bg-venus-bg-tertiary rounded border border-venus-border space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Medication name"
                    value={med.name}
                    onChange={(e) => {
                      const updated = [...medications];
                      updated[index].name = e.target.value;
                      setMedications(updated);
                    }}
                    className="input-field"
                  />
                  <input
                    type="text"
                    placeholder="Dosage"
                    value={med.dosage}
                    onChange={(e) => {
                      const updated = [...medications];
                      updated[index].dosage = e.target.value;
                      setMedications(updated);
                    }}
                    className="input-field"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Frequency"
                      value={med.frequency}
                      onChange={(e) => {
                        const updated = [...medications];
                        updated[index].frequency = e.target.value;
                        setMedications(updated);
                      }}
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="p-2 text-venus-danger hover:bg-venus-danger/10 rounded transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Vital Signs Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4">Vital Signs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Temperature (°C)
            </label>
            <input
              {...register('temperature')}
              type="text"
              className="input-field"
              placeholder="36.5"
            />
            {errors.temperature && (
              <p className="mt-1 text-xs text-venus-danger">{errors.temperature.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              BP Systolic (mmHg)
            </label>
            <input
              {...register('bloodPressureSystolic')}
              type="text"
              className="input-field"
              placeholder="120"
            />
            {errors.bloodPressureSystolic && (
              <p className="mt-1 text-xs text-venus-danger">{errors.bloodPressureSystolic.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              BP Diastolic (mmHg)
            </label>
            <input
              {...register('bloodPressureDiastolic')}
              type="text"
              className="input-field"
              placeholder="80"
            />
            {errors.bloodPressureDiastolic && (
              <p className="mt-1 text-xs text-venus-danger">{errors.bloodPressureDiastolic.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Pulse Rate (bpm)
            </label>
            <input
              {...register('pulseRate')}
              type="text"
              className="input-field"
              placeholder="72"
            />
            {errors.pulseRate && (
              <p className="mt-1 text-xs text-venus-danger">{errors.pulseRate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Respiratory Rate (breaths/min)
            </label>
            <input
              {...register('respiratoryRate')}
              type="text"
              className="input-field"
              placeholder="16"
            />
            {errors.respiratoryRate && (
              <p className="mt-1 text-xs text-venus-danger">{errors.respiratoryRate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Oxygen Saturation (%)
            </label>
            <input
              {...register('oxygenSaturation')}
              type="text"
              className="input-field"
              placeholder="98"
            />
            {errors.oxygenSaturation && (
              <p className="mt-1 text-xs text-venus-danger">{errors.oxygenSaturation.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Weight (kg)
            </label>
            <input
              {...register('weight')}
              type="text"
              className="input-field"
              placeholder="70"
            />
            {errors.weight && (
              <p className="mt-1 text-xs text-venus-danger">{errors.weight.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Height (cm)
            </label>
            <input
              {...register('height')}
              type="text"
              className="input-field"
              placeholder="175"
            />
            {errors.height && (
              <p className="mt-1 text-xs text-venus-danger">{errors.height.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Physical Examination Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4">Physical Examination</h3>
        <textarea
          {...register('physicalExamination')}
          rows="4"
          className="input-field"
          placeholder="Detailed physical examination findings..."
        />
      </div>

      {/* Diagnosis Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4">Diagnosis</h3>
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

      {/* Lab & Imaging Requests Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4">Lab & Imaging Requests</h3>
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

      {/* Treatment Plan Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4">Treatment Plan</h3>
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

      {/* Payment Information Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Consultation Fee (K)
            </label>
            <input
              {...register('consultationFee')}
              type="text"
              className="input-field"
              placeholder="0.00"
            />
            {errors.consultationFee && (
              <p className="mt-1 text-xs text-venus-danger">{errors.consultationFee.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Laboratory Fee (K)
            </label>
            <input
              {...register('laboratoryFee')}
              type="text"
              className="input-field"
              placeholder="0.00"
            />
            {errors.laboratoryFee && (
              <p className="mt-1 text-xs text-venus-danger">{errors.laboratoryFee.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Medication Fee (K)
            </label>
            <input
              {...register('medicationFee')}
              type="text"
              className="input-field"
              placeholder="0.00"
            />
            {errors.medicationFee && (
              <p className="mt-1 text-xs text-venus-danger">{errors.medicationFee.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Other Charges (K)
            </label>
            <input
              {...register('otherCharges')}
              type="text"
              className="input-field"
              placeholder="0.00"
            />
            {errors.otherCharges && (
              <p className="mt-1 text-xs text-venus-danger">{errors.otherCharges.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
              Payment Status *
            </label>
            <select {...register('paymentStatus')} className="input-field">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="insurance">Insurance</option>
            </select>
            {errors.paymentStatus && (
              <p className="mt-1 text-xs text-venus-danger">{errors.paymentStatus.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Saving Medical Record...
          </>
        ) : (
          'Save Medical Record'
        )}
      </button>
    </form>
  );
};

export default MedicalRecordForm;
