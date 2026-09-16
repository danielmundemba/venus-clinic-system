import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import PatientSelector from '../../components/medical-records/PatientSelector';
import VisitList from '../../components/medical-records/VisitList';
import VisitDetail from '../../components/medical-records/VisitDetail';
import ReceptionistVisitForm from '../../components/medical-records/ReceptionistVisitForm';
import Modal from '../../components/common/Modal';
import { ArrowLeft, Users } from 'lucide-react';

const MedicalRecordsPage = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [showPatientSelector, setShowPatientSelector] = useState(true);
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  // refreshKey bumps to force VisitList / VisitDetail to reload after mutations
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const userRole = user?.role || 'doctor';

  // Only receptionist, doctor, and admin can create new visits
  const canCreateVisit = ['admin', 'receptionist', 'doctor'].includes(userRole);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setShowPatientSelector(false);
    setSelectedRecordId(null);
  };

  const handleSelectVisit = (record) => {
    setSelectedRecordId(record.id);
  };

  const handleBackToVisits = () => {
    setSelectedRecordId(null);
    // Refresh visit list when returning from detail (data may have changed)
    setRefreshKey((k) => k + 1);
  };

  const handleBackToPatients = () => {
    setSelectedPatient(null);
    setSelectedRecordId(null);
    setShowPatientSelector(true);
  };

  const handleVisitCreated = useCallback(() => {
    setShowNewVisitModal(false);
    // Force VisitList to reload the new visit
    setRefreshKey((k) => k + 1);
  }, []);

  const handleVisitUpdated = useCallback(() => {
    // Refresh detail view after any tab update
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">Medical Records</h1>
          <p className="text-sm text-venus-text-muted mt-1">
            Role: <span className="capitalize font-medium text-venus-primary-400">{userRole}</span>
          </p>
        </div>

        {selectedPatient && (
          <button
            onClick={handleBackToPatients}
            className="flex items-center gap-2 text-venus-text-secondary hover:text-venus-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Change Patient
          </button>
        )}
      </div>

      {/* Patient Selector Modal */}
      {showPatientSelector && (
        <Modal
          isOpen={showPatientSelector}
          onClose={() => setShowPatientSelector(false)}
          title="Select Patient"
        >
          <PatientSelector
            onSelect={handleSelectPatient}
            onClose={() => setShowPatientSelector(false)}
            showVisits={true}
          />
        </Modal>
      )}

      {/* Selected Patient Header */}
      {selectedPatient && !selectedRecordId && (
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-venus-primary-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-venus-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-venus-text-primary">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </h2>
              <p className="text-sm text-venus-text-muted">
                ID: {selectedPatient.id} | {selectedPatient.phone}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Visit List or Visit Detail */}
      {selectedPatient && !selectedRecordId && (
        <VisitList
          key={`visit-list-${refreshKey}`}
          patientId={selectedPatient.id}
          onSelectVisit={handleSelectVisit}
          onCreateVisit={canCreateVisit ? () => setShowNewVisitModal(true) : undefined}
        />
      )}

      {/* Visit Detail View */}
      {selectedPatient && selectedRecordId && (
        <VisitDetail
          key={`visit-detail-${selectedRecordId}-${refreshKey}`}
          patient={selectedPatient}
          recordId={selectedRecordId}
          onBack={handleBackToVisits}
          onUpdate={handleVisitUpdated}
        />
      )}

      {/* New Visit Modal */}
      {showNewVisitModal && selectedPatient && (
        <Modal
          isOpen={showNewVisitModal}
          onClose={() => setShowNewVisitModal(false)}
          title="Create New Visit"
        >
          <ReceptionistVisitForm
            patientId={selectedPatient.id}
            onUpdate={handleVisitCreated}
          />
        </Modal>
      )}
    </div>
  );
};

export default MedicalRecordsPage;