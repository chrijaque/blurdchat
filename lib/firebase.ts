import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA8Pam2UO9Yk3n3DMWaZFqV8D9-o7EQddA",
  projectId: "blurdchat",
  authDomain: "blurdchat.firebaseapp.com",
  storageBucket: "blurdchat.appspot.com",
};

// Initialiser Firebase kun én gang
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db }; 