import { useEffect, useState } from "react";
import { useResumeConnection } from "../hooks/useResumeConnection";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";
import "react-native-reanimated";
import "../services/googleAuth";
import { useFonts } from "expo-font";
import { View, ActivityIndicator } from "react-native";
import { uiTokens } from "./components/common/dashboardStyles";

export default function RootLayout() {
  useResumeConnection();
  const [fontWaitEnded, setFontWaitEnded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontWaitEnded(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  const [loaded, error] = useFonts({ Inter: require("../assets/Inter.ttf") });
  if (!loaded && !error && !fontWaitEnded)
    return (
      <View
        accessibilityLabel="Loading DailyBudget"
        accessibilityState={{ busy: true }}
        style={{
          flex: 1,
          backgroundColor: uiTokens.page,
          justifyContent: "center",
          padding: 24,
          gap: 16,
        }}
      >
        <View
          style={{
            height: 24,
            width: "60%",
            backgroundColor: uiTokens.border,
            borderRadius: 8,
          }}
        />
        <View
          style={{
            height: 120,
            backgroundColor: uiTokens.border,
            borderRadius: 12,
          }}
        />
        <ActivityIndicator color={uiTokens.pressed} />
      </View>
    );
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(drawer)" />
      </Stack>

      <StatusBar style="auto" />
    </>
  );
}
