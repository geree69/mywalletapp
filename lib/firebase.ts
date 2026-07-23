import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1VN1Do5lvZddRvlVnF9d-jk4mX--2G4k",
  authDomain: "financial-care-e0dfb.firebaseapp.com",
  projectId: "financial-care-e0dfb",
  storageBucket: "financial-care-e0dfb.firebasestorage.app",
  messagingSenderId: "49643048374",
  appId: "1:49643048374:web:d98687a96adc91d08ec517"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };