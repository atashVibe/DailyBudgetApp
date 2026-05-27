import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { auth, db } from "../services/auth";

export default function Index() {
  const [initializing, setInitializing] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasUserProfile, setHasUserProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);

      if (!user) {
        setHasUserProfile(false);
        setInitializing(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      setHasUserProfile(userSnap.exists());
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isLoggedIn && hasUserProfile) {
    return <Redirect href="/(drawer)/dashboard" />;
  }

  if (isLoggedIn && !hasUserProfile) {
    return <Redirect href="/signup" />;
  }

  return <Redirect href="/login" />;
}


