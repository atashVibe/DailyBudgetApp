import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useCallback, useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import { auth, db } from "../services/auth";
import { seedFinanceData } from "../services/seedFinanceData";
import AppScreen from "./components/AppScreen";
import AppTextInput from "./components/AppTextInput";
import ModeToggle from "./components/ModeToggle";
import PrimaryButton from "./components/PrimaryButton";

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"start" | "join" | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const clearForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFamilyName("");
    setInviteCode("");
  };
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearForm();
        setMessage("");
        setMode(null);
      };
    }, []),
  );

  const handleSignup = async () => {
    setLoading(true);
    try {
      if (!email.trim()) {
        setMessage("Please enter your email.");
        return;
      }
      if (!password) {
        setMessage("Please enter a password.");
        return;
      }
      if (password !== confirmPassword) {
        setMessage("Passwords do not match");
        return;
      }

      // 2. Create or join family
      let finalFamilyId = "";
      let userRole = "admin";
      let acceptedInviteId = "";

      // If joining, validate invite BEFORE creating Auth user
      if (mode === "join") {
        if (inviteCode.length !== 6) {
          setMessage("Enter a valid 6-digit code.");
          return;
        }

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

        const signupEmail = email.trim().toLowerCase();
        const inviteEmail = inviteData.email?.trim().toLowerCase();

        if (inviteEmail !== signupEmail) {
          setMessage("This invite code does not match your email address.");
          return;
        }

        const expiresAt = inviteData.expiresAt?.toDate
          ? inviteData.expiresAt.toDate()
          : new Date(inviteData.expiresAt);

        if (expiresAt < new Date()) {
          setMessage("This invite code has expired.");
          return;
        }

        finalFamilyId = inviteData.familyId;
        userRole = "member";
        acceptedInviteId = inviteDoc.id;
      }

      // Now create the Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // If starting, create family AFTER user exists
      if (mode === "start") {
        if (!familyName.trim()) {
          setMessage("Please enter a family name.");
          return;
        }

        const newFamilyRef = await addDoc(collection(db, "families"), {
          name: familyName.trim(),
          dailyBudget: 30,
          status: "active",
          createdBy: user.uid,
          createdAt: new Date(),
        });

        finalFamilyId = newFamilyRef.id;
        userRole = "admin";
        await seedFinanceData(newFamilyRef.id, user.uid);
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

      if (mode === "join" && acceptedInviteId) {
        await updateDoc(doc(db, "invites", acceptedInviteId), {
          status: "accepted",
        });
      }

      setMessage(`Account created successfully!`);

      clearForm();

      // redirect
      setTimeout(() => router.push("/login"), 1000);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setMessage(
          "This email already has an account. Please sign in instead.",
        );
      } else if (error.code === "auth/invalid-email") {
        setMessage("Please enter a valid email.");
      } else if (error.code === "auth/weak-password") {
        setMessage("Password should be at least 6 characters.");
      } else {
        setMessage("Account creation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        padding: 24,
        justifyContent: "center",
      }}
    >
      {!mode && (
        <>
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
            Do you want to start a new family budget or join an existing one?
          </Text>
        </>
      )}
      <ModeToggle mode={mode} onSelect={setMode} />
      {mode && (
        <>
          {mode === "start" && (
            <>
              <Text style={{ marginBottom: 8, fontSize: 16 }}>Family Name</Text>
              <AppTextInput
                placeholder="Example: Smith Family"
                value={familyName}
                onChangeText={setFamilyName}
              />
            </>
          )}

          {mode === "join" && (
            <>
              <Text style={{ marginBottom: 8, fontSize: 16 }}>Invite Code</Text>
              <AppTextInput
                placeholder="Enter 6-digit invite code"
                value={inviteCode}
                onChangeText={(text) =>
                  setInviteCode(text.replace(/[^0-9]/g, "").slice(0, 6))
                }
                keyboardType="number-pad"
                maxLength={6}
              />
            </>
          )}

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
            placeholder="Create a password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={{ marginBottom: 8, fontSize: 16 }}>
            Confirm Password
          </Text>
          <AppTextInput
            placeholder="Confirm your password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <PrimaryButton
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
          />
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
        </>
      )}
    </AppScreen>
  );
}
