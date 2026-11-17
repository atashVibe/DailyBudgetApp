import { useResumeConnection } from "../hooks/useResumeConnection";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";
import "react-native-reanimated";
import "../services/googleAuth";

export default function RootLayout() {
  useResumeConnection();
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
