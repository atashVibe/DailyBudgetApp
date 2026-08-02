import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { AccountReauthenticationMethod } from "../../../services/accountDeletion";
import AppTextInput from "../common/AppTextInput";

type Props = {
  reauthenticationMethod: AccountReauthenticationMethod;
  onDeleteAccount: (password?: string) => Promise<void>;
};

const providerNames: Record<AccountReauthenticationMethod, string> = {
  password: "your password",
  google: "Google",
  apple: "Apple",
};

export default function AccountSection({
  reauthenticationMethod,
  onDeleteAccount,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const close = () => {
    if (working) return;
    setIsOpen(false);
    setConfirmation("");
    setPassword("");
    setMessage("");
  };

  const handleDelete = async () => {
    setWorking(true);
    setMessage("");
    try {
      await onDeleteAccount(
        reauthenticationMethod === "password" ? password : undefined,
      );
    } catch (error) {
      console.error("Account deletion failed:", error);
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";

      if (code === "LAST_ADMIN") {
        setMessage(error instanceof Error ? error.message : "");
      } else if (
        code.includes("wrong-password") ||
        code.includes("invalid-credential")
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
      setWorking(false);
    }
  };

  const canDelete =
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
        style={styles.openButton}
        onPress={() => setIsOpen(true)}
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
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.warning}>
              This permanently deletes your DailyBudget account and cannot be
              undone. If you are the family’s only member, its budget data is
              deleted too. If other members depend on you as the only
              administrator, you must add another administrator first.
            </Text>
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
              </Text>
            )}

            {message ? <Text style={styles.error}>{message}</Text> : null}

            <TouchableOpacity
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
              style={styles.cancelButton}
              disabled={working}
              onPress={close}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
