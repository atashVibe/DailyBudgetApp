import {
  browserLocalPersistence,
  initializeAuth,
  connectAuthEmulator,
  getAuth,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Persistence } from "firebase/auth";
import { app } from "../firebaseConfig";

function persistentAuth() {
  try {
    if (Platform.OS === "web")
      return initializeAuth(app, {
        persistence: browserLocalPersistence,
      });
    // Metro resolves the native Firebase entry, whose persistence adapter is not in web typings.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const native = require("firebase/auth") as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
    };
    return initializeAuth(app, {
      persistence: native.getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if ((error as { code?: string }).code === "auth/already-initialized")
      return getAuth(app);
    throw error;
  }
}
export const auth = persistentAuth();
export const db = getFirestore(app);

// Explicit development-only opt-in. Never active in exported production builds.
if (__DEV__ && process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === "1") {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
}
