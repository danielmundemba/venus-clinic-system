import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPatientMedicalRecords } from '../../firebase/db';
import { formatDate } from '../../utils/formatters';
import {
  ClipboardList,
  Receipt,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Pill,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const statusConfig = {
  reception: { label: 'Checked In', color: 'bg-amber-500/10 text-amber-500' },
  nurse: { label: 'With Nurse', color: 'bg-blue-500/10 text-blue-500' },
  doctor: { label: 'With Doctor', color: 'bg-purple-500/10 text-purple-500' },
  pharmacy: { label: 'At Pharmacy', color: 'bg-green-500/10 text-green-500' },
  billing: { label: 'Awaiting Billing', color: 'bg-orange-500/10 text-orange-500' },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-500' },
};

const TABS = [
  { key: 'records', label: 'Medical Records', icon: ClipboardList },
  { key: 'billing', label: 'Billing', icon: Receipt },
];

const MyRecordsBilling = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('records');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (user?.uid) loadRecords();
  }, [user?.uid]);

  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientMedicalRecords(user.uid);
      setRecords((data || []).slice().sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1)));
    } catch (err) {
      console.error('Failed to load your records:', err);
      setError('Could not load your records right now.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-venus-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-venus-danger" />
        <p className="text-venus-danger">{error}</p>
      </div>
    );
  }

  const billedRecords = records.filter(r => r.billing);
  const totalBilled = billedRecords.reduce((sum, r) => sum + (r.billing.totalAmount || 0), 0);
  const totalOutstanding = billedRecords.reduce((sum, r) => sum + (r.billing.paid ? 0 : (r.billing.totalAmount || 0)), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-venus-text-primary">My Records & Billing</h1>
        <p className="text-venus-text-muted mt-1">Everything on file for your visits with us</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-venus-border">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? 'border-venus-primary-500 text-venus-primary-400'
                  : 'border-transparent text-venus-text-muted hover:text-venus-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'records' && (
        <div className="space-y-3">
          {records.length === 0 ? (
            <p className="text-venus-text-muted text-sm italic">No visits on record yet.</p>
          ) : (
            records.map((record) => {
              const info = statusConfig[record.status] || statusConfig.reception;
              const expanded = expandedId === record.id;
              return (
                <div key={record.id} className="card">
                  <button
                    onClick={() => setExpandedId(expanded ? null : record.id)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-venus-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-venus-text-primary">{formatDate(record.visitDate)}</p>
                        <p className="text-sm text-venus-text-muted">
                          {record.doctor?.diagnosis || 'Visit in progress'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${info.color}`}>
                        {info.label}
                      </span>
                      {expanded ? <ChevronUp className="w-4 h-4 text-venus-text-muted" /> : <ChevronDown className="w-4 h-4 text-venus-text-muted" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-venus-border space-y-4">
                      {record.vitals && (
                        <div>
                          <p className="text-sm font-semibold text-venus-text-secondary flex items-center gap-1.5 mb-1.5">
                            <Stethoscope className="w-4 h-4" /> Vitals
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            <p className="text-venus-text-muted">Temp: <span className="text-venus-text-primary">{record.vitals.temperature}°C</span></p>
                            <p className="text-venus-text-muted">Weight: <span className="text-venus-text-primary">{record.vitals.weight}kg</span></p>
                            <p className="text-venus-text-muted">BP: <span className="text-venus-text-primary">{record.vitals.bloodPressure}</span></p>
                            <p className="text-venus-text-muted">Pulse: <span className="text-venus-text-primary">{record.vitals.pulse}bpm</span></p>
                            <p className="text-venus-text-muted">SpO2: <span className="text-venus-text-primary">{record.vitals.spo2}%</span></p>
                          </div>
                        </div>
                      )}

                      {record.doctor && (
                        <div>
                          <p className="text-sm font-semibold text-venus-text-secondary mb-1.5">Diagnosis</p>
                          <p className="text-sm text-venus-text-primary bg-venus-bg-tertiary rounded-lg p-3">{record.doctor.diagnosis}</p>
                          {record.doctor.notesForNextVisit && (
                            <p className="text-sm text-venus-text-muted mt-2">
                              Follow-up note: {record.doctor.notesForNextVisit}
                            </p>
                          )}
                        </div>
                      )}

                      {record.pharmacy?.medications?.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-venus-text-secondary flex items-center gap-1.5 mb-1.5">
                            <Pill className="w-4 h-4" /> Medications
                          </p>
                          <div className="space-y-1">
                            {record.pharmacy.medications.map((med, i) => (
                              <p key={i} className="text-sm text-venus-text-primary">
                                {med.name} — {med.dosage} ({med.instructions})
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.billing && (
                        <div className="flex items-center justify-between text-sm bg-venus-bg-tertiary rounded-lg p-3">
                          <span className="text-venus-text-muted">Total for this visit</span>
                          <span className="font-semibold text-venus-text-primary">K{record.billing.totalAmount}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <p className="text-sm text-venus-text-muted mb-1">Total Billed</p>
              <p className="text-2xl font-bold text-venus-text-primary">K{totalBilled}</p>
            </div>
            <div className="card">
              <p className="text-sm text-venus-text-muted mb-1">Outstanding</p>
              <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-venus-danger' : 'text-venus-success'}`}>
                K{totalOutstanding}
              </p>
            </div>
          </div>

          {billedRecords.length === 0 ? (
            <p className="text-venus-text-muted text-sm italic">No billing history yet.</p>
          ) : (
            <div className="space-y-3">
              {billedRecords.map((record) => (
                <div key={record.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-venus-text-primary">{formatDate(record.visitDate)}</p>
                    <p className="text-sm text-venus-text-muted capitalize">
                      {record.billing.paymentMethod || 'Payment method not recorded'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-venus-text-primary">K{record.billing.totalAmount}</p>
                    <span className={`flex items-center gap-1 text-xs justify-end mt-0.5 ${record.billing.paid ? 'text-venus-success' : 'text-venus-warning'}`}>
                      {record.billing.paid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {record.billing.paid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyRecordsBilling;