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
  collectionGroup,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { NURSE_AUTO_SERVICE } from '../constants/services';

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
// NOTE: isPatient (not role) is the correct field to filter on. Staff who
// are also registered as patients keep their staff role (doctor, nurse,
// receptionist, etc.) and are identified only by isPatient: true — the same
// field PatientList already queries on. Filtering by role == 'patient' here
// silently excluded every staff-patient from search results.
export const searchPatients = async (searchTerm, maxResults = 20) => {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return [];

  const q = query(
    collection(db, 'users'),
    where('isPatient', '==', true),
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
    where('isPatient', '==', true),
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

// Returns any medical record for this patient that hasn't reached 'completed' yet.
// Used to avoid creating a second active visit for the same patient.
export const getActivePatientRecord = async (patientId) => {
  const medicalRecordsRef = collection(db, 'users', patientId, 'MedicalRecords');
  const q = query(
    medicalRecordsRef,
    where('status', 'in', ['reception', 'nurse', 'doctor', 'pharmacy', 'billing']),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
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

// Receptionist explicitly hands the checked-in patient off to the nurse.
// No data payload — reception info was already saved at creation time in
// createMedicalRecord; this only advances the workflow status.
export const sendToNurse = async (patientId, recordId) => {
  const docRef = doc(db, 'users', patientId, 'MedicalRecords', recordId);
  await updateDoc(docRef, {
    status: 'nurse',
    updatedAt: serverTimestamp(),
  });
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
      // Vitals check fee is added automatically — nurse doesn't tick anything.
      services: [NURSE_AUTO_SERVICE],
      recordedBy: vitalsData.recordedBy,
      recordedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
};

// doctorData.sendToPharmacy (bool) decides whether the visit routes through
// the pharmacy stage or skips straight to billing.
export const updateDoctorDiagnosis = async (patientId, recordId, doctorData) => {
  const docRef = doc(db, 'users', patientId, 'MedicalRecords', recordId);
  const sendToPharmacy = doctorData.sendToPharmacy !== false;

  await updateDoc(docRef, {
    status: sendToPharmacy ? 'pharmacy' : 'billing',
    doctor: {
      diagnosis: doctorData.diagnosis,
      symptoms: doctorData.symptoms || '',
      notesForNextVisit: doctorData.notesForNextVisit || '',
      services: doctorData.services || [],
      sendToPharmacy,
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
      services: pharmacyData.services || [],
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

// Completed records from the last 24 hours only (for the "Completed" filter tab).
export const getRecentlyCompletedRecords = async (sinceDate) => {
  const cutoff = Timestamp.fromDate(sinceDate);

  const recordsQuery = query(
    collectionGroup(db, 'MedicalRecords'),
    where('status', '==', 'completed'),
    where('updatedAt', '>=', cutoff),
    orderBy('updatedAt', 'desc')
  );

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