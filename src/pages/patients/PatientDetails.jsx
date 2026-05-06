import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirestore } from '../../hooks/useFirestore';
import { formatDate, calculateAge, formatPhone } from '../../utils/formatters';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText,
  Activity
} from 'lucide-react';

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, loading } = useFirestore('patients');
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    loadPatient();
  }, [id]);

  const loadPatient = async () => {
    try {
      const data = await get(id);
      if (data) {
        setPatient(data);
      } else {
        navigate('/patients');
      }
    } catch (error) {
      console.error('Failed to load patient:', error);
      navigate('/patients');
    }
  };

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-venus-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center gap-2 text-venus-text-muted hover:text-venus-text-primary transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Patients
      </button>

      {/* Header Card */}
      <div className="card">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-venus-primary-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10 text-venus-primary-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-venus-text-primary">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-venus-text-muted mt-1">
              Patient ID: {patient.id} • Registered {formatDate(patient.createdAt)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 bg-venus-primary-500/10 text-venus-primary-400 text-sm rounded-full border border-venus-primary-500/20">
                {calculateAge(patient.DOB)} years old
              </span>
              <span className="px-3 py-1 bg-venus-bg-tertiary text-venus-text-secondary text-sm rounded-full border border-venus-border capitalize">
                {patient.gender}
              </span>
              {patient.nrcNumber && (
                <span className="px-3 py-1 bg-venus-bg-tertiary text-venus-text-secondary text-sm rounded-full border border-venus-border font-mono">
                  NRC: {patient.nrcNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="card">
          <h3 className="text-lg font-semibold text-venus-text-primary mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-venus-primary-400" />
            Contact Information
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-venus-text-muted" />
              <div>
                <p className="text-sm text-venus-text-muted">Phone</p>
                <p className="text-venus-text-primary">{formatPhone(patient.phone)}</p>
              </div>
            </div>
            {patient.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-venus-text-muted" />
                <div>
                  <p className="text-sm text-venus-text-muted">Email</p>
                  <p className="text-venus-text-primary">{patient.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-venus-text-muted" />
              <div>
                <p className="text-sm text-venus-text-muted">Address</p>
                <p className="text-venus-text-primary">{patient.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="card">
          <h3 className="text-lg font-semibold text-venus-text-primary mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-venus-primary-400" />
            Personal Details
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-venus-text-muted" />
              <div>
                <p className="text-sm text-venus-text-muted">Date of Birth</p>
                <p className="text-venus-text-primary">{patient.DOB}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-venus-text-muted" />
              <div>
                <p className="text-sm text-venus-text-muted">Age</p>
                <p className="text-venus-text-primary">{calculateAge(patient.DOB)} years</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-venus-text-muted" />
              <div>
                <p className="text-sm text-venus-text-muted">Gender</p>
                <p className="text-venus-text-primary capitalize">{patient.gender}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      {(patient.emergencyContactName || patient.emergencyContactPhone) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-venus-text-primary mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-venus-warning" />
            Emergency Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patient.emergencyContactName && (
              <div>
                <p className="text-sm text-venus-text-muted">Name</p>
                <p className="text-venus-text-primary">{patient.emergencyContactName}</p>
              </div>
            )}
            {patient.emergencyContactPhone && (
              <div>
                <p className="text-sm text-venus-text-muted">Phone</p>
                <p className="text-venus-text-primary">{patient.emergencyContactPhone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="btn-primary flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Create Medical Record
        </button>
        <button className="btn-secondary flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Schedule Appointment
        </button>
      </div>
    </div>
  );
};

export default PatientDetails;