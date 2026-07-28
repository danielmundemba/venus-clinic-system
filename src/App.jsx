import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AuthLayout from './components/layout/AuthLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';
import UnifiedDashboard from './pages/dashboard/UnifiedDashboard';
import PatientList from './pages/patients/PatientList';
import PatientDetails from './pages/patients/PatientDetails';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import AuditLogs from './pages/admin/Auditlogs';
import MedicalRecordsList from './pages/medical-records/MedicalRecordsList';
import CreateMedicalRecord from './pages/medical-records/CreateMedicalRecord';
import MedicalRecordDetails from './pages/medical-records/MedicalRecordDetails';
import UserManagement from './pages/admin/UserManagement';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Dashboard Routes */}
            <Route element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<UnifiedDashboard />} />

              {/* Patient Routes - All authenticated users */}
              <Route path="/patients" element={<PatientList />} />
              <Route path="/patients/:id" element={<PatientDetails />} />

              {/* Medical Records Routes */}
              <Route path="/medical-records" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist', 'nurse', 'doctor', 'pharmacist']}>
                  <MedicalRecordsList />
                </ProtectedRoute>
              } />
              <Route path="/medical-records/create" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist']}>
                  <CreateMedicalRecord />
                </ProtectedRoute>
              } />
              <Route path="/medical-records/:patientId/:recordId" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist', 'nurse', 'doctor', 'pharmacist']}>
                  <MedicalRecordDetails />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </ProtectedRoute>
              } />

              <Route path="/admin/audit" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogs />
                </ProtectedRoute>
              } />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;