import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBVpQ4rfByn4cJo8O-c34-V9rKr38G1h00",
  authDomain: "battlenight-3on3.firebaseapp.com",
  projectId: "battlenight-3on3",
  storageBucket: "battlenight-3on3.firebasestorage.app",
  messagingSenderId: "929735021504",
  appId: "1:929735021504:web:da13eb7f7323a758b72e25"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
