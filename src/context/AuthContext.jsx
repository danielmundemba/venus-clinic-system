import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, getUserRole } from '../firebase/auth';
import AppShellSkeleton from '../components/common/AppShellSkeleton';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const role = await getUserRole(firebaseUser.uid);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role,
            patientId: firebaseUser.uid,
          });
          setUserRole(role);
        } else {
          setUser(null);
          setUserRole(null);
        }
      } catch (err) {
        console.error('Auth state resolution failed:', err);
        setUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userRole,
    isAuthenticated: !!user,
    isAdmin: userRole === 'admin',
    isDoctor: userRole === 'doctor',
    isReceptionist: userRole === 'receptionist',
    isNurse: userRole === 'nurse',
    isPatient: userRole === 'patient',
    isMedicalStaff: userRole === 'doctor' || userRole === 'nurse',
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <AppShellSkeleton /> : children}
    </AuthContext.Provider>
  );
};