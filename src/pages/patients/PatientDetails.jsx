import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getPatientInfo } from '../../firebase/db';
import { formatDate, calculateAge, formatPhone } from '../../utils/formatters';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText,
  Activity,
  Shield,
  Loader2,
  HeartPulse,
  CheckCircle2,
  XCircle,
  Contact,
  Stethoscope,
  Pill
} from 'lucide-react';

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatient();
  }, [id]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', id);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        navigate('/patients');
        return;
      }

      const userData = { id: userDoc.id, ...userDoc.data() };
      setPatient(userData);

      const info = await getPatientInfo(id);
      setPatientInfo(info);
    } catch (error) {
      console.error('Failed to load patient:', error);
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin w-8 h-8 text-violet-500" />
      </div>
    );
  }

  const displayDOB = patientInfo?.DOB || patient.DOB;
  const displayGender = patientInfo?.gender || patient.gender;
  const displayAge = displayDOB ? calculateAge(displayDOB) : null;
  const displayAddress = patientInfo?.address || patient.address;
  const displayNRC = patientInfo?.nrcNumber || patient.nrcNumber;
  const displayEmergencyName = patientInfo?.emergencyContactName || patient.emergencyContactName;
  const displayEmergencyPhone = patientInfo?.emergencyContactPhone || patient.emergencyContactPhone;

  const isStaffPatient = patient.isStaff === true;

  const staffRoleConfig = {
    admin: { label: 'Admin', icon: Shield, color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
    doctor: { label: 'Doctor', icon: Stethoscope, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    receptionist: { label: 'Receptionist', icon: Phone, color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    pharmacist: { label: 'Pharmacist', icon: Pill, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    nurse: { label: 'Nurse', icon: HeartPulse, color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'P';
  };

  const roleCfg = isStaffPatient ? staffRoleConfig[patient.role] : null;
  const RoleIcon = roleCfg?.icon;

  return (
    <div className="space-y-6">
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
          <div className="w-20 h-20 rounded-2xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-violet-400">
              {getInitials(patient.firstName, patient.lastName)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-venus-text-primary">
                {patient.firstName} {patient.lastName}
              </h1>
              {isStaffPatient && roleCfg && (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleCfg.color}`}>
                  <RoleIcon className="w-3.5 h-3.5" />
                  {roleCfg.label}
                </div>
              )}
            </div>
            <p className="text-venus-text-muted mt-1">
              Patient ID: {patient.id} • Registered {formatDate(patient.createdAt)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {displayAge !== null && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-sky-500/15 text-sky-400 border-sky-500/30">
                  <Calendar className="w-3.5 h-3.5" />
                  {displayAge} years old
                </span>
              )}
              {displayGender && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-violet-500/15 text-violet-400 border-violet-500/30 capitalize">
                  <User className="w-3.5 h-3.5" />
                  {displayGender}
                </span>
              )}
              {displayNRC && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-slate-500/15 text-slate-400 border-slate-500/30 font-mono">
                  <Contact className="w-3.5 h-3.5" />
                  NRC: {displayNRC}
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                patient.isActive !== false
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-red-500/15 text-red-400 border-red-500/30'
              }`}>
                {patient.isActive !== false ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    Inactive
                  </>
                )}
              </span>
              {isStaffPatient && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-amber-500/15 text-amber-400 border-amber-500/30">
                  <Shield className="w-3.5 h-3.5" />
                  Also Staff
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-venus-text-primary mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-violet-400" />
            Contact Information
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Phone className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-venus-text-muted">Phone</p>
                <p className="text-sm font-medium text-venus-text-primary">{formatPhone(patient.phone) || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Mail className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-venus-text-muted">Email (Login)</p>
                <p className="text-sm font-medium text-venus-text-primary">{patient.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <MapPin className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-venus-text-muted">Address</p>
                <p className="text-sm font-medium text-venus-text-primary">{displayAddress || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-venus-text-primary mb-4 flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-400" />
            Personal Details
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <Calendar className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-venus-text-muted">Date of Birth</p>
                <p className="text-sm font-medium text-venus-text-primary">{displayDOB || 'N/A'}</p>
              </div>
            </div>
            {displayAge !== null && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <Activity className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <p className="text-sm text-venus-text-muted">Age</p>
                  <p className="text-sm font-medium text-venus-text-primary">{displayAge} years</p>
                </div>
              </div>
            )}
            {displayGender && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <User className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <p className="text-sm text-venus-text-muted">Gender</p>
                  <p className="text-sm font-medium text-venus-text-primary capitalize">{displayGender}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-venus-text-primary mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Account Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-venus-bg-tertiary rounded-lg">
            <p className="text-xs text-venus-text-muted mb-1">System Role</p>
            <p className="text-sm font-medium text-venus-text-primary capitalize">
              {isStaffPatient ? `${patient.role} (Staff)` : 'Patient'}
            </p>
          </div>
          <div className="p-3 bg-venus-bg-tertiary rounded-lg">
            <p className="text-xs text-venus-text-muted mb-1">Auth UID</p>
            <p className="text-sm font-medium text-venus-text-primary font-mono">{patient.id}</p>
          </div>
          <div className="p-3 bg-venus-bg-tertiary rounded-lg">
            <p className="text-xs text-venus-text-muted mb-1">Account Status</p>
            <p className={`text-sm font-medium ${patient.isActive !== false ? 'text-emerald-400' : 'text-red-400'}`}>
              {patient.isActive !== false ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      {(displayEmergencyName || displayEmergencyPhone) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-venus-text-primary mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            Emergency Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayEmergencyName && (
              <div className="p-3 bg-venus-bg-tertiary rounded-lg">
                <p className="text-xs text-venus-text-muted mb-1">Name</p>
                <p className="text-sm font-medium text-venus-text-primary">{displayEmergencyName}</p>
              </div>
            )}
            {displayEmergencyPhone && (
              <div className="p-3 bg-venus-bg-tertiary rounded-lg">
                <p className="text-xs text-venus-text-muted mb-1">Phone</p>
                <p className="text-sm font-medium text-venus-text-primary">{displayEmergencyPhone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm">
          <FileText className="w-5 h-5" />
          Create Medical Record
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-venus-border text-venus-text-primary rounded-lg text-sm font-medium hover:bg-venus-bg-elevated transition-all">
          <Calendar className="w-5 h-5" />
          Schedule Appointment
        </button>
      </div>
    </div>
  );
};

export default PatientDetails;