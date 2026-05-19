import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import { formatDate, formatDateTime, formatCurrency, calculateTotalFees } from '../../utils/formatters';
import { Plus, Eye, Loader2, AlertCircle, Download, Printer } from 'lucide-react';

const MedicalRecordsList = () => {
  const navigate = useNavigate();
  const { user, isDoctor, isAdmin, isPatient: isPatientUser } = useAuth();
  const { getDoctorRecords, getAllRecords, getPatientRecords, loading } = useMedicalRecords();
  const [records, setRecords] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadRecords();
  }, [user?.uid]);

  const loadRecords = async () => {
    try {
      let data = [];
      
      if (isAdmin) {
        data = await getAllRecords();
      } else if (isDoctor) {
        data = await getDoctorRecords();
      } else if (isPatientUser && user?.patientId) {
        data = await getPatientRecords(user.patientId);
      }
      
      setRecords(data || []);
    } catch (error) {
      console.error('Failed to load medical records:', error);
    }
  };

  const filteredRecords = filterStatus === 'all' 
    ? records 
    : records.filter(r => r.paymentStatus === filterStatus);

  const canCreate = isDoctor || isAdmin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">Medical Records</h1>
          <p className="text-venus-text-muted mt-1">
            {isDoctor && 'Create and manage patient medical records'}
            {isAdmin && 'View all medical records in the system'}
            {isPatientUser && 'View your medical records'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/medical-records/create')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Medical Record
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      {(isDoctor || isAdmin) && (
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'pending', 'paid', 'insurance'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-venus-primary-500 text-white'
                  : 'bg-venus-bg-secondary text-venus-text-secondary hover:bg-venus-bg-tertiary'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Records Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-venus-bg-tertiary border-b border-venus-border">
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Patient</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Doctor</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Diagnosis</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Visit</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Total</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Date</th>
                <th className="text-right text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-venus-border">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-venus-primary-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-venus-text-muted">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No medical records found</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const total = calculateTotalFees(
                    record.consultationFee,
                    record.laboratoryFee,
                    record.medicationFee,
                    record.otherCharges
                  );

                  return (
                    <tr key={record.id} className="hover:bg-venus-bg-tertiary/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-venus-text-primary font-medium">
                        {record.patientName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-venus-text-secondary">
                        {record.doctorName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-venus-text-secondary">
                        {record.primaryDiagnosis}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-venus-info/10 text-venus-info rounded text-xs font-medium capitalize">
                          {record.visitType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-venus-text-primary">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                          record.paymentStatus === 'paid'
                            ? 'bg-venus-success/10 text-venus-success'
                            : record.paymentStatus === 'pending'
                            ? 'bg-venus-warning/10 text-venus-warning'
                            : 'bg-venus-info/10 text-venus-info'
                        }`}>
                          {record.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-venus-text-muted">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/medical-records/${record.id}`)}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-venus-primary-500/20 text-venus-primary-400 hover:bg-venus-primary-500/30 rounded text-sm transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordsList;
