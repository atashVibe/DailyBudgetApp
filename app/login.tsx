import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "../services/auth";
import { signInWithApple, signInWithGoogle } from "../services/googleAuth";
import AppScreen from "./components/common/AppScreen";
import AppTextInput from "./components/common/AppTextInput";
import PrimaryButton from "./components/common/PrimaryButton";

export default function LoginScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (!password) {
      setMessage("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      setMessage(`Signed in: ${userCredential.user.email}`);
      setTimeout(() => router.push("/(drawer)/dashboard"), 1000);
    } catch (error: any) {
      if (error.code === "auth/invalid-credential") {
        setMessage("Incorrect email or password.");
      } else if (error.code === "auth/invalid-email") {
        setMessage("Please enter a valid email.");
      } else {
        setMessage("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setMessage("");

      const user = await signInWithGoogle();

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().activeFamilyId) {
        setMessage(`Signed in: ${user.email}`);

        setTimeout(() => {
          router.push("/(drawer)/dashboard");
        }, 1000);
      } else {
        setMessage("Please finish your family setup.");

        setTimeout(() => {
          router.push("/family-setup");
        }, 1000);
      }
    } catch (error: any) {
      console.log(error);

      setMessage("Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };
  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      setMessage("");

      const user = await signInWithApple();

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().activeFamilyId) {
        setMessage(`Signed in: ${user.email}`);

        setTimeout(() => {
          router.push("/(drawer)/dashboard");
        }, 1000);
      } else {
        setMessage("Please finish your family setup.");

        setTimeout(() => {
          router.push("/family-setup");
        }, 1000);
      }
    } catch (error: any) {
      console.log(error);

      setMessage("Apple sign-in failed.");
    } finally {
      setLoading(false);
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

        <View style={{ marginBottom: 12 }}>
          <PrimaryButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
          />
        </View>
        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={loading}
          style={{
            backgroundColor: "#ffffff",
            padding: 16,
            borderRadius: 10,
            alignItems: "center",
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#ccc",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#111", fontSize: 16, fontWeight: "600" }}>
            Continue with Google
          </Text>
        </TouchableOpacity>
        {false && Platform.OS !== "android" && (
          <TouchableOpacity
            onPress={handleAppleLogin}
            style={{
              backgroundColor: "#000000",
              padding: 16,
              borderRadius: 10,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
              Continue with Apple
            </Text>
          </TouchableOpacity>
        )}

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

        <PrimaryButton
          title="Create Account"
          onPress={() => router.push("/signup")}
        />
      </View>
    </AppScreen>
  );
}
