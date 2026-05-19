import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import { useAuditLog } from '../../hooks/useAuditLog';
import Modal from '../../components/common/Modal';
import PatientSelector from '../../components/medical-records/PatientSelector';
import MedicalRecordForm from '../../components/medical-records/MedicalRecordForm';
import { formatDate, calculateAge } from '../../utils/formatters';
import { ArrowLeft, User, AlertCircle } from 'lucide-react';

const CreateMedicalRecord = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRecord } = useMedicalRecords();
  const { logAction } = useAuditLog();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientSelector, setShowPatientSelector] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setShowPatientSelector(false);
  };

  const handleFormSubmit = async (formData) => {
    setSubmitting(true);
    setError('');
    try {
      const recordData = {
        ...formData,
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        patientEmail: selectedPatient.email,
        patientPhone: selectedPatient.phone,
        patientAge: calculateAge(selectedPatient.DOB),
        patientGender: selectedPatient.gender,
        doctorId: user?.uid,
        doctorName: user?.displayName,
      };

      const docRef = await createRecord(recordData);

      await logAction('create', 'medicalRecord', docRef.id, {
        patientName: recordData.patientName,
        diagnosis: recordData.primaryDiagnosis,
      });

      setSubmitting(false);
      navigate(`/medical-records/${docRef.id}`, {
        state: { success: true, message: 'Medical record created successfully!' }
      });
    } catch (err) {
      console.error('Failed to create medical record:', err);
      setError(err.message || 'Failed to create medical record. Please try again.');
      setSubmitting(false);
    }
  };

  if (!selectedPatient) {
    return (
      <Modal
        isOpen={showPatientSelector}
        onClose={() => navigate('/medical-records')}
        title="Select Patient"
      >
        <PatientSelector
          onSelect={handlePatientSelect}
          onClose={() => navigate('/medical-records')}
        />
      </Modal>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => {
          setSelectedPatient(null);
          setShowPatientSelector(true);
        }}
        className="flex items-center gap-2 text-venus-text-muted hover:text-venus-text-primary transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Change Patient
      </button>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-venus-danger/10 border border-venus-danger/30 rounded-lg text-venus-danger flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Patient Info Card */}
      <div className="card">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 bg-venus-primary-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-venus-primary-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-venus-text-primary">
              {selectedPatient.firstName} {selectedPatient.lastName}
            </h1>
            <p className="text-venus-text-muted mt-1">
              Patient ID: {selectedPatient.id}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 bg-venus-primary-500/10 text-venus-primary-400 text-sm rounded-full border border-venus-primary-500/20">
                {calculateAge(selectedPatient.DOB)} years old
              </span>
              <span className="px-3 py-1 bg-venus-bg-tertiary text-venus-text-secondary text-sm rounded-full border border-venus-border capitalize">
                {selectedPatient.gender}
              </span>
              {selectedPatient.nrcNumber && (
                <span className="px-3 py-1 bg-venus-bg-tertiary text-venus-text-secondary text-sm rounded-full border border-venus-border font-mono">
                  NRC: {selectedPatient.nrcNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Medical Record Form */}
      <MedicalRecordForm
        onSubmit={handleFormSubmit}
        loading={submitting}
      />
    </div>
  );
};

export default CreateMedicalRecord;
