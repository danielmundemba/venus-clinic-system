import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const COLLECTION_NAME = 'appointments';

export const useAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to convert Firestore timestamps safely
  const convertTimestamps = (data) => {
    if (!data || typeof data !== 'object') return data;
    const converted = { ...data };
    try {
      if (data.createdAt?.toDate) converted.createdAt = data.createdAt.toDate();
      if (data.updatedAt?.toDate) converted.updatedAt = data.updatedAt.toDate();
      if (data.date?.toDate) converted.date = data.date.toDate();
      if (data.cancelledAt?.toDate) converted.cancelledAt = data.cancelledAt.toDate();
      if (data.startedAt?.toDate) converted.startedAt = data.startedAt.toDate();
      if (data.completedAt?.toDate) converted.completedAt = data.completedAt.toDate();
    } catch (e) {
      console.warn('Timestamp conversion error:', e);
    }
    return converted;
  };

  // Get all appointments with optional filters
  const getAppointments = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Simple query first - avoid compound indexes that might not exist
      let q = query(collection(db, COLLECTION_NAME));

      if (filters.doctorId) {
        q = query(collection(db, COLLECTION_NAME), where('doctorId', '==', filters.doctorId));
      } else if (filters.patientId) {
        q = query(collection(db, COLLECTION_NAME), where('patientId', '==', filters.patientId));
      } else if (filters.status) {
        q = query(collection(db, COLLECTION_NAME), where('status', '==', filters.status));
      }

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));

      // Client-side filtering for remaining filters
      if (filters.type) {
        data = data.filter(a => a.type === filters.type);
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        data = data.filter(a => {
          const d = a.date instanceof Date ? a.date : new Date(a.date);
          return !isNaN(d) && d >= start;
        });
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        data = data.filter(a => {
          const d = a.date instanceof Date ? a.date : new Date(a.date);
          return !isNaN(d) && d <= end;
        });
      }

      // Sort by date desc
      data.sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db = b.date instanceof Date ? b.date : new Date(b.date);
        if (isNaN(da) || isNaN(db)) return 0;
        return db - da;
      });

      setAppointments(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching appointments:', err);
      // Fallback: fetch all without any filters
      try {
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...convertTimestamps(doc.data())
        }));
        setAppointments(data);
        return data;
      } catch (fallbackErr) {
        console.error('Fallback fetch failed:', fallbackErr);
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time listener for appointments
  const subscribeToAppointments = useCallback((filters = {}, callback) => {
    let q = query(collection(db, COLLECTION_NAME));

    if (filters.doctorId) {
      q = query(collection(db, COLLECTION_NAME), where('doctorId', '==', filters.doctorId));
    } else if (filters.patientId) {
      q = query(collection(db, COLLECTION_NAME), where('patientId', '==', filters.patientId));
    } else if (filters.status) {
      q = query(collection(db, COLLECTION_NAME), where('status', '==', filters.status));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));
      callback(data);
    }, (err) => {
      setError(err.message);
      console.error('Subscription error:', err);
    });

    return unsubscribe;
  }, []);

  // Get today's appointments for a doctor
  const getTodaysAppointments = useCallback(async (doctorId) => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        collection(db, COLLECTION_NAME),
        where('doctorId', '==', doctorId),
        where('date', '>=', Timestamp.fromDate(today)),
        where('date', '<', Timestamp.fromDate(tomorrow))
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }));

      // Sort by time
      data.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      return data;
    } catch (err) {
      console.error('Error fetching today\'s appointments:', err);
      // Fallback without date range
      try {
        const q = query(collection(db, COLLECTION_NAME), where('doctorId', '==', doctorId));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...convertTimestamps(doc.data())
        }));
        // Filter client-side
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return data.filter(a => {
          const d = a.date instanceof Date ? a.date : new Date(a.date);
          return d >= today && d < tomorrow;
        }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      } catch (fallbackErr) {
        console.error('Fallback failed:', fallbackErr);
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Create appointment
  const createAppointment = useCallback(async (appointmentData) => {
    setLoading(true);
    setError(null);
    try {
      let dateObj;
      if (appointmentData.date instanceof Date) {
        dateObj = new Date(appointmentData.date);
      } else {
        dateObj = new Date(appointmentData.date);
      }

      if (appointmentData.time) {
        const [hours, minutes] = appointmentData.time.split(':');
        dateObj.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
      }

      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date/time provided');
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        patientId: appointmentData.patientId || '',
        patientName: appointmentData.patientName || '',
        doctorId: appointmentData.doctorId || '',
        doctorName: appointmentData.doctorName || '',
        date: Timestamp.fromDate(dateObj),
        time: appointmentData.time || '09:00',
        duration: appointmentData.duration || 30,
        type: appointmentData.type || 'scheduled',
        notes: appointmentData.notes || '',
        status: appointmentData.type === 'walk-in' ? 'checked-in' : 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid || user?.id || 'unknown'
      });

      return { id: docRef.id, success: true };
    } catch (err) {
      setError(err.message);
      console.error('Error creating appointment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update appointment
  const updateAppointment = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      if (updates.date && typeof updates.date === 'string') {
        const dateObj = new Date(updates.date);
        if (updates.time) {
          const [hours, minutes] = updates.time.split(':');
          dateObj.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
        }
        if (!isNaN(dateObj.getTime())) {
          updateData.date = Timestamp.fromDate(dateObj);
        }
      }

      await updateDoc(docRef, updateData);
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error('Error updating appointment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update status with workflow validation
  const updateStatus = useCallback(async (id, newStatus, reason = '') => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Appointment not found');
      }

      const currentData = docSnap.data();
      const validTransitions = {
        'pending': ['checked-in', 'cancelled'],
        'checked-in': ['in-progress', 'cancelled'],
        'in-progress': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
      };

      if (!validTransitions[currentData.status]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${currentData.status} to ${newStatus}`);
      }

      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'cancelled') {
        updateData.cancellationReason = reason || 'No reason provided';
        updateData.cancelledAt = serverTimestamp();
        updateData.cancelledBy = user?.uid || user?.id || 'unknown';
      }

      if (newStatus === 'in-progress') {
        updateData.startedAt = serverTimestamp();
      }

      if (newStatus === 'completed') {
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(docRef, updateData);
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error('Error updating status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Delete appointment
  const deleteAppointment = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error('Error deleting appointment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    appointments,
    loading,
    error,
    getAppointments,
    subscribeToAppointments,
    getTodaysAppointments,
    createAppointment,
    updateAppointment,
    updateStatus,
    deleteAppointment,
    setError
  };
};

export default useAppointments;