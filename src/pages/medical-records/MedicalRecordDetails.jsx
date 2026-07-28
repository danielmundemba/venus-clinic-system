import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { getMedicalRecord, sendToNurse, updateVitals, updateDoctorDiagnosis, updatePharmacy, completeBilling } from '../../firebase/db';
import { formatDate } from '../../utils/formatters';
import { DOCTOR_SERVICES, PHARMACY_SERVICES } from '../../constants/services';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock,
  Stethoscope,
  Thermometer,
  Weight,
  Heart,
  Activity,
  Pill,
  CreditCard,
  CheckCircle2,
  Save,
  Loader2,
  AlertCircle,
  ClipboardList,
  ChevronRight,
  Minus,
  Send
} from 'lucide-react';

const statusConfig = {
  reception: { label: 'Reception', color: 'bg-amber-500/10 text-amber-500', step: 1 },
  nurse: { label: 'Nurse / Vitals', color: 'bg-blue-500/10 text-blue-500', step: 2 },
  doctor: { label: 'Doctor / Diagnosis', color: 'bg-purple-500/10 text-purple-500', step: 3 },
  pharmacy: { label: 'Pharmacy', color: 'bg-green-500/10 text-green-500', step: 4 },
  billing: { label: 'Billing', color: 'bg-orange-500/10 text-orange-500', step: 5 },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-500', step: 6 },
};

const emptyMedication = { name: '', dosage: '', quantity: '', instructions: '', price: '' };

