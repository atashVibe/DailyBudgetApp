import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { Platform } from "react-native";
import { auth } from "./auth";

if (Platform.OS !== "web") {
  GoogleSignin.configure({
    webClientId:
      "420817333542-n030vokg3pavpn571m584neqqrqo4qef.apps.googleusercontent.com",
  });
}

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
    provider.addScope("email");
    provider.addScope("name");

    const result = await signInWithPopup(auth, provider);

    return result.user;
  }

  // iPHONE LOGIN
  const isAvailable = await AppleAuthentication.isAvailableAsync();

  if (!isAvailable) {
    throw new Error("Apple Sign-In is not available on this device.");
  }

  // Firebase verifies this one-time nonce to prevent replay attacks.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const credential = await AppleAuthentication.signInAsync({
    nonce: hashedNonce,
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
    rawNonce,
  });

  const userCredential = await signInWithCredential(auth, appleCredential);

  // Apple only returns the user's name on the first authorization.
  // Preserve it in Firebase while it is available.
  if (!userCredential.user.displayName && credential.fullName) {
    const displayName = AppleAuthentication.formatFullName(
      credential.fullName,
    ).trim();

    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
  }

  return userCredential.user;
};
