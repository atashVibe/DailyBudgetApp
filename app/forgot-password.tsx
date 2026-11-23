import { useLocalSearchParams, useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useRef, useState } from "react";
import { TouchableOpacity } from "react-native";
import Text from "./components/common/AppText";
import { auth } from "../services/auth";
import { validInvitationCode } from "../services/invitations";
import AppScreen from "./components/common/AppScreen";
import AppTextInput from "./components/common/AppTextInput";
import PrimaryButton from "./components/common/PrimaryButton";

const resetMessage =
  "If this email has a password account, you’ll receive a password-reset link. Check your inbox and spam folder. If the link has expired or is invalid, request a new one here.";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteCode?: string }>();
  const inviteCode = validInvitationCode(params.inviteCode)
    ? params.inviteCode
    : "";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const submitting = useRef(false);

  const handleReset = async () => {
    if (submitting.current) return;
    const normalizedEmail = email.trim();
    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setSent(false);
      setMessage("Please enter a valid email address.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    setMessage("");
    setSent(false);
    try {
      // Firebase's hosted email action page validates and completes the reset.
      await sendPasswordResetEmail(auth, normalizedEmail);
      setSent(true);
      setMessage(resetMessage);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/user-not-found" || code === "auth/user-disabled") {
        // Match success even on projects without email enumeration protection.
        setSent(true);
        setMessage(resetMessage);
      } else if (code === "auth/invalid-email") {
        setMessage("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setMessage(
          "Too many requests. Please wait a few minutes and try again.",
        );
      } else if (code === "auth/network-request-failed") {
        setMessage("Check your internet connection and try again.");
      } else {
        setMessage("We couldn’t request a reset. Please try again later.");
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <AppScreen
      style={{ padding: 24, justifyContent: "center", backgroundColor: "#fff" }}
    >
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 16 }}>
        Reset your password
      </Text>
      <Text style={{ fontSize: 16, color: "#374151", marginBottom: 24 }}>
        Enter the email you use for email/password sign-in. We’ll send a link to
        choose a new password.
      </Text>
      <AppTextInput
        accessibilityLabel="Email address"
        placeholder="Enter your email"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        editable={!loading}
        onChangeText={(value) => {
          setEmail(value);
          setMessage("");
          setSent(false);
        }}
        returnKeyType="send"
        onSubmitEditing={handleReset}
      />
      <PrimaryButton
        title={sent ? "Send another reset link" : "Send reset link"}
        onPress={handleReset}
        loading={loading}
      />
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            marginTop: 16,
            fontSize: 16,
            color: sent ? "#155E50" : "#B91C1C",
          }}
        >
          {message}
        </Text>
      ) : null}
      <Text style={{ marginTop: 24, fontSize: 16, color: "#374151" }}>
        Signed up with Apple or Google? Continue with that provider on the
        sign-in screen. A password reset does not link a different provider or
        recover an account you can no longer access. For help, contact
        dailybudgethub@gmail.com. Don’t create a new account to recover an
        existing family budget.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() =>
          router.replace(
            inviteCode
              ? { pathname: "/login", params: { inviteCode } }
              : "/login",
          )
        }
        style={{ padding: 16, alignItems: "center", marginTop: 12 }}
      >
        <Text style={{ fontSize: 16, color: "#155E50" }}>Back to sign in</Text>
      </TouchableOpacity>
    </AppScreen>
  );
}
