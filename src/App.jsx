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
import WalkInRegistration from './pages/appointments/WalkInRegistration';
import AuditLogs from './pages/admin/Auditlogs';
import MedicalRecordsList from './pages/medical-records/MedicalRecordsList';
import CreateMedicalRecord from './pages/medical-records/CreateMedicalRecord';
import MedicalRecordDetails from './pages/medical-records/MedicalRecordDetails';

// Placeholder pages
const PlaceholderPage = ({ title }) => (
  <div className="card">
    <h1 className="text-xl font-bold text-venus-text-primary">{title}</h1>
    <p className="text-venus-text-muted mt-2">This page is under construction.</p>
  </div>
);

const AppointmentSchedule = () => <PlaceholderPage title="Appointments" />;
const Invoices = () => <PlaceholderPage title="Billing & Invoices" />;
const UserManagement = () => <PlaceholderPage title="User Management" />;

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
              
              {/* Patient Routes */}
              <Route path="/patients" element={<PatientList />} />
              <Route path="/patients/:id" element={<PatientDetails />} />
              
              {/* Appointment Routes */}
              <Route path="/appointments" element={<AppointmentSchedule />} />
              <Route path="/appointments/walk-in" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist', 'doctor', 'nurse']}>
                  <WalkInRegistration />
                </ProtectedRoute>
              } />
              
              {/* Medical Records Routes */}
              <Route path="/medical-records" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'patient']}>
                  <MedicalRecordsList />
                </ProtectedRoute>
              } />
              <Route path="/medical-records/create" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor']}>
                  <CreateMedicalRecord />
                </ProtectedRoute>
              } />
              <Route path="/medical-records/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'patient']}>
                  <MedicalRecordDetails />
                </ProtectedRoute>
              } />
              
              <Route path="/billing" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist']}>
                  <Invoices />
                </ProtectedRoute>
              } />
              
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