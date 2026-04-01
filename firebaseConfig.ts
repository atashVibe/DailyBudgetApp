// Firebase config file

import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyADYfdaVD9-yOj7tln_fZX7XMsfC7oCaGI",
  authDomain: "dailybudget-35c26.firebaseapp.com",
  projectId: "dailybudget-35c26",
  storageBucket: "dailybudget-35c26.firebasestorage.app",
  messagingSenderId: "420817333542",
  appId: "1:420817333542:web:226281ebfb861df48625e7",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);