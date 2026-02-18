import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCXTGBnNB4IVGCzCzng2nKUQIMfHI21qOo",
  authDomain: "veee-79a1f.firebaseapp.com",
  projectId: "veee-79a1f",
  storageBucket: "veee-79a1f.firebasestorage.app",
  messagingSenderId: "828364802993",
  appId: "1:828364802993:web:f9c3dc196693fe6aa64b90",
  measurementId: "G-62MHC07WC4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize analytics with error handling
export const analytics = (() => {
  try {
    return typeof window !== 'undefined' ? getAnalytics(app) : null;
  } catch (error) {
    console.warn('Analytics blocked or unavailable:', error);
    return null;
  }
})();

export default app;
