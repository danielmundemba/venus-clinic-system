import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";
import app from "./config";
import { auth, db } from "./config";
import { generatePatientNumber } from "./db";

export const registerStaff = async (email, password, staffData) => {
  const { initializeApp, deleteApp } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");

  const secondaryApp = initializeApp(
    {
      apiKey: "AIzaSyBaOZq2OsYe39sV4iicJ8OA789fYgMW1eY",
      authDomain: "venus-clinic-system.firebaseapp.com",
      projectId: "venus-clinic-system",
      storageBucket: "venus-clinic-system.firebasestorage.app",
      messagingSenderId: "321143099761",
      appId: "1:321143099761:web:88a984bc85c5a8d62026d0",
      measurementId: "G-4HGP5KZ34C",
    },
    "staff-secondary",
  );

  const secondaryAuth = getAuth(secondaryApp);

  try {
    const { user } = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password,
    );
    const uid = user.uid;

    await updateProfile(user, {
      displayName: `${staffData.firstName} ${staffData.lastName}`,
    });

    // Generated on the main db connection (not the secondary auth app) —
    // this is what was missing before, which is why staff accounts
    // created from User Management never got a searchable Patient ID.
    const patientNumber = await generatePatientNumber();

    await setDoc(doc(db, "users", uid), {
      firstName: staffData.firstName,
      lastName: staffData.lastName,
      fullName: `${staffData.firstName} ${staffData.lastName}`,
      patientNumber,
      searchableName:
        staffData.searchableName ||
        `${staffData.firstName.toLowerCase()} ${staffData.lastName.toLowerCase()}`,
      email,
      phone: staffData.phone || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      role: staffData.role,
      isActive: true,
      isStaff: true,
      isPatient: true,
      isOnDuty: false,
    });

    const patientInfoRef = collection(db, "users", uid, "patientInfo");
    const patientInfoDoc = await addDoc(patientInfoRef, {
      DOB: staffData.DOB || null,
      gender: staffData.gender || "other",
      age: staffData.age || null,
      nrcNumber: staffData.nrcNumber || null,
      address: staffData.address || null,
      emergencyContactName: staffData.emergencyContactName || null,
      emergencyContactPhone: staffData.emergencyContactPhone || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await secondaryAuth.signOut();
    await deleteApp(secondaryApp);

    return {
      user,
      uid,
      patientNumber,
      patientInfoId: patientInfoDoc.id,
    };
  } catch (error) {
    try {
      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);
    } catch (e) {
      /* ignore cleanup errors */
    }
    throw error;
  }
};

export const registerPatient = async (email, password, patientData) => {
  const { initializeApp, deleteApp } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");

  const secondaryApp = initializeApp(
    {
      apiKey: "AIzaSyBaOZq2OsYe39sV4iicJ8OA789fYgMW1eY",
      authDomain: "venus-clinic-system.firebaseapp.com",
      projectId: "venus-clinic-system",
      storageBucket: "venus-clinic-system.firebasestorage.app",
      messagingSenderId: "321143099761",
      appId: "1:321143099761:web:88a984bc85c5a8d62026d0",
      measurementId: "G-4HGP5KZ34C",
    },
    "patient-secondary",
  );

  const secondaryAuth = getAuth(secondaryApp);

  try {
    const { user } = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password,
    );
    const uid = user.uid;

    await updateProfile(user, {
      displayName: `${patientData.firstName} ${patientData.lastName}`,
    });

    const patientNumber = await generatePatientNumber();

    await setDoc(doc(db, "users", uid), {
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      fullName: `${patientData.firstName} ${patientData.lastName}`,
      patientNumber,
      searchableName:
        patientData.searchableName ||
        `${patientData.firstName.toLowerCase()} ${patientData.lastName.toLowerCase()}`,
      email,
      phone: patientData.phone,
      allergies: patientData.allergies || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      role: "patient",
      isActive: true,
      isStaff: false,
      isPatient: true,
    });

    const patientInfoRef = collection(db, "users", uid, "patientInfo");
    const patientInfoDoc = await addDoc(patientInfoRef, {
      DOB: patientData.DOB,
      gender: patientData.gender,
      age: patientData.age,
      nrcNumber: patientData.nrcNumber || null,
      address: patientData.address,
      emergencyContactName: patientData.emergencyContactName || null,
      emergencyContactPhone: patientData.emergencyContactPhone || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await secondaryAuth.signOut();
    await deleteApp(secondaryApp);

    return {
      user,
      uid,
      patientNumber,
      patientInfoId: patientInfoDoc.id,
    };
  } catch (error) {
    try {
      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);
    } catch (e) {
      /* ignore cleanup errors */
    }
    throw error;
  }
};

export const loginUser = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const getUserRole = async (uid) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data().role;
  }
  return null;
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
