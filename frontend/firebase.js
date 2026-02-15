// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY || "AIzaSyB2kwEUAxcvEWCT8ZAcmypFFHS8ITe49DE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "foodiefly-5ad1d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "foodiefly-5ad1d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "foodiefly-5ad1d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "782492046115",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:782492046115:web:3bd2dcd5cde08a78083296",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-B4MPYJ7ZSP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null

export { app, auth, analytics }
