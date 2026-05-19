import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import { 
  formatDate, 
  formatDateTime, 
  formatBloodPressure, 
  formatCurrency, 
  calculateTotalFees,
  formatTemperature
} from '../../utils/formatters';
import { ArrowLeft, Printer, Download, AlertCircle, Loader2, FileText, User, Stethoscope, DollarSign } from 'lucide-react';

const MedicalRecordDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isDoctor, isAdmin, isPatient: isPatientUser } = useAuth();
  const { getRecord, loading } = useMedicalRecords();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.success || false);

  useEffect(() => {
    loadRecord();
  }, [id]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadRecord = async () => {
    try {
      const data = await getRecord(id);
      if (!data) {
        setError('Medical record not found');
        return;
      }

      // Check access permissions
      const isOwner = isDoctor && data.doctorId === user?.uid;
      const isAdmin_ = isAdmin;
      const isPatientOwner = isPatientUser && data.patientId === user?.patientId;

      if (!isOwner && !isAdmin_ && !isPatientOwner) {
        setError('You do not have permission to view this record');
        return;
      }

      setRecord(data);
    } catch (err) {
      console.error('Failed to load medical record:', err);
      setError('Failed to load medical record');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // For now, use browser print-to-PDF. In production, use a library like pdfkit or jsPDF
    alert('PDF download feature: Use Print and Save as PDF in your browser.');
  };

  if (error && !record) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/medical-records')}
          className="flex items-center gap-2 text-venus-text-muted hover:text-venus-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Medical Records
        </button>
        <div className="card bg-venus-danger/10 border border-venus-danger/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-venus-danger flex-shrink-0 mt-0.5" />
            <p className="text-venus-danger">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !record) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-venus-primary-400 animate-spin" />
      </div>
    );
  }

  const total = calculateTotalFees(
    record.consultationFee,
    record.laboratoryFee,
    record.medicationFee,
    record.otherCharges
  );

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/medical-records')}
          className="flex items-center gap-2 text-venus-text-muted hover:text-venus-text-primary transition-colors print:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Medical Records
        </button>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-venus-primary-500/20 text-venus-primary-400 hover:bg-venus-primary-500/30 rounded transition-colors"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-venus-info/20 text-venus-info hover:bg-venus-info/30 rounded transition-colors"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-venus-success/10 border border-venus-success/30 rounded-lg text-venus-success flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Medical record created successfully!</p>
        </div>
      )}

      {/* Document Header */}
      <div className="card bg-venus-bg-tertiary border-2 border-venus-primary-500 print:border-gray-300">
        <div className="text-center mb-6 pb-6 border-b border-venus-border">
          <h1 className="text-3xl font-bold text-venus-text-primary print:text-black">VENUS CLINIC</h1>
          <p className="text-venus-text-secondary mt-1 print:text-gray-600">Information System - Medical Record</p>
          <p className="text-xs text-venus-text-muted mt-2 print:text-gray-600">Professional Clinical Documentation</p>
        </div>

        {/* Patient Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-venus-border">
          <div>
            <h3 className="font-semibold text-venus-text-primary mb-3 flex items-center gap-2 print:text-black">
              <User className="w-5 h-5" />
              Patient Information
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium text-venus-text-secondary">Name:</span> <span className="text-venus-text-primary print:text-black">{record.patientName}</span></p>
              <p><span className="font-medium text-venus-text-secondary">Patient ID:</span> <span className="font-mono print:text-black">{record.patientId}</span></p>
              <p><span className="font-medium text-venus-text-secondary">Age:</span> <span className="print:text-black">{record.patientAge} years</span></p>
              <p><span className="font-medium text-venus-text-secondary">Gender:</span> <span className="capitalize print:text-black">{record.patientGender}</span></p>
              {record.patientPhone && <p><span className="font-medium text-venus-text-secondary">Phone:</span> <span className="print:text-black">{record.patientPhone}</span></p>}
              {record.patientEmail && <p><span className="font-medium text-venus-text-secondary">Email:</span> <span className="print:text-black">{record.patientEmail}</span></p>}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-venus-text-primary mb-3 flex items-center gap-2 print:text-black">
              <Stethoscope className="w-5 h-5" />
              Visit Information
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium text-venus-text-secondary">Doctor:</span> <span className="text-venus-text-primary print:text-black">{record.doctorName}</span></p>
              <p><span className="font-medium text-venus-text-secondary">Visit Date:</span> <span className="print:text-black">{formatDate(record.visitDate)}</span></p>
              <p><span className="font-medium text-venus-text-secondary">Visit Time:</span> <span className="print:text-black">{record.visitTime}</span></p>
              <p><span className="font-medium text-venus-text-secondary">Visit Type:</span> <span className="capitalize print:text-black">{record.visitType}</span></p>
              <p><span className="font-medium text-venus-text-secondary">Record Created:</span> <span className="text-xs print:text-black">{formatDateTime(record.createdAt)}</span></p>
            </div>
          </div>
        </div>

        {/* Chief Complaint */}
        <div className="mb-6 pb-6 border-b border-venus-border">
          <h3 className="font-semibold text-venus-text-primary mb-2 print:text-black">Chief Complaint</h3>
          <p className="text-sm text-venus-text-secondary print:text-gray-700">{record.chiefComplaint}</p>
        </div>

        {/* Medical History */}
        {(record.presentIllness || record.pastMedicalHistory || record.surgicalHistory || record.familyHistory || record.socialHistory) && (
          <div className="mb-6 pb-6 border-b border-venus-border">
            <h3 className="font-semibold text-venus-text-primary mb-3 print:text-black">Medical History</h3>
            <div className="space-y-3 text-sm">
              {record.presentIllness && (
                <div>
                  <p className="font-medium text-venus-text-secondary mb-1 print:text-black">History of Present Illness:</p>
                  <p className="text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.presentIllness}</p>
                </div>
              )}
              {record.pastMedicalHistory && (
                <div>
                  <p className="font-medium text-venus-text-secondary mb-1 print:text-black">Past Medical History:</p>
                  <p className="text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.pastMedicalHistory}</p>
                </div>
              )}
              {record.surgicalHistory && (
                <div>
                  <p className="font-medium text-venus-text-secondary mb-1 print:text-black">Surgical History:</p>
                  <p className="text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.surgicalHistory}</p>
                </div>
              )}
              {record.familyHistory && (
                <div>
                  <p className="font-medium text-venus-text-secondary mb-1 print:text-black">Family History:</p>
                  <p className="text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.familyHistory}</p>
                </div>
              )}
              {record.socialHistory && (
                <div>
                  <p className="font-medium text-venus-text-secondary mb-1 print:text-black">Social History:</p>
                  <p className="text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.socialHistory}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Allergies */}
        {record.allergies && record.allergies.length > 0 && (
          <div className="mb-6 pb-6 border-b border-venus-border">
            <h3 className="font-semibold text-venus-text-primary mb-3 print:text-black">Allergies</h3>
            <div className="space-y-2 text-sm">
              {record.allergies.map((allergy, idx) => (
                <div key={idx} className="p-2 bg-venus-danger/5 rounded border border-venus-danger/20">
                  <p className="print:text-black"><span className="font-medium">Allergy:</span> {allergy.name}</p>
                  <p className="print:text-black"><span className="font-medium">Reaction:</span> {allergy.reaction} <span className="text-venus-warning">({allergy.severity})</span></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Medications */}
        {record.currentMedications && record.currentMedications.length > 0 && (
          <div className="mb-6 pb-6 border-b border-venus-border">
            <h3 className="font-semibold text-venus-text-primary mb-3 print:text-black">Current Medications</h3>
            <div className="space-y-2 text-sm">
              {record.currentMedications.map((med, idx) => (
                <div key={idx} className="p-2 bg-venus-info/5 rounded border border-venus-info/20">
                  <p className="print:text-black"><span className="font-medium">{med.name}</span> - {med.dosage}</p>
                  <p className="text-xs text-venus-text-muted print:text-gray-600">Frequency: {med.frequency}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vital Signs */}
        {(record.temperature || record.bloodPressureSystolic || record.pulseRate) && (
          <div className="mb-6 pb-6 border-b border-venus-border">
            <h3 className="font-semibold text-venus-text-primary mb-3 print:text-black">Vital Signs</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {record.temperature && (
                <div className="p-2 bg-venus-bg-secondary rounded print:border print:border-gray-300">
                  <p className="text-venus-text-muted text-xs print:text-gray-600">Temperature</p>
                  <p className="font-semibold text-venus-text-primary print:text-black">{formatTemperature(record.temperature)}</p>
                </div>
              )}
              {record.bloodPressureSystolic && (
                <div className="p-2 bg-venus-bg-secondary rounded print:border print:border-gray-300">
                  <p className="text-venus-text-muted text-xs print:text-gray-600">Blood Pressure</p>
                  <p className="font-semibold text-venus-text-primary print:text-black">{formatBloodPressure(record.bloodPressureSystolic, record.bloodPressureDiastolic)}</p>
                </div>
              )}
              {record.pulseRate && (
                <div className="p-2 bg-venus-bg-secondary rounded print:border print:border-gray-300">
                  <p className="text-venus-text-muted text-xs print:text-gray-600">Pulse Rate</p>
                  <p className="font-semibold text-venus-text-primary print:text-black">{record.pulseRate} bpm</p>
                </div>
              )}
              {record.oxygenSaturation && (
                <div className="p-2 bg-venus-bg-secondary rounded print:border print:border-gray-300">
                  <p className="text-venus-text-muted text-xs print:text-gray-600">O₂ Saturation</p>
                  <p className="font-semibold text-venus-text-primary print:text-black">{record.oxygenSaturation}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Physical Examination */}
        {record.physicalExamination && (
          <div className="mb-6 pb-6 border-b border-venus-border">
            <h3 className="font-semibold text-venus-text-primary mb-2 print:text-black">Physical Examination</h3>
            <p className="text-sm text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.physicalExamination}</p>
          </div>
        )}

        {/* Diagnosis */}
        <div className="mb-6 pb-6 border-b border-venus-border">
          <h3 className="font-semibold text-venus-text-primary mb-3 print:text-black">Diagnosis</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium text-venus-text-secondary">Primary:</span> <span className="text-venus-text-primary print:text-black">{record.primaryDiagnosis}</span></p>
            {record.secondaryDiagnosis && <p><span className="font-medium text-venus-text-secondary">Secondary:</span> <span className="text-venus-text-secondary print:text-gray-700">{record.secondaryDiagnosis}</span></p>}
            {record.icdCode && <p><span className="font-medium text-venus-text-secondary">ICD Code:</span> <span className="font-mono text-venus-text-secondary print:text-gray-700">{record.icdCode}</span></p>}
          </div>
        </div>

        {/* Treatment Plan */}
        <div className="mb-6 pb-6 border-b border-venus-border">
          <h3 className="font-semibold text-venus-text-primary mb-3 print:text-black">Treatment Plan</h3>
          <div className="space-y-3 text-sm">
            {record.prescribedMedications && (
              <div>
                <p className="font-medium text-venus-text-secondary mb-1 print:text-black">Prescribed Medications:</p>
                <p className="text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.prescribedMedications}</p>
              </div>
            )}
            {record.procedures && (
              <div>
                <p className="font-medium text-venus-text-secondary mb-1 print:text-black">Procedures:</p>
                <p className="text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.procedures}</p>
              </div>
            )}
            {record.doctorInstructions && (
              <div>
                <p className="font-medium text-venus-text-secondary mb-1 print:text-black">Doctor Instructions:</p>
                <p className="text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.doctorInstructions}</p>
              </div>
            )}
            {record.followUpInstructions && (
              <div>
                <p className="font-medium text-venus-text-secondary mb-1 print:text-black">Follow-up Instructions:</p>
                <p className="text-venus-text-secondary print:text-gray-700 whitespace-pre-wrap">{record.followUpInstructions}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="card bg-venus-bg-tertiary border border-venus-border">
          <h3 className="font-semibold text-venus-text-primary mb-4 flex items-center gap-2 print:text-black">
            <DollarSign className="w-5 h-5" />
            Payment Summary
          </h3>
          <div className="space-y-2 text-sm">
            {record.consultationFee && <p><span className="text-venus-text-secondary">Consultation:</span> <span className="font-semibold print:text-black">{formatCurrency(record.consultationFee)}</span></p>}
            {record.laboratoryFee && <p><span className="text-venus-text-secondary">Laboratory:</span> <span className="font-semibold print:text-black">{formatCurrency(record.laboratoryFee)}</span></p>}
            {record.medicationFee && <p><span className="text-venus-text-secondary">Medication:</span> <span className="font-semibold print:text-black">{formatCurrency(record.medicationFee)}</span></p>}
            {record.otherCharges && <p><span className="text-venus-text-secondary">Other Charges:</span> <span className="font-semibold print:text-black">{formatCurrency(record.otherCharges)}</span></p>}
            <div className="border-t border-venus-border pt-2 mt-2">
              <p className="font-semibold"><span className="text-venus-text-secondary">Total Amount:</span> <span className="text-lg print:text-black">{formatCurrency(total)}</span></p>
              <p className="text-xs text-venus-text-muted mt-1 print:text-gray-600">
                Payment Status: <span className={`font-medium capitalize ${
                  record.paymentStatus === 'paid' ? 'text-venus-success' :
                  record.paymentStatus === 'pending' ? 'text-venus-warning' :
                  'text-venus-info'
                }`}>{record.paymentStatus}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-venus-border text-center text-xs text-venus-text-muted print:text-gray-600 print:border-gray-300">
          <p className="font-medium text-venus-text-secondary print:text-black">Medical Record - Confidential</p>
          <p className="mt-1">This document contains sensitive medical information. Authorized personnel only.</p>
          <p className="mt-2">Generated: {formatDateTime(new Date())}</p>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordDetails;
