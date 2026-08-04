import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { useCallback, useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import { auth, db } from "../services/auth";
import { seedFinanceData } from "../services/seedFinanceData";
import AppScreen from "./components/common/AppScreen";
import AppTextInput from "./components/common/AppTextInput";
import ModeToggle from "./components/common/ModeToggle";
import PrimaryButton from "./components/common/PrimaryButton";

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
    let createdFamilyId = "";
    let setupFinished = false;

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
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
      if (!mode) {
        setMessage("Choose whether to start or join a family budget.");
        return;
      }
      if (mode === "start" && !familyName.trim()) {
        setMessage("Please enter a family name.");
        return;
      }
      if (mode === "join" && inviteCode.length !== 8) {
        setMessage("Enter a valid invitation code.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );
      const user = userCredential.user;

      let finalFamilyId = "";
      let userRole = "admin";
      let acceptedInviteId = "";

      if (mode === "join") {
        const q = query(
          collection(db, "invites"),
          where("code", "==", inviteCode),
          where("status", "==", "pending"),
          where("email", "==", normalizedEmail),
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          throw new Error("INVALID_INVITE");
        }

        const inviteDoc = snapshot.docs[0];
        const inviteData = inviteDoc.data();

        const inviteEmail = inviteData.email?.trim().toLowerCase();

        if (inviteEmail !== normalizedEmail) {
          throw new Error("INVITE_EMAIL_MISMATCH");
        }

        const expiresAt = inviteData.expiresAt?.toDate
          ? inviteData.expiresAt.toDate()
          : new Date(inviteData.expiresAt);

        if (expiresAt < new Date()) {
          throw new Error("INVITE_EXPIRED");
        }

        finalFamilyId = inviteData.familyId;
        userRole = inviteData.role === "admin" ? "admin" : "member";
        acceptedInviteId = inviteDoc.id;
      }

      if (mode === "start") {
        const newFamilyRef = await addDoc(collection(db, "families"), {
          name: familyName.trim(),
          dailyBudget: 30,
          status: "active",
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });

        finalFamilyId = newFamilyRef.id;
        createdFamilyId = newFamilyRef.id;
        userRole = "admin";
      }

      const batch = writeBatch(db);
      batch.set(doc(db, "users", user.uid), {
        activeFamilyId: finalFamilyId,
        role: userRole,
        email: normalizedEmail,
      });
      batch.set(doc(db, "familyMembers", `${finalFamilyId}_${user.uid}`), {
        familyId: finalFamilyId,
        userId: user.uid,
        email: normalizedEmail,
        role: userRole,
        status: "active",
        joinedAt: serverTimestamp(),
        ...(acceptedInviteId ? { inviteId: acceptedInviteId } : {}),
      });

      if (acceptedInviteId) {
        batch.update(doc(db, "invites", acceptedInviteId), {
          status: "accepted",
          acceptedBy: user.uid,
          acceptedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      setupFinished = true;

      if (mode === "start") {
        await seedFinanceData(finalFamilyId, user.uid);
      }

      setMessage(`Account created successfully!`);

      clearForm();

      // redirect
      setTimeout(() => router.push("/login"), 1000);
    } catch (error: any) {
      const user = auth.currentUser;
      if (user && !setupFinished) {
        try {
          if (createdFamilyId) {
            await deleteDoc(doc(db, "families", createdFamilyId));
          }
          await deleteUser(user);
        } catch (cleanupError) {
          console.error("Could not clean up incomplete signup:", cleanupError);
        }
      }

      if (error.code === "auth/email-already-in-use") {
        setMessage(
          "This email already has an account. Please sign in instead.",
        );
      } else if (error.code === "auth/invalid-email") {
        setMessage("Please enter a valid email.");
      } else if (error.code === "auth/weak-password") {
        setMessage("Password should be at least 6 characters.");
      } else if (error.message === "INVITE_EXPIRED") {
        setMessage("This invitation code has expired.");
      } else if (
        error.message === "INVALID_INVITE" ||
        error.message === "INVITE_EMAIL_MISMATCH"
      ) {
        setMessage("This invitation code is invalid for this email address.");
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
                placeholder="Enter 8-digit invitation code"
                value={inviteCode}
                onChangeText={(text) =>
                  setInviteCode(text.replace(/[^0-9]/g, "").slice(0, 8))
                }
                keyboardType="number-pad"
                maxLength={8}
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


