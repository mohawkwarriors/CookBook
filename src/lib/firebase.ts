import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBpTROSdJqks5gs1BKm-3CV5jNjmD5oLTg",
  authDomain: "cookbook-4b972.firebaseapp.com",
  projectId: "cookbook-4b972",
  storageBucket: "cookbook-4b972.firebasestorage.app",
  messagingSenderId: "27985173135",
  appId: "1:27985173135:web:82ea775c733100eddaaefa",
  measurementId: "G-NDGN89RS58"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore (default database for user-provided projects)
export const db = getFirestore(app);
