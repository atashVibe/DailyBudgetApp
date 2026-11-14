import { initializeApp } from "firebase/app";
import googleServices from "./google-services.json";

// These are public Firebase client settings, already shipped with the Android
// app. Auth and Firestore can use them on web too; neither requires a web appId.
// Keep environment overrides for separate test projects and web registrations.
const project = googleServices.project_info;
const client = googleServices.client.find(
  (entry) =>
    entry.client_info.android_client_info.package_name ===
    "com.atashvibe.dailybudget",
);

const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY || client?.api_key[0]?.current_key,
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    `${project.project_id}.firebaseapp.com`,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || project.project_id,
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || project.storage_bucket,
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || project.project_number,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
