import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: "sanguine-spot-707pf",
  appId: "1:828985697135:web:c192cdde676699b3a3be9a",
  apiKey: "AIzaSyCA87GNNcS01iK3uOclCfpNiuaRUpbaQJw",
  authDomain: "sanguine-spot-707pf.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-9719adc6-2af1-4cef-bcc0-a2b3bbdc3441",
  storageBucket: "sanguine-spot-707pf.firebasestorage.app",
  messagingSenderId: "828985697135",
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID provisioned
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
