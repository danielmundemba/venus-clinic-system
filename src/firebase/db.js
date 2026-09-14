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
export const setDutyStatus = async (
  userId,
  isOnDuty,
  dutyRoomNumber = null,
) => {
  await updateDoc(doc(db, "users", userId), {
    isOnDuty,
    dutyRoomNumber: isOnDuty ? dutyRoomNumber : null,
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
// A room can host multiple nurses at once (nurses: [{nurseId, nurseName}]),
// and each nurse can be actively seeing at most one patient at a time
// (occupants: [{recordId, nurseId, nurseName}]). A room is "available" for
// a new patient whenever it has at least one nurse without a current
// occupant entry.
// ============================================
export const createNurseRoom = async (roomNumber) => {
  return await addDoc(collection(db, "nurseRooms"), {
    roomNumber,
    nurses: [],
    occupants: [],
    createdAt: serverTimestamp(),
  });
};

export const getAllNurseRooms = async () => {
  const snapshot = await getDocs(collection(db, "nurseRooms"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Rooms with at least one nurse free to take a new patient.
export const getAvailableNurseRooms = async () => {
  const rooms = await getAllNurseRooms();
  return rooms.filter((r) => pickNurseFromRoom(r) !== null);
};

export const nurseCheckIn = async (nurseId, nurseName, roomId, roomNumber) => {
  const roomRef = doc(db, "nurseRooms", roomId);
  const roomSnap = await getDoc(roomRef);
  const nurses = roomSnap.exists() ? roomSnap.data().nurses || [] : [];
  if (!nurses.some((n) => n.nurseId === nurseId)) {
    nurses.push({ nurseId, nurseName });
  }
  await updateDoc(roomRef, { nurses, updatedAt: serverTimestamp() });
  await updateDoc(doc(db, "users", nurseId), {
    isOnDuty: true,
    dutyRoomId: roomId,
    dutyRoomNumber: roomNumber,
    updatedAt: serverTimestamp(),
  });
};

export const nurseCheckOut = async (nurseId, roomId) => {
  const roomRef = doc(db, "nurseRooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (roomSnap.exists()) {
    const data = roomSnap.data();
    const occupants = data.occupants || [];
    if (occupants.some((o) => o.nurseId === nurseId)) {
      throw new Error(
        "You still have a patient assigned — finish their vitals before going off duty.",
      );
    }
    const nurses = (data.nurses || []).filter((n) => n.nurseId !== nurseId);
    await updateDoc(roomRef, { nurses, updatedAt: serverTimestamp() });
  }
  await updateDoc(doc(db, "users", nurseId), {
    isOnDuty: false,
    dutyRoomId: null,
    dutyRoomNumber: null,
    updatedAt: serverTimestamp(),
  });
};

// A nurse in `room.nurses` who doesn't currently have an occupant entry.
const pickNurseFromRoom = (room) => {
  const busyNurseIds = new Set((room.occupants || []).map((o) => o.nurseId));
  return (room.nurses || []).find((n) => !busyNurseIds.has(n.nurseId)) || null;
};

const findAvailableNurseRoom = async () => {
  const rooms = await getAllNurseRooms();
  for (const room of rooms) {
    const nurse = pickNurseFromRoom(room);
    if (nurse) return { room, nurse };
  }
  return null;
};

// ============================================
// DOCTOR ASSIGNMENT (least-busy on-duty doctor)
// Counts both 'nurse' and 'doctor' stage records, since a doctor is
// assigned as soon as the patient is sent to the nurse.
// ============================================
const assignLeastBusyDoctor = async () => {
  const onDutyDoctors = await getOnDutyStaff("doctor");
  if (onDutyDoctors.length === 0) return null;

  const activeQuery = query(
    collectionGroup(db, "MedicalRecords"),
    where("status", "in", ["nurse", "doctor"]),
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
  return {
    id: chosen.id,
    name: `${chosen.firstName} ${chosen.lastName}`,
    room: chosen.dutyRoomNumber || null,
  };
};

export const reassignDoctor = async (
  patientId,
  recordId,
  doctorId,
  doctorName,
  doctorRoom = null,
) => {
  await updateDoc(doc(db, "users", patientId, "MedicalRecords", recordId), {
    assignedDoctorId: doctorId,
    assignedDoctorName: doctorName,
    assignedDoctorRoom: doctorRoom,
    updatedAt: serverTimestamp(),
  });
};

// newRoomId only — a free nurse within that room is picked automatically.
export const reassignNurseRoom = async (patientId, recordId, newRoomId) => {
  const recordRef = doc(db, "users", patientId, "MedicalRecords", recordId);
  const recordSnap = await getDoc(recordRef);
  const existing = recordSnap.exists() ? recordSnap.data() : {};

  if (existing.assignedRoomId && existing.assignedRoomId !== newRoomId) {
    const oldRoomRef = doc(db, "nurseRooms", existing.assignedRoomId);
    const oldRoomSnap = await getDoc(oldRoomRef);
    if (oldRoomSnap.exists()) {
      const occupants = (oldRoomSnap.data().occupants || []).filter(
        (o) => o.recordId !== recordId,
      );
      await updateDoc(oldRoomRef, { occupants, updatedAt: serverTimestamp() });
    }
  }

  const newRoomRef = doc(db, "nurseRooms", newRoomId);
  const newRoomSnap = await getDoc(newRoomRef);
  if (!newRoomSnap.exists()) throw new Error("Room not found");
  const newRoom = { id: newRoomSnap.id, ...newRoomSnap.data() };
  const nurse = pickNurseFromRoom(newRoom);
  if (!nurse) throw new Error("No free nurse in that room right now");

  const occupants = [
    ...(newRoom.occupants || []).filter((o) => o.recordId !== recordId),
    { recordId, nurseId: nurse.nurseId, nurseName: nurse.nurseName },
  ];
  await updateDoc(newRoomRef, { occupants, updatedAt: serverTimestamp() });

  await updateDoc(recordRef, {
    assignedRoomId: newRoom.id,
    assignedRoomNumber: newRoom.roomNumber,
    assignedNurseId: nurse.nurseId,
    assignedNurseName: nurse.nurseName,
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
    assignedDoctorRoom: null,
    stageTimestamps: {
      receptionAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(medicalRecordsRef, recordData);
  return { id: docRef.id, ...recordData };
};

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

export const sendToNurse = async (patientId, recordId, roomId = null) => {
  let room = null;
  let nurse = null;

  if (roomId) {
    const roomSnap = await getDoc(doc(db, "nurseRooms", roomId));
    if (roomSnap.exists()) {
      room = { id: roomSnap.id, ...roomSnap.data() };
      nurse = pickNurseFromRoom(room);
    }
  } else {
    const found = await findAvailableNurseRoom();
    if (found) {
      room = found.room;
      nurse = found.nurse;
    }
  }

  if (room && nurse) {
    const occupants = [
      ...(room.occupants || []),
      { recordId, nurseId: nurse.nurseId, nurseName: nurse.nurseName },
    ];
    await updateDoc(doc(db, "nurseRooms", room.id), {
      occupants,
      updatedAt: serverTimestamp(),
    });
  }

  const doctor = await assignLeastBusyDoctor();

  await updateDoc(doc(db, "users", patientId, "MedicalRecords", recordId), {
    status: "nurse",
    assignedRoomId: room?.id || null,
    assignedRoomNumber: room?.roomNumber || null,
    assignedNurseId: nurse?.nurseId || null,
    assignedNurseName: nurse?.nurseName || null,
    assignedDoctorId: doctor?.id || null,
    assignedDoctorName: doctor?.name || null,
    assignedDoctorRoom: doctor?.room || null,
    "stageTimestamps.nurseAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateVitals = async (patientId, recordId, vitalsData) => {
  const recordSnap = await getDoc(
    doc(db, "users", patientId, "MedicalRecords", recordId),
  );
  const existing = recordSnap.exists() ? recordSnap.data() : {};

  if (existing.assignedRoomId) {
    const roomRef = doc(db, "nurseRooms", existing.assignedRoomId);
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      const occupants = (roomSnap.data().occupants || []).filter(
        (o) => o.recordId !== recordId,
      );
      await updateDoc(roomRef, { occupants, updatedAt: serverTimestamp() });
    }
  }

  let doctorId = existing.assignedDoctorId || null;
  let doctorName = existing.assignedDoctorName || null;
  let doctorRoom = existing.assignedDoctorRoom || null;
  if (!doctorId) {
    const doctor = await assignLeastBusyDoctor();
    doctorId = doctor?.id || null;
    doctorName = doctor?.name || null;
    doctorRoom = doctor?.room || null;
  }

  await updateDoc(doc(db, "users", patientId, "MedicalRecords", recordId), {
    status: "doctor",
    assignedDoctorId: doctorId,
    assignedDoctorName: doctorName,
    assignedDoctorRoom: doctorRoom,
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

export const generatePatientNumberForUser = async (userId) => {
  const patientNumber = await generatePatientNumber();
  await updateDoc(doc(db, "users", userId), {
    patientNumber,
    updatedAt: serverTimestamp(),
  });
  return patientNumber;
};

export const searchPatientsUnified = async (searchTerm, maxResults = 20) => {
  const term = searchTerm.trim();
  if (!term) return [];

  const [byNumber, byName] = await Promise.all([
    searchPatientsByNumber(term, maxResults),
    searchPatients(term, maxResults),
  ]);

  const merged = [...byNumber];
  const seenIds = new Set(merged.map((p) => p.id));
  byName.forEach((p) => {
    if (!seenIds.has(p.id)) {
      merged.push(p);
      seenIds.add(p.id);
    }
  });
  return merged.slice(0, maxResults);
};
