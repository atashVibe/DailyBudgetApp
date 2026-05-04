import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { db } from "../../firebaseConfig";
import { auth } from "../../services/auth";
import PrimaryButton from ".././components/PrimaryButton";

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"start" | "join">("start");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 2. Create or join family
      let finalFamilyId = "";
      let userRole = "admin";

      if (mode === "start") {
        if (!familyName.trim()) {
          setMessage("Please enter a family name.");
          return;
        }

        const newFamilyRef = await addDoc(collection(db, "families"), {
          name: familyName.trim(),
          dailyBudget: 0,
          status: "active",
          createdBy: user.uid,
          createdAt: new Date(),
        });

        finalFamilyId = newFamilyRef.id;
        userRole = "admin";
      } else if (mode === "join") {
        if (inviteCode.length !== 6) {
          setMessage("Enter a valid 6-digit code.");
          return;
        }

        const { getDocs, query, where, collection } =
          await import("firebase/firestore");

        const q = query(
          collection(db, "invites"),
          where("code", "==", inviteCode),
          where("status", "==", "pending"),
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setMessage("Invalid or expired code.");
          return;
        }

        const inviteDoc = snapshot.docs[0];
        const inviteData = inviteDoc.data();

        finalFamilyId = inviteData.familyId;
        userRole = "member";

        const { updateDoc, doc } = await import("firebase/firestore");

        await updateDoc(doc(db, "invites", inviteDoc.id), {
          status: "accepted",
        });
      }
      // 3. Create the user document in the "users" collection
      await setDoc(doc(db, "users", user.uid), {
        activeFamilyId: finalFamilyId,
        role: userRole,
        email: email.toLowerCase().trim(),
      });

      await setDoc(doc(db, "familyMembers", `${finalFamilyId}_${user.uid}`), {
        familyId: finalFamilyId,
        userId: user.uid,
        role: userRole,
        status: "active",
        joinedAt: new Date(),
      });

      setMessage(`Account created successfully!`);
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
      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => setMode("start")}
          style={{
            flex: 1,
            padding: 12,
            backgroundColor: mode === "start" ? "#0cb48a" : "#eee",
            borderRadius: 8,
            marginRight: 5,
            alignItems: "center",
          }}
        >
          <Text style={{ color: mode === "start" ? "white" : "black" }}>
            Start Family
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode("join")}
          style={{
            flex: 1,
            padding: 12,
            backgroundColor: mode === "join" ? "#0cb48a" : "#eee",
            borderRadius: 8,
            marginLeft: 5,
            alignItems: "center",
          }}
        >
          <Text style={{ color: mode === "join" ? "white" : "black" }}>
            Join Family
          </Text>
        </TouchableOpacity>
      </View>
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

      {mode === "start" && (
        <>
          <Text style={{ marginBottom: 8, fontSize: 16 }}>Family Name</Text>
          <TextInput
            placeholder="Example: Smith Family"
            value={familyName}
            onChangeText={setFamilyName}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 10,
              padding: 14,
              fontSize: 16,
              marginBottom: 16,
            }}
          />
        </>
      )}

      {mode === "join" && (
        <>
          <Text style={{ marginBottom: 8, fontSize: 16 }}>Invite Code</Text>
          <TextInput
            placeholder="Enter 6-digit invite code"
            value={inviteCode}
            onChangeText={(text) =>
              setInviteCode(text.replace(/[^0-9]/g, "").slice(0, 6))
            }
            keyboardType="number-pad"
            maxLength={6}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 10,
              padding: 14,
              fontSize: 16,
              marginBottom: 16,
            }}
          />
        </>
      )}

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

      <PrimaryButton title="Create Account" onPress={handleSignup} />

      {message ? (
        <Text
          style={{
            textAlign: "center",
            marginTop: 12,
            color: message.includes("success") ? "green" : "red",
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
