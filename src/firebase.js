import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBvNxyUM0JzMrmMJ-x3ALTnIY_7EmqcqdQ",
  authDomain: "app-flussi.firebaseapp.com",
  projectId: "app-flussi",
  storageBucket: "app-flussi.firebasestorage.app",
  messagingSenderId: "274966515849",
  appId: "1:274966515849:web:f5760f523d14f3be427658"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
