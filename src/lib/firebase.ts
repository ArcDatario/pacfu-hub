import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";
import { getStorage } from 'firebase/storage';

// Firebase configuration - Replace these with your actual Firebase config
export const firebaseConfig = {
  apiKey: "AIzaSyB7sqIUVHT5FLyaNPlVhr_moe_RjjhHIpU",
  authDomain: "pacfu-portal.firebaseapp.com",
  projectId: "pacfu-portal",
  storageBucket: "pacfu-portal.firebasestorage.app",
  messagingSenderId: "200278852782",
  appId: "1:200278852782:web:46f540cb0a53a7dcd1993f",
  measurementId: "G-RG6ES78BKK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
