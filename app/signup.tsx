import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../services/auth";

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      setMessage(`Account created: ${userCredential.user.email}`);
      setTimeout(() => router.push("/login"), 1000);
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  return (
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
        Create Account
      </Text>

      <Text
        style={{
          fontSize: 16,
          textAlign: "center",
          marginBottom: 32,
          color: "#555",
        }}
      >
        Start using DailyBudget
      </Text>

      <Text style={{ marginBottom: 8, fontSize: 16 }}>Email</Text>
      <TextInput
        placeholder="Enter your email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          marginBottom: 16,
        }}
      />

      <Text style={{ marginBottom: 8, fontSize: 16 }}>Password</Text>
      <TextInput
        placeholder="Create a password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          marginBottom: 16,
        }}
      />

      <Text style={{ marginBottom: 8, fontSize: 16 }}>Confirm Password</Text>
      <TextInput
        placeholder="Confirm your password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          marginBottom: 24,
        }}
      />

      <TouchableOpacity
        onPress={handleSignup}
        style={{
          backgroundColor: "#111",
          padding: 16,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          Create Account
        </Text>
      </TouchableOpacity>

      {message ? (
        <Text
          style={{
            textAlign: "center",
            marginTop: 12,
            color: "green",
            fontSize: 16,
          }}
        >
          {message}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={() => router.push("/login")}
        style={{
          padding: 16,
          borderRadius: 10,
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <Text style={{ color: "#111", fontSize: 16 }}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}