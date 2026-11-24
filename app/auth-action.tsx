import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import {
  ActionCodeOperation,
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { auth } from "../services/auth";
import { emailActionReturn } from "../services/appLinks";
import { withTimeout } from "../services/loading";
import AuthCard from "./components/common/AuthCard";
import Text from "./components/common/AppText";
import AppTextInput from "./components/common/AppTextInput";
import FormLabel from "./components/common/FormLabel";
import PrimaryButton from "./components/common/PrimaryButton";
import LoadingSpinner from "./components/common/LoadingSpinner";
import { uiStyles as ui, uiTokens } from "./components/common/dashboardStyles";

const single = (value: unknown) => (typeof value === "string" ? value : "");
export default function AuthActionScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    oobCode?: string;
    continueUrl?: string;
  }>();
  const mode = single(params.mode),
    code = single(params.oobCode);
  const target = emailActionReturn(params.continueUrl);
  const router = useRouter();
  const [state, setState] = useState<
    "loading" | "ready" | "success" | "invalid" | "unavailable"
  >("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const lock = useRef(false);
  const action = `${mode}:${code}`;
  const currentAction = useRef(action);
  currentAction.current = action;
  useEffect(() => {
    let active = true;
    setState("loading");
    setMessage("");
    setEmail("");
    setPassword("");
    setConfirmation("");
    if (
      !code ||
      code.length > 2048 ||
      !["verifyEmail", "resetPassword", "recoverEmail"].includes(mode)
    ) {
      setState("invalid");
      return;
    }
    const inspect = async () => {
      if (mode === "resetPassword")
        return withTimeout(verifyPasswordResetCode(auth, code), 20000);
      const info = await withTimeout(checkActionCode(auth, code), 20000);
      const expected =
        mode === "verifyEmail"
          ? ActionCodeOperation.VERIFY_EMAIL
          : ActionCodeOperation.RECOVER_EMAIL;
      if (info.operation !== expected)
        throw Object.assign(new Error("Wrong email action."), {
          code: "app/wrong-email-action",
        });
      return info.data.email || "";
    };
    void inspect()
      .then((value) => {
        if (active) {
          setEmail(value);
          setState("ready");
        }
      })
      .catch((error) => {
        if (active)
          setState(
            [
              "app/wrong-email-action",
              "auth/invalid-action-code",
              "auth/expired-action-code",
              "auth/user-disabled",
              "auth/user-not-found",
            ].includes(error?.code)
              ? "invalid"
              : "unavailable",
          );
      });
    return () => {
      active = false;
    };
  }, [mode, code, checkAttempt]);
  const complete = async () => {
    if (lock.current || state !== "ready") return;
    if (
      mode === "resetPassword" &&
      (password.length < 6 || password !== confirmation)
    ) {
      setMessage(
        password.length < 6
          ? "Use at least 6 characters for your password."
          : "The passwords do not match.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage("");
    const key = action;
    try {
      if (mode === "resetPassword")
        await withTimeout(confirmPasswordReset(auth, code, password), 30000);
      else await withTimeout(applyActionCode(auth, code), 30000);
      if (currentAction.current !== key) return;
      setPassword("");
      setConfirmation("");
      setState("success");
      const user = auth.currentUser;
      // Applying another account's emailed code must never switch accounts.
      if (
        mode !== "resetPassword" &&
        user?.email?.toLowerCase() === email.toLowerCase()
      ) {
        // Session refresh must not keep a successful verification spinning.
        void withTimeout(
          (async () => {
            await user.reload();
            if (auth.currentUser?.uid === user.uid) await user.getIdToken(true);
          })(),
          15000,
        ).catch(() => {});
      }
    } catch (error) {
      if (currentAction.current !== key) return;
      const failure = (error as { code?: string })?.code;
      if (
        [
          "auth/expired-action-code",
          "auth/invalid-action-code",
          "auth/user-disabled",
          "auth/user-not-found",
        ].includes(failure || "")
      )
        setState("invalid");
      else
        setMessage(
          failure === "auth/weak-password"
            ? "This password does not meet the requirements. Try a stronger password."
            : "We could not confirm the update. Check your connection, or return to the app to check your account before trying again.",
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const title =
    state === "success"
      ? mode === "resetPassword"
        ? "Password updated"
        : mode === "recoverEmail"
          ? "Email restored"
          : "Email verified"
      : state === "invalid"
        ? "Link unavailable"
        : state === "unavailable"
          ? "Check your connection"
          : mode === "resetPassword"
            ? "Choose a new password"
            : mode === "recoverEmail"
              ? "Restore your email"
              : "Verify your email";
  return (
    <AuthCard title={title}>
      <Head>
        <meta name="referrer" content="no-referrer" />
        <title>{title} · DailyBudget</title>
      </Head>
      {state === "loading" ? (
        <LoadingSpinner message="Checking your email link…" />
      ) : null}
      {state === "unavailable" ? (
        <>
          <Text accessibilityRole="alert" style={{ color: uiTokens.danger }}>
            We could not check this link. Check your connection and try again.
          </Text>
          <PrimaryButton
            title="Check link again"
            onPress={() => setCheckAttempt((value) => value + 1)}
          />
        </>
      ) : null}
      {state === "invalid" ? (
        <Text accessibilityRole="alert" style={{ color: uiTokens.danger }}>
          This link is invalid, expired or already used. Return to the app to
          check your account or request a new link.
        </Text>
      ) : null}
      {state === "ready" ? (
        <>
          <Text style={ui.body}>
            {mode === "resetPassword"
              ? "Choose a new password for"
              : mode === "recoverEmail"
                ? "Confirm that you want to restore the previous email address for this account:"
                : "Confirm your email address to continue:"}
          </Text>
          <Text style={[ui.name, { fontWeight: "600" }]}>{email}</Text>
          {mode === "resetPassword" ? (
            <>
              <View>
                <FormLabel>New password</FormLabel>
                <AppTextInput
                  style={{ marginBottom: 0 }}
                  accessibilityLabel="New password"
                  secureTextEntry
                  autoComplete="new-password"
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                />
              </View>
              <View>
                <FormLabel>Confirm new password</FormLabel>
                <AppTextInput
                  style={{ marginBottom: 0 }}
                  accessibilityLabel="Confirm new password"
                  secureTextEntry
                  autoComplete="new-password"
                  autoCapitalize="none"
                  value={confirmation}
                  onChangeText={setConfirmation}
                  editable={!busy}
                />
              </View>
            </>
          ) : null}
          <PrimaryButton
            title={
              mode === "resetPassword"
                ? "Save new password"
                : mode === "recoverEmail"
                  ? "Restore email"
                  : "Verify email"
            }
            loading={busy}
            onPress={() => void complete()}
          />
        </>
      ) : null}
      {state === "success" ? (
        <Text style={ui.body}>
          {mode === "resetPassword"
            ? "Your password has been updated. Use the new password when you next sign in."
            : mode === "recoverEmail"
              ? "Your previous email address has been restored."
              : "Your email address is verified. You can return to DailyBudget and continue."}
        </Text>
      ) : null}
      {message ? (
        <Text accessibilityRole="alert" style={{ color: uiTokens.danger }}>
          {message}
        </Text>
      ) : null}
      {state !== "loading" ? (
        <PrimaryButton
          title="Return to DailyBudget"
          variant={
            state === "ready" || state === "unavailable" ? "text" : "primary"
          }
          disabled={busy}
          onPress={() => router.replace(target)}
        />
      ) : null}
      {state === "success" && mode === "recoverEmail" ? (
        <PrimaryButton
          title="Reset your password"
          variant="outline"
          onPress={() => router.push("/forgot-password")}
        />
      ) : null}
    </AuthCard>
  );
}
