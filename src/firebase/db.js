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
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "./config";
import { NURSE_AUTO_SERVICE } from "../constants/services";

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
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    collection(db, "users"),
    where("isStaff", "==", true),
    where("searchableName", ">=", term),
    where("searchableName", "<=", term + "\uf8ff"),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const getStaffByRole = async (role, maxResults = 50) => {
  const q = query(
    collection(db, "users"),
    where("isStaff", "==", true),
    where("role", "==", role),
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
    limit(maxResults),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// ============================================
// PATIENT SEARCH
// ============================================
// Primary search flow: by patient ID (patientNumber), not name — avoids
// mixing up same-name patients, matches how real clinics operate.
export const searchPatientsByNumber = async (searchTerm, maxResults = 20) => {
  const term = searchTerm.trim().toUpperCase();
  if (!term) return [];

  const q = query(
    collection(db, "users"),
    where("isPatient", "==", true),
    where("patientNumber", ">=", term),
    where("patientNumber", "<=", term + "\uf8ff"),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Legacy name search — kept as an admin/fallback tool, no longer the
// default patient-facing search flow.
export const searchPatients = async (searchTerm, maxResults = 20) => {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return [];

  const q = query(
    collection(db, "users"),
    where("isPatient", "==", true),
    where("searchableName", ">=", term),
    where("searchableName", "<=", term + "\uf8ff"),
    limit(maxResults),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const searchPatientsByPhone = async (phone) => {
  const q = query(
    collection(db, "users"),
    where("isPatient", "==", true),
    where("phone", "==", phone),
    limit(1),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const getPatientInfo = async (userId) => {
  const patientInfoRef = collection(db, "users", userId, "patientInfo");
  const q = query(patientInfoRef, orderBy("createdAt", "desc"), limit(1));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return null;
};

// ============================================
// PATIENT NUMBER (sequential, transaction-safe)
// ============================================
export const generatePatientNumber = async () => {
  const counterRef = doc(db, "counters", "patientNumber");
  const next = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const last = counterDoc.exists() ? counterDoc.data().lastValue : 0;
    const value = last + 1;
    transaction.set(counterRef, { lastValue: value }, { merge: true });
    return value;
  });
  return `VC-${String(next).padStart(6, "0")}`;
};

// ============================================
// DAILY QUEUE NUMBER (resets each day)
// ============================================
export const generateDailyQueueNumber = async () => {
  const today = new Date().toISOString().split("T")[0];
  const counterRef = doc(db, "counters", `queue_${today}`);
  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const last = counterDoc.exists() ? counterDoc.data().lastValue : 0;
    const next = last + 1;
    transaction.set(
      counterRef,
      { lastValue: next, date: today },
      { merge: true },
    );
    return next;
  });
};

// ============================================
// ON-DUTY STATUS (doctors)
// ============================================
export const setDutyStatus = async (userId, isOnDuty) => {
  await updateDoc(doc(db, "users", userId), {
    isOnDuty,
    updatedAt: serverTimestamp(),
  });
};

export const getOnDutyStaff = async (role) => {
  const q = query(
    collection(db, "users"),
    where("isStaff", "==", true),
    where("role", "==", role),
    where("isOnDuty", "==", true),
    where("isActive", "==", true),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ============================================
// NURSE ROOMS
// nurseRooms/{roomId}: { roomNumber, assignedNurseId, assignedNurseName,
//                        nurseOnDuty, isOccupied, currentRecordId }
// ============================================
export const createNurseRoom = async (roomNumber) => {
  return await addDoc(collection(db, "nurseRooms"), {
    roomNumber,
    assignedNurseId: null,
    assignedNurseName: null,
    nurseOnDuty: false,
    isOccupied: false,
    currentRecordId: null,
    createdAt: serverTimestamp(),
  });
};

export const getAllNurseRooms = async () => {
  const snapshot = await getDocs(collection(db, "nurseRooms"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Pairs a nurse with a room in one action (their "duty toggle").
export const nurseCheckIn = async (nurseId, nurseName, roomId, roomNumber) => {
  await updateDoc(doc(db, "nurseRooms", roomId), {
    assignedNurseId: nurseId,
    assignedNurseName: nurseName,
    nurseOnDuty: true,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", nurseId), {
    isOnDuty: true,
    dutyRoomId: roomId,
    dutyRoomNumber: roomNumber,
    updatedAt: serverTimestamp(),
  });
};

export const nurseCheckOut = async (nurseId, roomId) => {
  await updateDoc(doc(db, "nurseRooms", roomId), {
    nurseOnDuty: false,
    assignedNurseId: null,
    assignedNurseName: null,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", nurseId), {
    isOnDuty: false,
    dutyRoomId: null,
    dutyRoomNumber: null,
    updatedAt: serverTimestamp(),
  });
};

const findAvailableNurseRoom = async () => {
  const q = query(
    collection(db, "nurseRooms"),
    where("nurseOnDuty", "==", true),
    where("isOccupied", "==", false),
    limit(1),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
};

// ============================================
// DOCTOR ASSIGNMENT (least-busy on-duty doctor)
// ============================================
const assignLeastBusyDoctor = async () => {
  const onDutyDoctors = await getOnDutyStaff("doctor");
  if (onDutyDoctors.length === 0) return null;

  const activeQuery = query(
    collectionGroup(db, "MedicalRecords"),
    where("status", "==", "doctor"),
  );
  const snapshot = await getDocs(activeQuery);

  const load = {};
  onDutyDoctors.forEach((d) => {
    load[d.id] = 0;
  });
  snapshot.docs.forEach((d) => {
    const id = d.data().assignedDoctorId;
    if (id in load) load[id]++;
  });

  const chosen = onDutyDoctors.reduce(
    (min, d) => (load[d.id] < load[min.id] ? d : min),
    onDutyDoctors[0],
  );
  return { id: chosen.id, name: `${chosen.firstName} ${chosen.lastName}` };
};

// Manual overrides — exposed to admin/receptionist for reassignment.
export const reassignDoctor = async (
  patientId,
  recordId,
  doctorId,
  doctorName,
) => {
  await updateDoc(doc(db, "users", patientId, "MedicalRecords", recordId), {
    assignedDoctorId: doctorId,
    assignedDoctorName: doctorName,
    updatedAt: serverTimestamp(),
  });
};

export const reassignNurseRoom = async (
  patientId,
  recordId,
  roomId,
  roomNumber,
  nurseId,
  nurseName,
) => {
  await updateDoc(doc(db, "users", patientId, "MedicalRecords", recordId), {
    assignedRoomId: roomId,
    assignedRoomNumber: roomNumber,
    assignedNurseId: nurseId,
    assignedNurseName: nurseName,
    updatedAt: serverTimestamp(),
  });
};

// ============================================
// MEDICATIONS CATALOG (with stock)
// ============================================
export const getMedications = async () => {
  const snapshot = await getDocs(collection(db, "medications"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addMedicationToCatalog = async (medData) => {
  return await addDoc(collection(db, "medications"), {
    name: medData.name,
    dosageOptions: medData.dosageOptions || [],
    unitPrice: parseFloat(medData.unitPrice) || 0,
    stock: parseInt(medData.stock) || 0,
    lowStockThreshold: parseInt(medData.lowStockThreshold) || 10,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateMedicationCatalog = async (medId, data) => {
  await updateDoc(doc(db, "medications", medId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// One transaction per line so concurrent dispenses can't oversell stock.
export const decrementMedicationStock = async (medicationId, quantity) => {
  const medRef = doc(db, "medications", medicationId);
  await runTransaction(db, async (transaction) => {
    const medDoc = await transaction.get(medRef);
    if (!medDoc.exists()) return;
    const newStock = Math.max(0, (medDoc.data().stock || 0) - quantity);
    transaction.update(medRef, {
      stock: newStock,
      updatedAt: serverTimestamp(),
    });
  });
};

// ============================================
// MEDICAL RECORDS
// ============================================

export const createMedicalRecord = async (patientId, receptionData) => {
  const medicalRecordsRef = collection(
    db,
    "users",
    patientId,
    "MedicalRecords",
  );
  const queueNumber = await generateDailyQueueNumber();

  const recordData = {
    patientId,
    queueNumber,
    visitDate:
      receptionData.visitDate || new Date().toISOString().split("T")[0],
    visitTime: receptionData.visitTime || new Date().toTimeString().slice(0, 5),
    status: "reception",
    reception: {
      notes: receptionData.notes || "",
      services: receptionData.services || [],
      checkedInBy: receptionData.checkedInBy,
      checkedInAt: serverTimestamp(),
    },
    vitals: null,
    doctor: null,
    pharmacy: null,
    billing: null,
    assignedNurseId: null,
    assignedRoomId: null,
    assignedRoomNumber: null,
    assignedDoctorId: null,
    assignedDoctorName: null,
    stageTimestamps: {
      receptionAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(medicalRecordsRef, recordData);
  return { id: docRef.id, ...recordData };
};

// Returns any medical record for this patient that hasn't reached 'completed' yet.
export const getActivePatientRecord = async (patientId) => {
  const medicalRecordsRef = collection(
    db,
    "users",
    patientId,
    "MedicalRecords",
  );
  const q = query(
    medicalRecordsRef,
    where("status", "in", [
      "reception",
      "nurse",
      "doctor",
      "pharmacy",
      "billing",
    ]),
    orderBy("createdAt", "desc"),
    limit(1),
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
};

export const getPatientMedicalRecords = async (
  patientId,
  statusFilter = null,
) => {
  const medicalRecordsRef = collection(
    db,
    "users",
    patientId,
    "MedicalRecords",
  );
  let constraints = [orderBy("createdAt", "desc")];

  if (statusFilter) {
    constraints.unshift(where("status", "==", statusFilter));
  }

  const q = query(medicalRecordsRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const getMedicalRecord = async (patientId, recordId) => {
  const docRef = doc(db, "users", patientId, "MedicalRecords", recordId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

// Auto-assigns an on-duty nurse room; if none are free, leaves it
// unassigned so staff can reassign manually once a room opens up.
export const sendToNurse = async (patientId, recordId) => {
  const room = await findAvailableNurseRoom();
  if (room) {
    await updateDoc(doc(db, "nurseRooms", room.id), {
      isOccupied: true,
      currentRecordId: recordId,
      updatedAt: serverTimestamp(),
    });
  }

  await updateDoc(doc(db, "users", patientId, "MedicalRecords", recordId), {
    status: "nurse",
    assignedRoomId: room?.id || null,
    assignedRoomNumber: room?.roomNumber || null,
    assignedNurseId: room?.assignedNurseId || null,
    assignedNurseName: room?.assignedNurseName || null,
    "stageTimestamps.nurseAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateVitals = async (patientId, recordId, vitalsData) => {
  // Free up the nurse room this record was occupying.
  const recordSnap = await getDoc(
    doc(db, "users", patientId, "MedicalRecords", recordId),
  );
  const roomId = recordSnap.exists() ? recordSnap.data().assignedRoomId : null;
  if (roomId) {
    await updateDoc(doc(db, "nurseRooms", roomId), {
      isOccupied: false,
      currentRecordId: null,
      updatedAt: serverTimestamp(),
    });
  }

  const doctor = await assignLeastBusyDoctor();

  await updateDoc(doc(db, "users", patientId, "MedicalRecords", recordId), {
    status: "doctor",
    assignedDoctorId: doctor?.id || null,
    assignedDoctorName: doctor?.name || null,
    vitals: {
      temperature: vitalsData.temperature,
      weight: vitalsData.weight,
      height: vitalsData.height,
      bloodPressure: vitalsData.bloodPressure,
      pulse: vitalsData.pulse,
      spo2: vitalsData.spo2,
      notes: vitalsData.notes || "",
      services: [NURSE_AUTO_SERVICE],
      flags: vitalsData.flags || [],
      recordedBy: vitalsData.recordedBy,
      recordedAt: serverTimestamp(),
    },
    "stageTimestamps.doctorAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// doctorData.sendToPharmacy (bool) decides whether the visit routes through
// the pharmacy stage or skips straight to billing.
export const updateDoctorDiagnosis = async (
  patientId,
  recordId,
  doctorData,
) => {
  const docRef = doc(db, "users", patientId, "MedicalRecords", recordId);
  const sendToPharmacy = doctorData.sendToPharmacy !== false;

  await updateDoc(docRef, {
    status: sendToPharmacy ? "pharmacy" : "billing",
    doctor: {
      diagnosis: doctorData.diagnosis,
      symptoms: doctorData.symptoms || "",
      notesForNextVisit: doctorData.notesForNextVisit || "",
      services: doctorData.services || [],
      prescriptions: doctorData.prescriptions || [],
      sendToPharmacy,
      recordedBy: doctorData.recordedBy,
      recordedAt: serverTimestamp(),
    },
    [`stageTimestamps.${sendToPharmacy ? "pharmacyAt" : "billingAt"}`]:
      serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updatePharmacy = async (patientId, recordId, pharmacyData) => {
  const medications = pharmacyData.medications || [];

  await Promise.all(
    medications
      .filter((m) => m.medicationId)
      .map((m) =>
        decrementMedicationStock(m.medicationId, parseInt(m.quantity) || 0),
      ),
  );

  await updateDoc(doc(db, "users", patientId, "MedicalRecords", recordId), {
    status: "billing",
    pharmacy: {
      medications,
      services: pharmacyData.services || [],
      dispensedBy: pharmacyData.dispensedBy,
      dispensedAt: serverTimestamp(),
    },
    "stageTimestamps.billingAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const completeBilling = async (patientId, recordId, billingData) => {
  await updateDoc(doc(db, "users", patientId, "MedicalRecords", recordId), {
    status: "completed",
    billing: {
      totalAmount: billingData.totalAmount,
      servicesTotal: billingData.servicesTotal || 0,
      medicationsTotal: billingData.medicationsTotal || 0,
      paid: billingData.paid || false,
      paymentMethod: billingData.paymentMethod || "",
      billedBy: billingData.billedBy,
      billedAt: serverTimestamp(),
    },
    "stageTimestamps.completedAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getActiveMedicalRecords = async (statusFilter = null) => {
  const recordsQuery = statusFilter
    ? query(
        collectionGroup(db, "MedicalRecords"),
        where("status", "==", statusFilter),
        orderBy("createdAt", "desc"),
      )
    : query(
        collectionGroup(db, "MedicalRecords"),
        where("status", "in", [
          "reception",
          "nurse",
          "doctor",
          "pharmacy",
          "billing",
        ]),
        orderBy("createdAt", "desc"),
      );

  const snapshot = await getDocs(recordsQuery);
  return snapshot.docs.map((doc) => {
    const path = doc.ref.path.split("/");
    return {
      id: doc.id,
      patientId: path[1],
      ...doc.data(),
    };
  });
};

// Completed records from the last 24 hours only (for the "Completed" filter tab).
export const getRecentlyCompletedRecords = async (sinceDate) => {
  const cutoff = Timestamp.fromDate(sinceDate);

  const recordsQuery = query(
    collectionGroup(db, "MedicalRecords"),
    where("status", "==", "completed"),
    where("updatedAt", ">=", cutoff),
    orderBy("updatedAt", "desc"),
  );

  const snapshot = await getDocs(recordsQuery);
  return snapshot.docs.map((doc) => {
    const path = doc.ref.path.split("/");
    return {
      id: doc.id,
      patientId: path[1],
      ...doc.data(),
    };
  });
};

// Batch write for audit logs
export const batchWrite = async (operations) => {
  const batch = writeBatch(db);
  operations.forEach(({ type, collectionName, docId, data }) => {
    const ref = doc(db, collectionName, docId);
    if (type === "set") batch.set(ref, data);
    if (type === "update") batch.update(ref, data);
    if (type === "delete") batch.delete(ref);
  });
  await batch.commit();
};
