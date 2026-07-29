import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AuthLayout from './components/layout/AuthLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import PageSkeleton from './components/common/PageSkeleton';
import Login from './pages/auth/Login';

// Lazy-loaded pages — each becomes its own JS chunk
const UnifiedDashboard = lazy(() => import('./pages/dashboard/UnifiedDashboard'));
const PatientList = lazy(() => import('./pages/patients/PatientList'));
const PatientDetails = lazy(() => import('./pages/patients/PatientDetails'));
const AppointmentsPage = lazy(() => import('./pages/appointments/AppointmentsPage'));
const AuditLogs = lazy(() => import('./pages/admin/Auditlogs'));
const MedicalRecordsList = lazy(() => import('./pages/medical-records/MedicalRecordsList'));
const CreateMedicalRecord = lazy(() => import('./pages/medical-records/CreateMedicalRecord'));
const MedicalRecordDetails = lazy(() => import('./pages/medical-records/MedicalRecordDetails'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

// My-Health
const MyDashboard = lazy(() => import('./pages/profile/MyDashboard'));
const MyRecordsBilling = lazy(() => import('./pages/profile/MyRecordsBilling'));

// Every staff role that should ever see the operational side of the app.
// Kept as one constant so /dashboard and friends can't drift out of sync.
const STAFF_ROLES = ['admin', 'doctor', 'receptionist', 'nurse', 'pharmacist'];

// "/" and unmatched paths both need to land somewhere sensible per role —
// a patient should never be sent toward /dashboard, even transiently.
const RoleAwareRedirect = () => {
  const { userRole, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={userRole === 'patient' ? '/my-health' : '/dashboard'} replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
            </Route>

            <Route element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <Suspense fallback={<PageSkeleton variant="dashboard" />}>
                    <UnifiedDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path="/patients" element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <Suspense fallback={<PageSkeleton variant="table" />}>
                    <PatientList />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/patients/:id" element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <Suspense fallback={<PageSkeleton variant="detail" />}>
                    <PatientDetails />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path="/medical-records" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist', 'nurse', 'doctor', 'pharmacist']}>
                  <Suspense fallback={<PageSkeleton variant="table" />}>
                    <MedicalRecordsList />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/medical-records/create" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist']}>
                  <Suspense fallback={<PageSkeleton variant="form" />}>
                    <CreateMedicalRecord />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/medical-records/:patientId/:recordId" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist', 'nurse', 'doctor', 'pharmacist']}>
                  <Suspense fallback={<PageSkeleton variant="detail" />}>
                    <MedicalRecordDetails />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path="/appointments" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'receptionist', 'nurse']}>
                  <Suspense fallback={<PageSkeleton variant="table" />}>
                    <AppointmentsPage />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Suspense fallback={<PageSkeleton variant="table" />}>
                    <UserManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/audit" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Suspense fallback={<PageSkeleton variant="table" />}>
                    <AuditLogs />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton variant="detail" />}>
                    <ProfilePage />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/my-health" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton variant="dashboard" />}>
                    <MyDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/my-records" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton variant="table" />}>
                    <MyRecordsBilling />
                  </Suspense>
                </ProtectedRoute>
              } />
            </Route>

            <Route path="/" element={<RoleAwareRedirect />} />
            <Route path="*" element={<RoleAwareRedirect />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;