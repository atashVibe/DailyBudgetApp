import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { Platform } from "react-native";
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
export const signInWithApple = async () => {
  // Apple Login does not work on Android.
  if (Platform.OS === "android") {
    throw new Error("Apple Sign-In is only available on iOS and web.");
  }

  // WEB LOGIN
  if (Platform.OS === "web") {
    const provider = new OAuthProvider("apple.com");

    const result = await signInWithPopup(auth, provider);

    return result.user;
  }

  // iPHONE LOGIN
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error("No Apple identity token found.");
  }

  const provider = new OAuthProvider("apple.com");

  const appleCredential = provider.credential({
    idToken: credential.identityToken,
  });

  const userCredential = await signInWithCredential(auth, appleCredential);

  return userCredential.user;
};
