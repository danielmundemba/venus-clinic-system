import { useState, useEffect, useCallback } from 'react';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatTimestamp } from '../../utils/formatters';
import ReceptionistVisitForm from './ReceptionistVisitForm';
import NurseVitalsForm from './NurseVitalsForm';
import DoctorDiagnosisForm from './DoctorDiagnosisForm';
import BillingServicesForm from './BillingServicesForm';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Activity, 
  Stethoscope,
  FileText,
  CreditCard,
  Loader2
} from 'lucide-react';

const VisitDetail = ({ patient, recordId, onBack }) => {
  const [record, setRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('visit');
  const { getRecord, loading } = useMedicalRecords(patient.id);
  const { user } = useAuth();

  const userRole = user?.role || 'doctor';

  const loadRecord = useCallback(async () => {
    try {
      const data = await getRecord(recordId);
      setRecord(data);
    } catch (err) {
      console.error('Failed to load record:', err);
    }
  }, [getRecord, recordId]);

  useEffect(() => {
    if (!recordId) return;

    const timeoutId = window.setTimeout(() => {
      void loadRecord();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [recordId, loadRecord]);

  const handleUpdate = async () => {
    await loadRecord();
  };

  // Determine which tabs are visible based on role
  const getVisibleTabs = () => {
    const tabs = [];

    // Visit info - visible to all
    tabs.push({ id: 'visit', label: 'Visit Info', icon: FileText });

    // Vitals - visible to nurse, doctor, admin
    if (userRole === 'nurse' || userRole === 'doctor' || userRole === 'admin') {
      tabs.push({ id: 'vitals', label: 'Vitals', icon: Activity });
    }

    // Diagnosis - visible to doctor and admin
    if (userRole === 'doctor' || userRole === 'admin') {
      tabs.push({ id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope });
    }

    // Billing - visible to doctor, receptionist, admin
    if (userRole === 'doctor' || userRole === 'receptionist' || userRole === 'admin') {
      tabs.push({ id: 'billing', label: 'Billing', icon: CreditCard });
    }

    return tabs;
  };

  const getDefaultTab = (role, status) => {
    if (role === 'receptionist') return 'visit';
    if (role === 'nurse') return 'vitals';
    if (role === 'doctor') {
      if (status === 'checked-in') return 'visit';
      return 'diagnosis';
    }
    return 'visit';
  };

  if (loading || !record) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-venus-primary-400 animate-spin" />
      </div>
    );
  }

  const visitInfo = record.visitInfo || {};
  const vitals = record.vitals || {};
  const diagnosis = record.diagnosis || {};
  const visibleTabs = getVisibleTabs();
  const resolvedActiveTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : getDefaultTab(userRole, record?.status);

  const statusColors = {
    'checked-in': 'bg-blue-500/10 text-blue-400',
    'vitals-done': 'bg-yellow-500/10 text-yellow-400',
    'diagnosed': 'bg-purple-500/10 text-purple-400',
    'billing': 'bg-orange-500/10 text-orange-400',
    'completed': 'bg-green-500/10 text-green-400'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-venus-text-secondary hover:text-venus-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Visits
        </button>
        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[record.status] || 'bg-gray-500/10 text-gray-400'}`}>
          {record.status?.replace('-', ' ')}
        </span>
      </div>

      {/* Patient & Visit Summary */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-venus-text-primary">
              {patient.firstName} {patient.lastName}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-venus-text-secondary">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {visitInfo.visitDate ? formatDate(visitInfo.visitDate) : 'No date'}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {visitInfo.visitTime || 'No time'}
              </span>
              <span className="capitalize">{visitInfo.visitType}</span>
            </div>
          </div>
          <div className="text-right text-sm text-venus-text-muted">
            <p>Visit ID: {record.id.slice(-8)}</p>
            <p>Created: {record.createdAt ? formatTimestamp(record.createdAt) : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="text-sm font-medium text-venus-text-secondary mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Chief Complaint
          </h4>
          <p className="text-sm text-venus-text-primary">
            {visitInfo.chiefComplaint || 'Not recorded'}
          </p>
        </div>

        {(vitals.temperature || userRole === 'nurse') && (
          <div className="card">
            <h4 className="text-sm font-medium text-venus-text-secondary mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Latest Vitals
            </h4>
            {vitals.temperature ? (
              <div className="text-sm text-venus-text-primary space-y-1">
                <p>Temp: {vitals.temperature}°C</p>
                <p>BP: {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} mmHg</p>
                <p>Pulse: {vitals.pulseRate} bpm</p>
              </div>
            ) : (
              <p className="text-sm text-venus-text-muted">Not recorded yet</p>
            )}
          </div>
        )}

        {(diagnosis.primaryDiagnosis || userRole === 'doctor') && (
          <div className="card">
            <h4 className="text-sm font-medium text-venus-text-secondary mb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Diagnosis
            </h4>
            {diagnosis.primaryDiagnosis ? (
              <div className="text-sm text-venus-text-primary">
                <p className="font-medium">{diagnosis.primaryDiagnosis}</p>
                {diagnosis.icdCode && (
                  <p className="text-venus-text-muted">ICD: {diagnosis.icdCode}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-venus-text-muted">Not diagnosed yet</p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-venus-border">
        <div className="flex gap-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  resolvedActiveTab === tab.id
                    ? 'border-venus-primary-400 text-venus-primary-400'
                    : 'border-transparent text-venus-text-secondary hover:text-venus-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {resolvedActiveTab === 'visit' && (
          <ReceptionistVisitForm
            patientId={patient.id}
            recordId={recordId}
            initialData={visitInfo}
            readOnly={userRole !== 'receptionist' && userRole !== 'admin'}
            onUpdate={handleUpdate}
          />
        )}

        {resolvedActiveTab === 'vitals' && (
          <NurseVitalsForm
            patientId={patient.id}
            recordId={recordId}
            initialData={vitals}
            readOnly={userRole !== 'nurse' && userRole !== 'admin'}
            visitInfo={visitInfo}
            onUpdate={handleUpdate}
          />
        )}

        {resolvedActiveTab === 'diagnosis' && (
          <DoctorDiagnosisForm
            patientId={patient.id}
            recordId={recordId}
            initialData={diagnosis}
            readOnly={userRole !== 'doctor' && userRole !== 'admin'}
            vitals={vitals}
            visitInfo={visitInfo}
            onUpdate={handleUpdate}
          />
        )}

        {resolvedActiveTab === 'billing' && (
          <BillingServicesForm
            patientId={patient.id}
            recordId={recordId}
            billing={record.billing || []}
            onUpdate={handleUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default VisitDetail;