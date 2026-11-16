import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { app } from "../firebaseConfig";

export const auth = getAuth(app);
export const db = getFirestore(app);

// Explicit development-only opt-in. Never active in exported production builds.
if (__DEV__ && process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === "1") {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
}