const MedicalRecordDetails = () => {
  const { patientId, recordId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [record, setRecord] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [vitalsForm, setVitalsForm] = useState({
    temperature: '', weight: '', height: '', bloodPressure: '', pulse: '', spo2: '', notes: ''
  });
  const [doctorForm, setDoctorForm] = useState({
    diagnosis: '', symptoms: '', notesForNextVisit: '', selectedServices: [], sendToPharmacy: true
  });
  const [pharmacyForm, setPharmacyForm] = useState({
    medications: [{ ...emptyMedication }], selectedServices: []
  });
  const [billingForm, setBillingForm] = useState({
    servicesTotal: 0, medicationsTotal: 0, totalAmount: 0, paid: false, paymentMethod: ''
  });

  useEffect(() => {
    loadData();
  }, [patientId, recordId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const patientDoc = await getDoc(doc(db, 'users', patientId));
      if (patientDoc.exists()) {
        setPatient({ id: patientDoc.id, ...patientDoc.data() });
      }

      const recordData = await getMedicalRecord(patientId, recordId);
      if (recordData) {
        setRecord(recordData);

        if (recordData.vitals) {
          setVitalsForm({
            temperature: recordData.vitals.temperature || '',
            weight: recordData.vitals.weight || '',
            height: recordData.vitals.height || '',
            bloodPressure: recordData.vitals.bloodPressure || '',
            pulse: recordData.vitals.pulse || '',
            spo2: recordData.vitals.spo2 || '',
            notes: recordData.vitals.notes || '',
          });
        }
        if (recordData.doctor) {
          setDoctorForm({
            diagnosis: recordData.doctor.diagnosis || '',
            symptoms: recordData.doctor.symptoms || '',
            notesForNextVisit: recordData.doctor.notesForNextVisit || '',
            selectedServices: recordData.doctor.services || [],
            sendToPharmacy: recordData.doctor.sendToPharmacy !== false,
          });
        }
        if (recordData.pharmacy) {
          setPharmacyForm({
            medications: recordData.pharmacy.medications?.length ? recordData.pharmacy.medications : [{ ...emptyMedication }],
            selectedServices: recordData.pharmacy.services || [],
          });
        }
        if (recordData.billing) {
          setBillingForm({
            servicesTotal: recordData.billing.servicesTotal || 0,
            medicationsTotal: recordData.billing.medicationsTotal || 0,
            totalAmount: recordData.billing.totalAmount || 0,
            paid: recordData.billing.paid || false,
            paymentMethod: recordData.billing.paymentMethod || '',
          });
        } else if (recordData.status === 'billing') {
          // Pre-fill the totals as soon as the visit reaches billing.
          calculateTotals(recordData);
        }
      } else {
        setError('Medical record not found');
      }
    } catch (err) {
      console.error('Failed to load record:', err);
      setError('Failed to load medical record');
    } finally {
      setLoading(false);
    }
  };

  const canEditStage = (stage) => {
    const roleStages = {
      receptionist: ['reception', 'billing'],
      nurse: ['nurse'],
      doctor: ['doctor'],
      pharmacist: ['pharmacy'],
      admin: Object.keys(statusConfig),
    };
    return roleStages[userRole]?.includes(stage);
  };

  const isStageActive = (stage) => record?.status === stage;
  const isStageComplete = (stage) => {
    const steps = ['reception', 'nurse', 'doctor', 'pharmacy', 'billing', 'completed'];
    const currentIdx = steps.indexOf(record?.status);
    const stageIdx = steps.indexOf(stage);
    return stageIdx < currentIdx;
  };
  // Pharmacy is skipped when the doctor didn't send the patient there.
  const isStageSkipped = (stage) => stage === 'pharmacy' && record?.doctor && record.doctor.sendToPharmacy === false;

  const handleSendToNurse = async () => {
    setSaving(true);
    try {
      await sendToNurse(patientId, recordId);
      await loadData();
    } catch (err) {
      alert('Failed to send to nurse: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVitals = async () => {
    setSaving(true);
    try {
      await updateVitals(patientId, recordId, {
        ...vitalsForm,
        recordedBy: user?.displayName || user?.email,
      });
      await loadData();
    } catch (err) {
      alert('Failed to save vitals: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDoctorService = (service) => {
    setDoctorForm(prev => {
      const exists = prev.selectedServices.some(s => s.id === service.id);
      return {
        ...prev,
        selectedServices: exists
          ? prev.selectedServices.filter(s => s.id !== service.id)
          : [...prev.selectedServices, service],
      };
    });
  };

  const handleSaveDoctor = async () => {
    setSaving(true);
    try {
      await updateDoctorDiagnosis(patientId, recordId, {
        diagnosis: doctorForm.diagnosis,
        symptoms: doctorForm.symptoms,
        notesForNextVisit: doctorForm.notesForNextVisit,
        services: doctorForm.selectedServices,
        sendToPharmacy: doctorForm.sendToPharmacy,
        recordedBy: user?.displayName || user?.email,
      });
      await loadData();
    } catch (err) {
      alert('Failed to save diagnosis: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePharmacyService = (service) => {
    setPharmacyForm(prev => {
      const exists = prev.selectedServices.some(s => s.id === service.id);
      return {
        ...prev,
        selectedServices: exists
          ? prev.selectedServices.filter(s => s.id !== service.id)
          : [...prev.selectedServices, service],
      };
    });
  };

  const handleSavePharmacy = async () => {
    setSaving(true);
    try {
      await updatePharmacy(patientId, recordId, {
        medications: pharmacyForm.medications.filter(m => m.name.trim()),
        services: pharmacyForm.selectedServices,
        dispensedBy: user?.displayName || user?.email,
      });
      await loadData();
    } catch (err) {
      alert('Failed to save pharmacy data: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteBilling = async () => {
    setSaving(true);
    try {
      await completeBilling(patientId, recordId, {
        ...billingForm,
        billedBy: user?.displayName || user?.email,
      });
      await loadData();
    } catch (err) {
      alert('Failed to complete billing: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addMedication = () => {
    setPharmacyForm(prev => ({
      ...prev,
      medications: [...prev.medications, { ...emptyMedication }]
    }));
  };

  const removeMedication = (idx) => {
    setPharmacyForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== idx)
    }));
  };

  const updateMedication = (idx, field, value) => {
    setPharmacyForm(prev => ({
      ...prev,
      medications: prev.medications.map((m, i) => i === idx ? { ...m, [field]: value } : m)
    }));
  };

  // Rolls up every fee ticked at each stage (vitals fee, doctor services,
  // pharmacy services) plus medication prices into the billing totals.
  // Pass a record explicitly when calling right after a fresh load, since
  // component state won't have updated yet.
  const calculateTotals = (sourceRecord = record) => {
    const vitalsServicesTotal = (sourceRecord?.vitals?.services || []).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    const doctorServicesTotal = (sourceRecord?.doctor?.services || []).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    const pharmacyServicesTotal = (sourceRecord?.pharmacy?.services || []).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    const medicationsTotal = (sourceRecord?.pharmacy?.medications || []).reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0);
    const servicesTotal = vitalsServicesTotal + doctorServicesTotal + pharmacyServicesTotal;
    const total = servicesTotal + medicationsTotal;
    setBillingForm(prev => ({ ...prev, servicesTotal, medicationsTotal, totalAmount: total }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin w-8 h-8 text-venus-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-venus-danger" />
        <p className="text-venus-danger">{error}</p>
        <button onClick={() => navigate('/medical-records')} className="btn-secondary">
          Back to Medical Records
        </button>
      </div>
    );
  }

  const statusInfo = statusConfig[record?.status] || statusConfig.reception;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/medical-records')}
        className="flex items-center gap-2 text-venus-text-muted hover:text-venus-text-primary transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Back to Medical Records
      </button>

      {patient && (
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-venus-primary-500/20 rounded-xl flex items-center justify-center">
              <User className="w-7 h-7 text-venus-primary-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-venus-text-primary">
                {patient.firstName} {patient.lastName}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1 text-sm text-venus-text-muted">
                  <Calendar className="w-4 h-4" />
                  Visit: {record?.visitDate}
                </span>
                <span className="flex items-center gap-1 text-sm text-venus-text-muted">
                  <Clock className="w-4 h-4" />
                  {record?.visitTime}
                </span>
                <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between">
          {Object.entries(statusConfig).map(([key, config], idx) => {
            const isComplete = isStageComplete(key);
            const isActive = isStageActive(key);
            const skipped = isStageSkipped(key);
            return (
              <div key={key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    skipped ? 'bg-venus-bg-tertiary text-venus-text-muted border border-dashed border-venus-border' :
                    isComplete ? 'bg-emerald-500 text-white' :
                    isActive ? 'bg-venus-primary-500 text-white' :
                    'bg-venus-bg-tertiary text-venus-text-muted border border-venus-border'
                  }`}>
                    {skipped ? <Minus className="w-4 h-4" /> : isComplete ? <CheckCircle2 className="w-4 h-4" /> : config.step}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${isActive ? 'text-venus-primary-400' : 'text-venus-text-muted'}`}>
                    {config.label}{skipped ? ' (skipped)' : ''}
                  </span>
                </div>
                {idx < 5 && (
                  <ChevronRight className={`w-4 h-4 mx-1 ${isComplete ? 'text-emerald-500' : 'text-venus-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RECEPTION */}
      <div className={`card ${isStageActive('reception') ? 'ring-2 ring-amber-500/30' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-venus-text-primary">Reception Check-In</h3>
          {isStageComplete('reception') && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
        </div>
        {record?.reception ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-venus-text-muted">Checked In By</p>
                <p className="text-venus-text-primary font-medium">{record.reception.checkedInBy}</p>
              </div>
              <div>
                <p className="text-sm text-venus-text-muted">Check-In Time</p>
                <p className="text-venus-text-primary">{formatDate(record.reception.checkedInAt)}</p>
              </div>
            </div>
            {record.reception.notes && (
              <div>
                <p className="text-sm text-venus-text-muted">Notes</p>
                <p className="text-venus-text-primary bg-venus-bg-tertiary rounded-lg p-3 mt-1 text-sm">{record.reception.notes}</p>
              </div>
            )}
            {isStageActive('reception') && canEditStage('reception') && (
              <button onClick={handleSendToNurse} disabled={saving}
                className="btn-primary flex items-center gap-2 mt-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to Nurse
              </button>
            )}
          </div>
        ) : <p className="text-venus-text-muted text-sm italic">No reception data</p>}
      </div>

      {/* NURSE / VITALS */}
      <div className={`card ${isStageActive('nurse') ? 'ring-2 ring-blue-500/30' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-venus-text-primary">Nurse / Vitals</h3>
          {isStageComplete('nurse') && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
        </div>

        {isStageActive('nurse') && canEditStage('nurse') ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Temperature (°C)', key: 'temperature', placeholder: '36.5' },
                { label: 'Weight (kg)', key: 'weight', placeholder: '70' },
                { label: 'Height (cm)', key: 'height', placeholder: '175' },
                { label: 'Blood Pressure', key: 'bloodPressure', placeholder: '120/80' },
                { label: 'Pulse (bpm)', key: 'pulse', placeholder: '72' },
                { label: 'SpO2 (%)', key: 'spo2', placeholder: '98' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">{field.label}</label>
                  <input
                    type={field.key === 'bloodPressure' ? 'text' : 'number'}
                    step={field.key === 'temperature' ? '0.1' : field.key === 'weight' ? '0.1' : '1'}
                    value={vitalsForm[field.key]}
                    onChange={(e) => setVitalsForm({...vitalsForm, [field.key]: e.target.value})}
                    className="input-field"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">Additional Notes</label>
              <textarea value={vitalsForm.notes} onChange={(e) => setVitalsForm({...vitalsForm, notes: e.target.value})}
                rows={2} className="input-field resize-none" placeholder="Any observations..." />
            </div>
            <p className="text-xs text-venus-text-muted">A vitals check fee is added to billing automatically when you save.</p>
            <button onClick={handleSaveVitals} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Vitals & Send to Doctor
            </button>
          </div>
        ) : record?.vitals ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <VitalDisplay icon={Thermometer} label="Temperature" value={`${record.vitals.temperature} °C`} />
              <VitalDisplay icon={Weight} label="Weight" value={`${record.vitals.weight} kg`} />
              <VitalDisplay icon={Activity} label="Height" value={`${record.vitals.height} cm`} />
              <VitalDisplay icon={Heart} label="Blood Pressure" value={record.vitals.bloodPressure} />
              <VitalDisplay icon={Activity} label="Pulse" value={`${record.vitals.pulse} bpm`} />
              <VitalDisplay icon={Activity} label="SpO2" value={`${record.vitals.spo2}%`} />
            </div>
            {record.vitals.notes && (
              <div className="bg-venus-bg-tertiary rounded-lg p-3">
                <p className="text-sm text-venus-text-muted">Notes</p>
                <p className="text-venus-text-primary text-sm mt-1">{record.vitals.notes}</p>
              </div>
            )}
            <p className="text-xs text-venus-text-muted">Recorded by {record.vitals.recordedBy}</p>
          </div>
        ) : <p className="text-venus-text-muted text-sm italic">Waiting for vitals...</p>}
      </div>

      {/* DOCTOR */}
      <div className={`card ${isStageActive('doctor') ? 'ring-2 ring-purple-500/30' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-venus-text-primary">Doctor / Diagnosis</h3>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={() => navigate(`/patients/${patientId}`)}
              className="text-sm text-venus-primary-400 hover:underline flex items-center gap-1">
              <User className="w-4 h-4" />
              View Patient
            </button>
            {isStageComplete('doctor') && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </div>
        </div>

        {isStageActive('doctor') && canEditStage('doctor') ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">Symptoms *</label>
              <textarea value={doctorForm.symptoms} onChange={(e) => setDoctorForm({...doctorForm, symptoms: e.target.value})}
                rows={2} className="input-field resize-none" placeholder="Patient complaints and observed symptoms..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">Diagnosis *</label>
              <textarea value={doctorForm.diagnosis} onChange={(e) => setDoctorForm({...doctorForm, diagnosis: e.target.value})}
                rows={3} className="input-field resize-none" placeholder="Primary and secondary diagnosis..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">Services Provided</label>
              <div className="space-y-2">
                {DOCTOR_SERVICES.map(service => {
                  const checked = doctorForm.selectedServices.some(s => s.id === service.id);
                  return (
                    <label key={service.id}
                      className="flex items-center justify-between bg-venus-bg-tertiary rounded-lg p-2.5 cursor-pointer">
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleDoctorService(service)}
                          className="w-4 h-4 rounded border-venus-border" />
                        <span className="text-sm text-venus-text-primary">{service.name}</span>
                      </span>
                      <span className="text-sm text-venus-text-secondary">K{service.price}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-venus-bg-tertiary rounded-lg p-3">
              <input type="checkbox" checked={doctorForm.sendToPharmacy}
                onChange={(e) => setDoctorForm({...doctorForm, sendToPharmacy: e.target.checked})}
                className="w-4 h-4 rounded border-venus-border" />
              <label className="text-sm text-venus-text-secondary">Send to Pharmacy (patient needs medication dispensed)</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">Notes for Next Visit</label>
              <textarea value={doctorForm.notesForNextVisit} onChange={(e) => setDoctorForm({...doctorForm, notesForNextVisit: e.target.value})}
                rows={2} className="input-field resize-none" placeholder="Follow-up instructions, tests to run next time, etc." />
            </div>
            <button onClick={handleSaveDoctor} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Diagnosis & {doctorForm.sendToPharmacy ? 'Send to Pharmacy' : 'Send to Billing'}
            </button>
          </div>
        ) : record?.doctor ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-venus-text-muted">Symptoms</p>
              <p className="text-venus-text-primary bg-venus-bg-tertiary rounded-lg p-3 mt-1 text-sm">{record.doctor.symptoms}</p>
            </div>
            <div>
              <p className="text-sm text-venus-text-muted">Diagnosis</p>
              <p className="text-venus-text-primary bg-venus-bg-tertiary rounded-lg p-3 mt-1 text-sm">{record.doctor.diagnosis}</p>
            </div>
            {record.doctor.services?.length > 0 && (
              <div>
                <p className="text-sm text-venus-text-muted">Services</p>
                <div className="space-y-1 mt-1">
                  {record.doctor.services.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-venus-text-primary">{s.name}</span>
                      <span className="text-venus-text-secondary">K{s.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {record.doctor.notesForNextVisit && (
              <div>
                <p className="text-sm text-venus-text-muted">Notes for Next Visit</p>
                <p className="text-venus-text-primary bg-venus-bg-tertiary/50 rounded-lg p-3 mt-1 text-sm border border-venus-border border-dashed">{record.doctor.notesForNextVisit}</p>
              </div>
            )}
            <p className="text-xs text-venus-text-muted">Recorded by {record.doctor.recordedBy}</p>
          </div>
        ) : <p className="text-venus-text-muted text-sm italic">Waiting for doctor diagnosis...</p>}
      </div>

      {/* PHARMACY */}
      <div className={`card ${isStageActive('pharmacy') ? 'ring-2 ring-green-500/30' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <Pill className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-venus-text-primary">Pharmacy</h3>
          {isStageComplete('pharmacy') && !isStageSkipped('pharmacy') && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
        </div>

        {isStageSkipped('pharmacy') ? (
          <p className="text-venus-text-muted text-sm italic flex items-center gap-2">
            <Minus className="w-4 h-4" />
            Skipped — the doctor marked this visit as not requiring medication.
          </p>
        ) : isStageActive('pharmacy') && canEditStage('pharmacy') ? (
          <div className="space-y-4">
            {pharmacyForm.medications.map((med, idx) => (
              <div key={idx} className="border border-venus-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-venus-text-secondary">Medication #{idx + 1}</span>
                  {pharmacyForm.medications.length > 1 && (
                    <button onClick={() => removeMedication(idx)} className="text-venus-danger text-sm hover:underline">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={med.name} onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                    className="input-field" placeholder="Medication name" />
                  <input value={med.dosage} onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                    className="input-field" placeholder="Dosage (e.g., 500mg)" />
                  <input value={med.quantity} onChange={(e) => updateMedication(idx, 'quantity', e.target.value)}
                    className="input-field" placeholder="Quantity" />
                  <input type="number" value={med.price} onChange={(e) => updateMedication(idx, 'price', e.target.value)}
                    className="input-field" placeholder="Price (K)" />
                </div>
                <input value={med.instructions} onChange={(e) => updateMedication(idx, 'instructions', e.target.value)}
                  className="input-field" placeholder="Instructions (e.g., Take after meals)" />
              </div>
            ))}
            <button onClick={addMedication} className="text-sm text-venus-primary-400 hover:underline">+ Add Medication</button>

            <div>
              <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">Pharmacy Services</label>
              <div className="space-y-2">
                {PHARMACY_SERVICES.map(service => {
                  const checked = pharmacyForm.selectedServices.some(s => s.id === service.id);
                  return (
                    <label key={service.id}
                      className="flex items-center justify-between bg-venus-bg-tertiary rounded-lg p-2.5 cursor-pointer">
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => togglePharmacyService(service)}
                          className="w-4 h-4 rounded border-venus-border" />
                        <span className="text-sm text-venus-text-primary">{service.name}</span>
                      </span>
                      <span className="text-sm text-venus-text-secondary">K{service.price}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button onClick={handleSavePharmacy} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Send to Billing
            </button>
          </div>
        ) : record?.pharmacy ? (
          <div className="space-y-3">
            {record.pharmacy.medications?.map((med, idx) => (
              <div key={idx} className="border border-venus-border rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="font-medium text-venus-text-primary">{med.name}</span>
                  <span className="text-venus-text-secondary">K{med.price}</span>
                </div>
                <p className="text-sm text-venus-text-muted">{med.dosage} — Qty: {med.quantity}</p>
                <p className="text-sm text-venus-text-secondary mt-1">{med.instructions}</p>
              </div>
            ))}
            {record.pharmacy.services?.length > 0 && (
              <div className="space-y-1">
                {record.pharmacy.services.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-venus-text-primary">{s.name}</span>
                    <span className="text-venus-text-secondary">K{s.price}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-venus-text-muted">Dispensed by {record.pharmacy.dispensedBy}</p>
          </div>
        ) : <p className="text-venus-text-muted text-sm italic">Waiting for pharmacy...</p>}
      </div>

      {/* BILLING */}
      <div className={`card ${isStageActive('billing') ? 'ring-2 ring-orange-500/30' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-venus-text-primary">Billing & Payment</h3>
          {isStageComplete('billing') && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
        </div>

        {isStageActive('billing') && canEditStage('billing') ? (
          <div className="space-y-4">
            <div className="bg-venus-bg-tertiary rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-venus-text-muted">Services Total</span>
                <span className="text-venus-text-primary">K{billingForm.servicesTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-venus-text-muted">Medications Total</span>
                <span className="text-venus-text-primary">K{billingForm.medicationsTotal}</span>
              </div>
              <div className="border-t border-venus-border pt-2 flex justify-between font-bold">
                <span className="text-venus-text-primary">Total Amount</span>
                <span className="text-venus-primary-400">K{billingForm.totalAmount}</span>
              </div>
            </div>
            <button onClick={() => calculateTotals()} className="text-sm text-venus-primary-400 hover:underline">Recalculate Totals</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">Payment Method</label>
                <select value={billingForm.paymentMethod} onChange={(e) => setBillingForm({...billingForm, paymentMethod: e.target.value})}
                  className="input-field">
                  <option value="">Select...</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="insurance">Insurance</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={billingForm.paid}
                  onChange={(e) => setBillingForm({...billingForm, paid: e.target.checked})}
                  className="w-4 h-4 rounded border-venus-border" />
                <label className="text-sm text-venus-text-secondary">Payment Received</label>
              </div>
            </div>
            <button onClick={handleCompleteBilling} disabled={saving || !billingForm.paid}
              className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Complete Billing & Close Visit
            </button>
            {!billingForm.paid && <p className="text-xs text-venus-warning">Please confirm payment received before closing.</p>}
          </div>
        ) : record?.billing ? (
          <div className="space-y-3">
            <div className="bg-venus-bg-tertiary rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-venus-text-muted">Services</span>
                <span className="text-venus-text-primary">K{record.billing.servicesTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-venus-text-muted">Medications</span>
                <span className="text-venus-text-primary">K{record.billing.medicationsTotal}</span>
              </div>
              <div className="border-t border-venus-border pt-2 flex justify-between font-bold">
                <span className="text-venus-text-primary">Total Paid</span>
                <span className="text-venus-primary-400">K{record.billing.totalAmount}</span>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-venus-text-muted">Method: <span className="text-venus-text-primary capitalize">{record.billing.paymentMethod}</span></span>
              <span className="text-venus-text-muted">Status: <span className={record.billing.paid ? 'text-venus-success' : 'text-venus-warning'}>{record.billing.paid ? 'Paid' : 'Pending'}</span></span>
            </div>
            <p className="text-xs text-venus-text-muted">Billed by {record.billing.billedBy}</p>
          </div>
        ) : <p className="text-venus-text-muted text-sm italic">Waiting for billing...</p>}
      </div>
    </div>
  );
};

const VitalDisplay = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 bg-venus-bg-tertiary rounded-lg p-3">
    <Icon className="w-5 h-5 text-venus-primary-400" />
    <div>
      <p className="text-xs text-venus-text-muted">{label}</p>
      <p className="text-sm font-medium text-venus-text-primary">{value || '—'}</p>
    </div>
  </div>
);

export default MedicalRecordDetails;