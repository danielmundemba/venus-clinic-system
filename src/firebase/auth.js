import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import app from './config';           // Default import
import { auth, db } from './config';  // Named imports

/**
 * Register a new staff user (admin, doctor, receptionist, pharmacist, nurse).
 * Uses a secondary Firebase auth instance so the current admin stays logged in.
 * Creates: auth user -> users/{uid} doc -> patientInfo subcollection
 * Staff are also patients — they get the same patientInfo structure.
 */
export const registerStaff = async (email, password, staffData) => {
  // Dynamically import to create a secondary Firebase app instance
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');

  const secondaryApp = initializeApp({
    apiKey: "AIzaSyBaOZq2OsYe39sV4iicJ8OA789fYgMW1eY",
    authDomain: "venus-clinic-system.firebaseapp.com",
    projectId: "venus-clinic-system",
    storageBucket: "venus-clinic-system.firebasestorage.app",
    messagingSenderId: "321143099761",
    appId: "1:321143099761:web:88a984bc85c5a8d62026d0",
    measurementId: "G-4HGP5KZ34C"
  }, 'staff-secondary');

  const secondaryAuth = getAuth(secondaryApp);

  try {
    // Step 1: Create auth user via secondary auth (admin stays logged in)
    const { user } = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = user.uid;

    // Step 2: Update auth profile
    await updateProfile(user, {
      displayName: `${staffData.firstName} ${staffData.lastName}`
    });

    // Step 3: Create user document in /users/{uid}
    await setDoc(doc(db, 'users', uid), {
      firstName: staffData.firstName,
      lastName: staffData.lastName,
      fullName: `${staffData.firstName} ${staffData.lastName}`,
      searchableName: staffData.searchableName || 
        `${staffData.firstName.toLowerCase()} ${staffData.lastName.toLowerCase()}`,
      email,
      phone: staffData.phone || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      role: staffData.role,
      isActive: true,
      isStaff: true,
      isPatient: true,
    });

    // Step 4: Create patientInfo subcollection (staff are also patients)
    const patientInfoRef = collection(db, 'users', uid, 'patientInfo');
    const patientInfoDoc = await addDoc(patientInfoRef, {
      DOB: staffData.DOB || null,
      gender: staffData.gender || 'other',
      age: staffData.age || null,
      nrcNumber: staffData.nrcNumber || null,
      address: staffData.address || null,
      emergencyContactName: staffData.emergencyContactName || null,
      emergencyContactPhone: staffData.emergencyContactPhone || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Step 5: Clean up — sign out and delete the secondary app
    await secondaryAuth.signOut();
    await deleteApp(secondaryApp);  // ✅ Fixed: use deleteApp(), not secondaryApp.delete()

    return { 
      user, 
      uid, 
      patientInfoId: patientInfoDoc.id 
    };
  } catch (error) {
    // Clean up secondary app on any error
    try {
      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);  // ✅ Fixed here too
    } catch (e) { /* ignore cleanup errors */ }
    throw error;
  }
};

/**
 * Register a new patient account.
 * Uses a secondary Firebase app instance so the current staff member stays logged in.
 */
export const registerPatient = async (email, password, patientData) => {
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');

  const secondaryApp = initializeApp({
    apiKey: "AIzaSyBaOZq2OsYe39sV4iicJ8OA789fYgMW1eY",
    authDomain: "venus-clinic-system.firebaseapp.com",
    projectId: "venus-clinic-system",
    storageBucket: "venus-clinic-system.firebasestorage.app",
    messagingSenderId: "321143099761",
    appId: "1:321143099761:web:88a984bc85c5a8d62026d0",
    measurementId: "G-4HGP5KZ34C"
  }, 'patient-secondary');

  const secondaryAuth = getAuth(secondaryApp);

  try {
    const { user } = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = user.uid;

    await updateProfile(user, {
      displayName: `${patientData.firstName} ${patientData.lastName}`
    });

    await setDoc(doc(db, 'users', uid), {
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      fullName: `${patientData.firstName} ${patientData.lastName}`,
      searchableName: patientData.searchableName || 
        `${patientData.firstName.toLowerCase()} ${patientData.lastName.toLowerCase()}`,
      email,
      phone: patientData.phone,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      role: 'patient',
      isActive: true,
      isStaff: false,
      isPatient: true,
    });

    const patientInfoRef = collection(db, 'users', uid, 'patientInfo');
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
    await deleteApp(secondaryApp);  // ✅ Fixed

    return { 
      user, 
      uid, 
      patientInfoId: patientInfoDoc.id 
    };
  } catch (error) {
    try {
      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);  // ✅ Fixed
    } catch (e) { /* ignore cleanup errors */ }
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
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data().role;
  }
  return null;
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};