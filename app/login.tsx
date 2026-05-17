import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useCallback, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { auth } from "../services/auth";
import AppScreen from "./components/AppScreen";
import AppTextInput from "./components/AppTextInput";

export default function LoginScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  useFocusEffect(
    useCallback(() => {
      return () => {
        setEmail("");
        setPassword("");
        setMessage("");
      };
    }, []),
  );
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      setMessage(`Signed in: ${userCredential.user.email}`);
      setTimeout(() => router.push("/(drawer)/dashboard"), 1000);
    } catch (error: any) {
      setMessage(error.message);
    }
  };
  return (
    <AppScreen>
      <View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          padding: 24,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          DailyBudget
        </Text>

        <Text
          style={{
            fontSize: 16,
            textAlign: "center",
            marginBottom: 32,
            color: "#555",
          }}
        >
          Sign in to manage your budget
        </Text>

        <Text style={{ marginBottom: 8, fontSize: 16 }}>Email</Text>
        <AppTextInput
          placeholder="Enter your email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={{ marginBottom: 8, fontSize: 16 }}>Password</Text>
        <AppTextInput
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          onPress={handleLogin}
          style={{
            backgroundColor: "#111",
            padding: 16,
            borderRadius: 10,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Sign In
          </Text>
        </TouchableOpacity>

        {message ? (
          <Text
            style={{
              textAlign: "center",
              marginBottom: 12,
              color: message.includes("Signed in") ? "green" : "red",
              fontSize: 16,
            }}
          >
            {message}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={() => router.push("/signup")}
          style={{
            backgroundColor: "#f3f3f3",
            padding: 16,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#111", fontSize: 16, fontWeight: "600" }}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}
