import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyD0Rd1x832X_-obd5mBWRbmScJVCKT3bOE",
  authDomain: "frazionamenti.firebaseapp.com",
  projectId: "frazionamenti",
  storageBucket: "frazionamenti.firebasestorage.app",
  messagingSenderId: "894206123978",
  appId: "1:894206123978:web:4734b173be8788729af933"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
