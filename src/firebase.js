import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD7hHUAX_SeULmDIz7scgL8WDUAeM8W66w",
  authDomain: "gestion-de-tareas-disoc.firebaseapp.com",
  projectId: "gestion-de-tareas-disoc",
  storageBucket: "gestion-de-tareas-disoc.firebasestorage.app",
  messagingSenderId: "106110422058",
  appId: "1:106110422058:web:f45e583cd7bc7780dd8753",
  measurementId: "G-N2S9JP4DWE"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
