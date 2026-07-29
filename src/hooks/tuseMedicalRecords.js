import { useCallback } from 'react';
import { query, where, orderBy } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../context/AuthContext';

export const useMedicalRecords = () => {
  const { user, isDoctor, isAdmin } = useAuth();
  const firestore = useFirestore('medicalRecords');

  const getPatientRecords = useCallback(async (patientId) => {
    return await firestore.getAll([
      { type: 'where', field: 'patientId', operator: '==', value: patientId },
      { type: 'orderBy', field: 'createdAt', direction: 'desc' },
    ]);
  }, [firestore]);

  const getDoctorRecords = useCallback(async () => {
    if (!user?.uid) return [];
    return await firestore.getAll([
      { type: 'where', field: 'doctorId', operator: '==', value: user.uid },
      { type: 'orderBy', field: 'createdAt', direction: 'desc' },
    ]);
  }, [firestore, user]);

  const getAllRecords = useCallback(async () => {
    if (!isAdmin) return [];
    return await firestore.getAll([
      { type: 'orderBy', field: 'createdAt', direction: 'desc' },
    ]);
  }, [firestore, isAdmin]);

  const createRecord = useCallback(async (recordData) => {
    return await firestore.create({
      ...recordData,
      doctorId: user?.uid,
      doctorName: user?.displayName,
    });
  }, [firestore, user]);

  const updateRecord = useCallback(async (recordId, data) => {
    return await firestore.update(recordId, data);
  }, [firestore]);

  const deleteRecord = useCallback(async (recordId) => {
    return await firestore.remove(recordId);
  }, [firestore]);

  const getRecord = useCallback(async (recordId) => {
    return await firestore.get(recordId);
  }, [firestore]);

  return {
    getPatientRecords,
    getDoctorRecords,
    getAllRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    getRecord,
    loading: firestore.loading,
    error: firestore.error,
  };
};
