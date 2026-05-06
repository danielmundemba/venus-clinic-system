import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBaOZq2OsYe39sV4iicJ8OA789fYgMW1eY",
  authDomain: "venus-clinic-system.firebaseapp.com",
  projectId: "venus-clinic-system",
  storageBucket: "venus-clinic-system.firebasestorage.app",
  messagingSenderId: "321143099761",
  appId: "1:321143099761:web:88a984bc85c5a8d62026d0",
  measurementId: "G-4HGP5KZ34C"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence enabled in first tab only');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline persistence');
  }
});

export default app;