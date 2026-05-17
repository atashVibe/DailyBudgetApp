import { Platform } from "react-native";

import {
    GoogleAuthProvider,
    signInWithCredential,
    signInWithPopup,
} from "firebase/auth";

import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { auth } from "./auth";

GoogleSignin.configure({
  webClientId:
    "420817333542-n030vokg3pavpn571m584neqqrqo4qef.apps.googleusercontent.com",
});

export const signInWithGoogle = async () => {
  // WEB LOGIN
  if (Platform.OS === "web") {
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);

    return result.user;
  }

  // PHONE LOGIN
  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();

  const idToken = response.data?.idToken;

  if (!idToken) {
    throw new Error("No Google ID token found.");
  }

  const googleCredential = GoogleAuthProvider.credential(idToken);

  const userCredential = await signInWithCredential(auth, googleCredential);

  return userCredential.user;
};
