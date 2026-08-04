import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import * as Crypto from "expo-crypto";
import React, { useEffect, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../../services/auth";

const InviteScreen = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [canInvite, setCanInvite] = useState<boolean | null>(null);
  const [createdCode, setCreatedCode] = useState("");

  useEffect(() => {
    const fetchUserAccount = async () => {
      const user = auth.currentUser;

      if (!user) {
        setCanInvite(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const activeFamilyId = userSnap.data().activeFamilyId;
        if (!activeFamilyId) {
          setCanInvite(false);
          return;
        }

        const memberSnap = await getDoc(
          doc(db, "familyMembers", `${activeFamilyId}_${user.uid}`),
        );
        const isActiveAdmin =
          memberSnap.exists() &&
          memberSnap.data().role === "admin" &&
          memberSnap.data().status === "active";

        setFamilyId(activeFamilyId);
        setCanInvite(isActiveAdmin);
      } else {
        setCanInvite(false);
      }
    };

    fetchUserAccount();
  }, []);

  const isValidEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const generateCode = async () => {
    const bytes = await Crypto.getRandomBytesAsync(4);
    const value = bytes.reduce((current, byte) => current * 256 + byte, 0);
    return String(value % 100000000).padStart(8, "0");
  };

  const sendInvite = async () => {
    if (!canInvite) {
      Alert.alert(
        "Administrators only",
        "Only an active family administrator can invite members.",
      );
      return;
    }

    if (!email) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    if (!familyId) {
      Alert.alert("Error", "Account not loaded yet");
      return;
    }
    const code = await generateCode();

    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));
    try {
      await addDoc(collection(db, "invites"), {
        email: email.toLowerCase().trim(),
        familyId: familyId,
        role,
        createdBy: auth.currentUser?.uid,
        code: code,
        status: "pending",
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
      });
      Alert.alert(
        "Invitation Created",
        `Share this code with the family member:\n\n${code}\n\nThis code expires in 10 minutes.`,
      );
      setCreatedCode(code);
      setEmail("");
    } catch (error: any) {
      console.log("Invite save error:", error);
      Alert.alert("Error", `Failed: ${error.message}`);
    }
  };

  if (canInvite === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Loading invitation permissions...</Text>
      </View>
    );
  }

  if (!canInvite) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Administrators only</Text>
        <Text style={{ color: "gray", textAlign: "center" }}>
          Only an active family administrator can invite members or other
          administrators.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Invite a Family Member</Text>

      <Text style={{ marginBottom: 20, color: "gray" }}>
        They will be added to your family budget once they sign up.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.roleLabel}>Invitation role</Text>
      <View style={styles.roleRow}>
        {(["member", "admin"] as const).map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.roleButton,
              role === option && styles.selectedRoleButton,
            ]}
            onPress={() => setRole(option)}
          >
            <Text
              style={[
                styles.roleText,
                role === option && styles.selectedRoleText,
              ]}
            >
              {option === "admin" ? "Administrator" : "Member"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {role === "admin" ? (
        <Text style={styles.adminHelp}>
          Administrators can manage the family budget and allow another
          administrator to leave safely.
        </Text>
      ) : null}

      {isValidEmail(email) && (
        <TouchableOpacity style={styles.button} onPress={sendInvite}>
          <Text style={styles.buttonText}>Send Invitation</Text>
        </TouchableOpacity>
      )}

      {createdCode ? (
        <View
          style={{ marginTop: 20, padding: 15, backgroundColor: "#f2f2f2" }}
        >
          <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
            Invitation Code:
          </Text>

          <Text style={{ fontSize: 28, fontWeight: "bold" }}>
            {createdCode}
          </Text>

          <Text style={{ marginTop: 8, color: "gray" }}>
            This code expires in 10 minutes.
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  label: { fontSize: 18, marginBottom: 5, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  roleLabel: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  selectedRoleButton: { backgroundColor: "#E6FAF5", borderColor: "#2BCEA6" },
  roleText: { color: "#475569", fontWeight: "600" },
  selectedRoleText: { color: "#087F65" },
  adminHelp: { color: "#64748B", lineHeight: 20, marginBottom: 16 },
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
});

export default InviteScreen;


