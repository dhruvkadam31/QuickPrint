// src/Firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

  const firebaseConfig = {
  apiKey: "AIzaSyAwULL9p2xuV3XuDzbk8fdZdhPnN3NajG4",
  authDomain: "quickprintapp-bd93c.firebaseapp.com",
  projectId: "quickprintapp-bd93c",
  storageBucket: "quickprintapp-bd93c.appspot.com",   // ✅ fix here
  messagingSenderId: "904001792260",
  appId: "1:904001792260:web:c9a16c2834935887e2c851"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app); // ✅ add storage
export default app;
