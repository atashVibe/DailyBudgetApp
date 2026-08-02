import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../services/auth";
import { signInWithApple, signInWithGoogle } from "../services/googleAuth";
import AppScreen from "./components/common/AppScreen";
import AppTextInput from "./components/common/AppTextInput";
import PrimaryButton from "./components/common/PrimaryButton";

type SocialLoginButtonProps = {
  provider: "google" | "apple";
  title: string;
  disabled: boolean;
  onPress: () => void;
};

function SocialLoginButton({
  provider,
  title,
  disabled,
  onPress,
}: SocialLoginButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      activeOpacity={0.75}
      disabled={disabled}
      onPress={onPress}
      style={[styles.socialButton, disabled && styles.disabledButton]}
    >
      <View style={styles.socialButtonContent}>
        <FontAwesome
          name={provider}
          size={22}
          color={provider === "google" ? "#4285F4" : "#111111"}
          style={styles.socialIcon}
        />
        <Text style={styles.socialButtonText}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(
    Platform.OS === "web",
  );

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    AppleAuthentication.isAvailableAsync()
      .then(setAppleSignInAvailable)
      .catch(() => setAppleSignInAvailable(false));
  }, []);

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

      if (
        error?.code === "ERR_REQUEST_CANCELED" ||
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        setMessage("");
      } else if (error?.code === "auth/popup-blocked") {
        setMessage("Please allow pop-ups to continue with Apple.");
      } else if (error?.code === "auth/operation-not-allowed") {
        setMessage("Apple sign-in is not enabled yet.");
      } else if (error?.code === "auth/unauthorized-domain") {
        setMessage("Apple sign-in is not allowed on this website yet.");
      } else if (
        error?.code === "auth/account-exists-with-different-credential"
      ) {
        setMessage(
          "An account already exists with this email. Use its original sign-in method.",
        );
      } else {
        setMessage("Apple sign-in failed. Please try again.");
      }
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
        <SocialLoginButton
          provider="google"
          title="Continue with Google"
          disabled={loading}
          onPress={handleGoogleLogin}
        />
        {Platform.OS === "web" && (
          <SocialLoginButton
            provider="apple"
            title="Continue with Apple"
            disabled={loading}
            onPress={handleAppleLogin}
          />
        )}
        {Platform.OS === "ios" && appleSignInAvailable && (
          <View
            pointerEvents={loading ? "none" : "auto"}
            style={[
              styles.appleButtonContainer,
              loading && styles.disabledButton,
            ]}
          >
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={29}
              onPress={handleAppleLogin}
              style={styles.appleButton}
            />
          </View>
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

const styles = StyleSheet.create({
  socialButton: {
    height: 58,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  socialButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: {
    width: 30,
    textAlign: "center",
    marginRight: 8,
  },
  socialButtonText: {
    color: "#111111",
    fontSize: 17,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.55,
  },
  appleButtonContainer: {
    marginBottom: 12,
  },
  appleButton: {
    width: "100%",
    height: 58,
  },
});
