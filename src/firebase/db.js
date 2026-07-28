import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  collectionGroup
} from 'firebase/firestore';
import { db } from './config';

// ============================================
// GENERIC CRUD
// ============================================
export const createDocument = async (collectionName, data) => {
  return await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getDocument = async (collectionName, docId) => {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const getAllDocuments = async (collectionName, constraints = []) => {
  const q = query(collection(db, collectionName), ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateDocument = async (collectionName, docId, data) => {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteDocument = async (collectionName, docId) => {
  await deleteDoc(doc(db, collectionName, docId));
};

// ============================================
// STAFF SEARCH
// ============================================
export const searchStaff = async (searchTerm, maxResults = 20) => {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return [];

  const q = query(
    collection(db, 'users'),
    where('isStaff', '==', true),
    where('searchableName', '>=', term),
    where('searchableName', '<=', term + '\uf8ff'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getStaffByRole = async (role, maxResults = 50) => {
  const q = query(
    collection(db, 'users'),
    where('isStaff', '==', true),
    where('role', '==', role),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ============================================
// PATIENT SEARCH
// ============================================
export const searchPatients = async (searchTerm, maxResults = 20) => {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return [];

  const q = query(
    collection(db, 'users'),
    where('role', '==', 'patient'),
    where('searchableName', '>=', term),
    where('searchableName', '<=', term + '\uf8ff'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const searchPatientsByPhone = async (phone) => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'patient'),
    where('phone', '==', phone),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPatientInfo = async (userId) => {
  const patientInfoRef = collection(db, 'users', userId, 'patientInfo');
  const q = query(patientInfoRef, orderBy('createdAt', 'desc'), limit(1));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};

// ============================================
// MEDICAL RECORDS
// ============================================

export const createMedicalRecord = async (patientId, receptionData) => {
  const medicalRecordsRef = collection(db, 'users', patientId, 'MedicalRecords');

  const recordData = {
    patientId,
    visitDate: receptionData.visitDate || new Date().toISOString().split('T')[0],
    visitTime: receptionData.visitTime || new Date().toTimeString().slice(0, 5),
    status: 'reception',
    reception: {
      notes: receptionData.notes || '',
      checkedInBy: receptionData.checkedInBy,
      checkedInAt: serverTimestamp(),
    },
    vitals: null,
    doctor: null,
    pharmacy: null,
    billing: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(medicalRecordsRef, recordData);
  return { id: docRef.id, ...recordData };
};

export const getPatientMedicalRecords = async (patientId, statusFilter = null) => {
  const medicalRecordsRef = collection(db, 'users', patientId, 'MedicalRecords');
  let constraints = [orderBy('createdAt', 'desc')];

  if (statusFilter) {
    constraints.unshift(where('status', '==', statusFilter));
  }

  const q = query(medicalRecordsRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getMedicalRecord = async (patientId, recordId) => {
  const docRef = doc(db, 'users', patientId, 'MedicalRecords', recordId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const updateVitals = async (patientId, recordId, vitalsData) => {
  const docRef = doc(db, 'users', patientId, 'MedicalRecords', recordId);
  await updateDoc(docRef, {
    status: 'doctor',
    vitals: {
      temperature: vitalsData.temperature,
      weight: vitalsData.weight,
      height: vitalsData.height,
      bloodPressure: vitalsData.bloodPressure,
      pulse: vitalsData.pulse,
      spo2: vitalsData.spo2,
      notes: vitalsData.notes || '',
      recordedBy: vitalsData.recordedBy,
      recordedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
};

export const updateDoctorDiagnosis = async (patientId, recordId, doctorData) => {
  const docRef = doc(db, 'users', patientId, 'MedicalRecords', recordId);
  await updateDoc(docRef, {
    status: 'pharmacy',
    doctor: {
      diagnosis: doctorData.diagnosis,
      symptoms: doctorData.symptoms || '',
      notesForNextVisit: doctorData.notesForNextVisit || '',
      services: doctorData.services || [],
      recordedBy: doctorData.recordedBy,
      recordedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
};

export const updatePharmacy = async (patientId, recordId, pharmacyData) => {
  const docRef = doc(db, 'users', patientId, 'MedicalRecords', recordId);
  await updateDoc(docRef, {
    status: 'billing',
    pharmacy: {
      medications: pharmacyData.medications || [],
      dispensedBy: pharmacyData.dispensedBy,
      dispensedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
};

export const completeBilling = async (patientId, recordId, billingData) => {
  const docRef = doc(db, 'users', patientId, 'MedicalRecords', recordId);
  await updateDoc(docRef, {
    status: 'completed',
    billing: {
      totalAmount: billingData.totalAmount,
      servicesTotal: billingData.servicesTotal || 0,
      medicationsTotal: billingData.medicationsTotal || 0,
      paid: billingData.paid || false,
      paymentMethod: billingData.paymentMethod || '',
      billedBy: billingData.billedBy,
      billedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
};

export const getActiveMedicalRecords = async (statusFilter = null) => {
  const recordsQuery = statusFilter 
    ? query(collectionGroup(db, 'MedicalRecords'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'))
    : query(collectionGroup(db, 'MedicalRecords'), where('status', 'in', ['reception', 'nurse', 'doctor', 'pharmacy', 'billing']), orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(recordsQuery);
  return snapshot.docs.map(doc => {
    const path = doc.ref.path.split('/');
    return { 
      id: doc.id, 
      patientId: path[1],
      ...doc.data() 
    };
  });
};

// Batch write for audit logs
export const batchWrite = async (operations) => {
  const batch = writeBatch(db);
  operations.forEach(({ type, collectionName, docId, data }) => {
    const ref = doc(db, collectionName, docId);
    if (type === 'set') batch.set(ref, data);
    if (type === 'update') batch.update(ref, data);
    if (type === 'delete') batch.delete(ref);
  });
  await batch.commit();
};