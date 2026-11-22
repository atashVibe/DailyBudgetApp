import { useEffect, useRef, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { AccountReauthenticationMethod } from "../../../services/accountDeletion";
import AppTextInput from "../common/AppTextInput";

type Props = {
  accountId: string;
  reauthenticationMethod: AccountReauthenticationMethod;
  onPrepareAccount: (expectedUserId: string) => Promise<void>;
  onDeleteAccount: (
    password: string | undefined,
    expectedUserId: string,
  ) => Promise<void>;
};

const providerNames: Record<AccountReauthenticationMethod, string> = {
  password: "your password",
  google: "Google",
  apple: "Apple",
};

export default function AccountSection({
  accountId,
  reauthenticationMethod,
  onPrepareAccount,
  onDeleteAccount,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepareAttempt, setPrepareAttempt] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setPrepared(false);
    setPreparing(true);
    void onPrepareAccount(accountId)
      .then(() => {
        if (active) setPrepared(true);
      })
      .catch((error) => {
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not check your account. Check your connection and retry.",
          );
      })
      .finally(() => {
        if (active) setPreparing(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, accountId, onPrepareAccount, prepareAttempt]);

  const close = () => {
    if (working) return;
    setIsOpen(false);
    setConfirmation("");
    setPassword("");
    setMessage("");
    setPrepared(false);
  };

  const handleDelete = async () => {
    if (busy.current || !canDelete || !prepared || preparing) return;
    busy.current = true;
    setWorking(true);
    setMessage("");
    try {
      await onDeleteAccount(
        reauthenticationMethod === "password" ? password : undefined,
        accountId,
      );
    } catch (error) {
      console.error("Account deletion failed:", error);
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";

      if (
        code === "LAST_ADMIN" ||
        code === "ACCOUNT_CHANGED" ||
        code === "CONFIRMATION_NOT_READY"
      ) {
        setMessage(error instanceof Error ? error.message : "");
      } else if (
        code.includes("user-mismatch") ||
        code.includes("user-not-found")
      ) {
        setMessage(
          "Choose the same Google account you use for DailyBudget. Nothing was deleted.",
        );
      } else if (code.includes("popup-blocked")) {
        setMessage(
          "Please allow the Google confirmation window, then retry. Nothing was deleted.",
        );
      } else if (
        reauthenticationMethod === "password" &&
        (code.includes("wrong-password") || code.includes("invalid-credential"))
      ) {
        setMessage("That password is incorrect. Please try again.");
      } else if (
        code.includes("popup-closed") ||
        code.includes("canceled") ||
        code.includes("cancelled") ||
        code === "ERR_REQUEST_CANCELED"
      ) {
        setMessage("Sign-in confirmation was cancelled. Nothing was deleted.");
      } else {
        setMessage(
          "We could not finish deleting the account. Please try again. If it continues, contact support.",
        );
      }
      // Re-seed the temporary Google confirmation user after a cancelled or
      // rejected popup. Keep the helpful error visible while preparing again.
      if (reauthenticationMethod === "google") {
        setPrepared(false);
        setPrepareAttempt((value) => value + 1);
      }
    } finally {
      busy.current = false;
      setWorking(false);
    }
  };

  const canDelete =
    prepared &&
    !preparing &&
    confirmation.trim().toUpperCase() === "DELETE" &&
    (reauthenticationMethod !== "password" || password.length > 0);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Account</Text>
      <Text style={styles.description}>
        Permanently delete your sign-in and personal profile. Shared family
        budget entries are preserved without your identity.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Delete Account"
        style={styles.openButton}
        onPress={() => {
          setMessage("");
          setPrepared(false);
          setIsOpen(true);
        }}
      >
        <Text style={styles.openButtonText}>Delete Account</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="fade"
        transparent
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <ScrollView
            style={{ width: "100%", maxHeight: "100%", flexGrow: 0 }}
            contentContainerStyle={{ alignItems: "center" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Delete your account?</Text>
              <Text style={styles.warning}>
                This permanently deletes your DailyBudget account and cannot be
                undone. Shared family receipts stay available to remaining
                members. If you are the only family member, its receipt
                originals are submitted for deletion; retained copies may take
                longer to expire. If you are the family’s only member, its
                budget data is deleted too. If other members depend on you as
                the only administrator, you must add another administrator
                first.
              </Text>
              <Link
                href="/delete-account"
                onPress={close}
                disabled={working}
                style={{
                  color: "#155E50",
                  textDecorationLine: "underline",
                  paddingVertical: 12,
                }}
              >
                Read account and data deletion details
              </Link>
              <Text style={styles.label}>Type DELETE to confirm</Text>
              <AppTextInput
                value={confirmation}
                onChangeText={setConfirmation}
                placeholder="DELETE"
                autoCapitalize="characters"
              />

              {reauthenticationMethod === "password" ? (
                <>
                  <Text style={styles.label}>Password</Text>
                  <AppTextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                  />
                </>
              ) : (
                <Text style={styles.signInNote}>
                  You will confirm with {providerNames[reauthenticationMethod]}.
                  {reauthenticationMethod === "google"
                    ? " Choose the same account you use for DailyBudget."
                    : ""}
                </Text>
              )}

              {message ? <Text style={styles.error}>{message}</Text> : null}

              {preparing ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={styles.signInNote}
                >
                  Checking your account and preparing confirmation…
                </Text>
              ) : null}
              {!prepared && !preparing && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Retry account check"
                  onPress={() => setPrepareAttempt((value) => value + 1)}
                  style={styles.cancelButton}
                >
                  <Text>Retry account check</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Permanently Delete Account"
                accessibilityState={{
                  disabled: !canDelete || working,
                  busy: working,
                }}
                style={[
                  styles.deleteButton,
                  (!canDelete || working) && styles.disabled,
                ]}
                disabled={!canDelete || working}
                onPress={() => void handleDelete()}
              >
                {working ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteButtonText}>
                    Permanently Delete Account
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel account deletion"
                style={styles.cancelButton}
                disabled={working}
                onPress={close}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 36,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 24,
  },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  description: {
    color: "#4B5563",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  openButton: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  openButtonText: { color: "#DC2626", fontSize: 16, fontWeight: "700" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 22,
    width: "100%",
    maxWidth: 480,
  },
  modalTitle: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  warning: {
    color: "#4B5563",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  signInNote: { color: "#4B5563", fontSize: 14, marginBottom: 18 },
  error: {
    color: "#B91C1C",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  deleteButton: {
    height: 52,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  cancelButton: { alignItems: "center", paddingVertical: 16 },
  cancelButtonText: { color: "#374151", fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
