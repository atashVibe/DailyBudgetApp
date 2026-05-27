import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
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
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState("");

  useEffect(() => {
    const fetchUserAccount = async () => {
      const user = auth.currentUser;

      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setFamilyId(userSnap.data().activeFamilyId);
      }
    };

    fetchUserAccount();
  }, []);

  const isValidEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendInvite = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    if (!familyId) {
      Alert.alert("Error", "Account not loaded yet");
      return;
    }
    const code = generateCode();

    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));
    try {
      const docRef = await addDoc(collection(db, "invites"), {
        email: email.toLowerCase().trim(),
        familyId: familyId,
        role: "member",
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
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold" },
});

export default InviteScreen;


