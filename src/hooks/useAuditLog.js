import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = async (action, resourceType, resourceId, details = {}) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        userId: user?.uid || 'unknown',
        userRole: user?.role || 'unknown',
        userName: user?.displayName || 'unknown',
        action,
        resourceType,
        resourceId,
        details,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Audit log failed:', error);
      // Don't throw - audit failure shouldn't break main flow
    }
  };

  return { logAction };
};