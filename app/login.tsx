import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../services/auth";
import PolicyLinks from "../components/PolicyLinks";
import { validInvitationCode } from "../services/invitations";
import {
  prepareGoogleSignIn,
  signInWithApple,
  signInWithGoogle,
} from "../services/googleAuth";
import AppScreen from "./components/common/AppScreen";
import AppTextInput from "./components/common/AppTextInput";
import PrimaryButton from "./components/common/PrimaryButton";

const APPLE_SIGN_IN_ENABLED = false;

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
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ inviteCode?: string }>();
  const inviteCode = validInvitationCode(params.inviteCode)
    ? params.inviteCode
    : "";
  const destination = useCallback(
    () =>
      inviteCode
        ? router.replace({
            pathname: "/join-invitation",
            params: { code: inviteCode },
          })
        : router.replace("/"),
    [router, inviteCode],
  );
  const signInPending = useRef(false);
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (user && isFocused && !signInPending.current) {
          setMessage("");
          destination();
        }
      }),
    [router, destination, isFocused],
  );
  const [googleReady, setGoogleReady] = useState(Platform.OS !== "web");
  const [googleSetupFailed, setGoogleSetupFailed] = useState(false);
  const [googleSetupAttempt, setGoogleSetupAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setGoogleSetupFailed(false);
    void prepareGoogleSignIn()
      .then(() => {
        if (active) setGoogleReady(true);
      })
      .catch(() => {
        if (active) setGoogleSetupFailed(true);
      });
    return () => {
      active = false;
    };
  }, [googleSetupAttempt]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(
    Platform.OS === "web",
  );

  useEffect(() => {
    if (!APPLE_SIGN_IN_ENABLED || Platform.OS !== "ios") return;

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
    if (signInPending.current) return;
    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (!password) {
      setMessage("Please enter your password.");
      return;
    }

    signInPending.current = true;
    setLoading(true);
    setMessage("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      destination();
    } catch (error: any) {
      if (error.code === "auth/invalid-credential") {
        setMessage("Incorrect email or password.");
      } else if (error.code === "auth/invalid-email") {
        setMessage("Please enter a valid email.");
      } else {
        setMessage("Login failed. Please try again.");
      }
    } finally {
      signInPending.current = false;
      setLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    if (signInPending.current || !googleReady) return;
    signInPending.current = true;
    try {
      setLoading(true);
      setMessage("");

      await signInWithGoogle(Boolean(inviteCode));
      destination();
    } catch (error: any) {
      console.log(error);

      if (auth.currentUser) {
        setMessage("");
        destination();
      } else if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        setMessage("");
      } else if (error?.code === "auth/popup-blocked") {
        setMessage("Please allow pop-ups to continue with Google.");
      } else if (error?.code === "auth/network-request-failed") {
        setMessage("Check your connection, then try Google sign-in again.");
      } else if (error?.code === "auth/unauthorized-domain") {
        setMessage("Google sign-in is not allowed on this website yet.");
      } else if (error?.code === "auth/operation-not-allowed") {
        setMessage("Google sign-in is not enabled yet.");
      } else if (
        error?.code === "auth/account-exists-with-different-credential"
      ) {
        setMessage(
          "An account already exists with this email. Use its original sign-in method.",
        );
      } else {
        setMessage("Google sign-in failed. Please try again.");
      }
    } finally {
      signInPending.current = false;
      setLoading(false);
    }
  };
  const handleAppleLogin = async () => {
    if (signInPending.current) return;
    signInPending.current = true;
    try {
      setLoading(true);
      setMessage("");

      await signInWithApple();
      destination();
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
      signInPending.current = false;
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

        <TouchableOpacity
          accessibilityRole="button"
          disabled={loading}
          onPress={() =>
            router.push(
              inviteCode
                ? { pathname: "/forgot-password", params: { inviteCode } }
                : "/forgot-password",
            )
          }
          style={{ alignSelf: "flex-end", padding: 12, marginBottom: 12 }}
        >
          <Text style={{ color: "#155E50", fontSize: 16 }}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

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
          disabled={loading || !googleReady}
          onPress={handleGoogleLogin}
        />
        {googleSetupFailed ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Retry Google sign-in preparation"
            onPress={() => setGoogleSetupAttempt((value) => value + 1)}
            style={{ padding: 12 }}
          >
            <Text style={{ textAlign: "center", color: "#155E50" }}>
              Google sign-in could not get ready. Check your connection and tap
              to retry.
            </Text>
          </TouchableOpacity>
        ) : !googleReady ? (
          <Text
            style={{ textAlign: "center", color: "#555", marginBottom: 12 }}
          >
            Preparing Google sign-in…
          </Text>
        ) : null}
        {APPLE_SIGN_IN_ENABLED && Platform.OS === "web" && (
          <SocialLoginButton
            provider="apple"
            title="Continue with Apple"
            disabled={loading}
            onPress={handleAppleLogin}
          />
        )}
        {APPLE_SIGN_IN_ENABLED &&
          Platform.OS === "ios" &&
          appleSignInAvailable && (
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
          onPress={() =>
            router.push(
              inviteCode
                ? { pathname: "/signup", params: { inviteCode } }
                : "/signup",
            )
          }
        />
        <PolicyLinks />
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
