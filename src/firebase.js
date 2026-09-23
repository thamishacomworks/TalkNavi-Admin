import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCjQF4tsgYHdT-bsIiuIr19t9czhRLtl_Y",
  authDomain: "talk-bridge-bbdbc.firebaseapp.com",
  projectId: "talk-bridge-bbdbc",
  storageBucket: "talk-bridge-bbdbc.firebasestorage.app",
  messagingSenderId: "847758218919",
  appId: "1:847758218919:web:c955dc97ef22f91d85ed82"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const storage = getStorage(app, "gs://talk-bridge-bbdbc.firebasestorage.app");