import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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
const db = getFirestore(app);

const collectionsToClear = ['tasks', 'suppliers', 'offers', 'offer_items', 'schedule', 'catalogs', 'settings'];

async function purgeDb() {
  for (const colName of collectionsToClear) {
    console.log(`Clearing collection: ${colName}`);
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);
    let count = 0;
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, colName, d.id));
      count++;
    }
    console.log(`Deleted ${count} documents from ${colName}`);
  }
  console.log("Database purge complete.");
}

purgeDb();
