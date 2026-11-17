import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { auth, db } from "../services/auth";
import { withTimeout, restartCloudConnection } from "../services/loading";
import PrimaryButton from "./components/common/PrimaryButton";
export default function Index() {
  const [state, setState] = useState<
    "loading" | "login" | "dashboard" | "signup"
  >("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setState("loading");
    const timer = setTimeout(() => {
      if (active)
        setError(
          "Sign-in restoration is taking too long. Check your connection and retry.",
        );
    }, 16000);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          if (active) {
            clearTimeout(timer);
            setState("login");
          }
          return;
        }
        const profile = await withTimeout(getDoc(doc(db, "users", user.uid)));
        if (!profile.exists() && profile.metadata.fromCache)
          throw new Error(
            "Reconnect to verify your account. Your sign-in has been kept.",
          );
        if (active) {
          setError("");
          setState(profile.exists() ? "dashboard" : "signup");
        }
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not restore your account. Please retry.",
          );
      } finally {
        clearTimeout(timer);
      }
    });
    return () => {
      active = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [attempt]);
  if (error)
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
        <Text>{error}</Text>
        <PrimaryButton
          title="Retry loading account"
          onPress={() => {
            void restartCloudConnection().finally(() =>
              setAttempt((value) => value + 1),
            );
          }}
        />
      </View>
    );
  if (state === "loading")
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Restoring your account…</Text>
      </View>
    );
  return (
    <Redirect
      href={
        state === "dashboard"
          ? "/(drawer)/dashboard"
          : state === "signup"
            ? "/signup"
            : "/login"
      }
    />
  );
}
