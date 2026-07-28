import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createMedicalRecord } from '../../firebase/db';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/common/SearchBar';
import { formatDate } from '../../utils/formatters';
import { 
  ClipboardList, 
  User, 
  Calendar, 
  Clock,
  Save,
  Loader2,
  ArrowLeft,
  Search,
  CheckCircle2
} from 'lucide-react';

const visitSchema = z.object({
  notes: z.string().optional(),
});

const CreateMedicalRecord = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(visitSchema),
  });

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
  };

  const onSubmit = async (data) => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const result = await createMedicalRecord(selectedPatient.id, {
        visitDate: formatDate(now),
        visitTime: now.toTimeString().slice(0, 5),
        notes: data.notes || '',
        checkedInBy: user?.displayName || user?.email,
      });

      setSuccess(true);
      reset();
      setSelectedPatient(null);

      setTimeout(() => {
        navigate(`/medical-records/${selectedPatient.id}/${result.id}`);
      }, 1500);
    } catch (error) {
      console.error('Failed to create visit:', error);
      alert('Failed to create visit: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/medical-records')}
        className="flex items-center gap-2 text-venus-text-muted hover:text-venus-text-primary transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Back to Medical Records
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">New Patient Visit</h1>
          <p className="text-venus-text-muted mt-1">Check in a patient for a new visit</p>
        </div>
      </div>

      {success && (
        <div className="card bg-venus-success/5 border-venus-success/20 text-venus-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Visit created successfully! Redirecting...</span>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-venus-primary-400" />
          Select Patient
        </h3>

        {!selectedPatient ? (
          <SearchBar onSelect={handlePatientSelect} placeholder="Search by name, phone, or email..." />
        ) : (
          <div className="flex items-center justify-between bg-venus-bg-tertiary rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-venus-primary-400" />
              </div>
              <div>
                <p className="font-medium text-venus-text-primary">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p className="text-sm text-venus-text-muted">{selectedPatient.email} • {selectedPatient.phone}</p>
              </div>
            </div>
            <button onClick={() => setSelectedPatient(null)}
              className="text-sm text-venus-danger hover:underline">Change</button>
          </div>
        )}
      </div>

      {selectedPatient && (
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <h3 className="text-lg font-semibold text-venus-text-primary flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-venus-primary-400" />
            Visit Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-venus-bg-tertiary rounded-lg p-3">
              <Calendar className="w-5 h-5 text-venus-text-muted" />
              <div>
                <p className="text-xs text-venus-text-muted">Visit Date</p>
                <p className="text-sm font-medium text-venus-text-primary">{formatDate(new Date())}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-venus-bg-tertiary rounded-lg p-3">
              <Clock className="w-5 h-5 text-venus-text-muted" />
              <div>
                <p className="text-xs text-venus-text-muted">Visit Time</p>
                <p className="text-sm font-medium text-venus-text-primary">{new Date().toTimeString().slice(0, 5)}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">Reception Notes</label>
            <textarea {...register('notes')} rows={3}
              className="input-field resize-none"
              placeholder="Reason for visit, initial observations, etc." />
          </div>

          <button type="submit" disabled={submitting}
            className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Check In Patient
          </button>
        </form>
      )}
    </div>
  );
};

export default CreateMedicalRecord;