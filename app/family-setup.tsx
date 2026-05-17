import { useRouter } from "expo-router";
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
import { useState } from "react";
import { Text } from "react-native";
import { auth, db } from "../services/auth";
import AppTextInput from "./components/AppTextInput";
import PrimaryButton from "./components/PrimaryButton";

import AppScreen from "./components/AppScreen";
import ModeToggle from "./components/ModeToggle";

export default function FamilySetupScreen() {
  const [mode, setMode] = useState<"start" | "join" | null>(null);
  const router = useRouter();

  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const handleStartFamily = async () => {
    try {
      setLoading(true);
      setMessage("");

      const user = auth.currentUser;

      if (!user) {
        setMessage("User not found.");
        return;
      }

      if (!familyName.trim()) {
        setMessage("Please enter a family name.");
        return;
      }

      // Create family
      const familyRef = await addDoc(collection(db, "families"), {
        name: familyName.trim(),
        dailyBudget: 30,
        status: "active",
        createdBy: user.uid,
        createdAt: new Date(),
      });

      // Create user profile
      await setDoc(doc(db, "users", user.uid), {
        activeFamilyId: familyRef.id,
        role: "admin",
        email: user.email?.toLowerCase() || "",
      });

      // Create family member record
      await setDoc(doc(db, "familyMembers", `${familyRef.id}_${user.uid}`), {
        familyId: familyRef.id,
        userId: user.uid,
        role: "admin",
        status: "active",
        joinedAt: new Date(),
      });

      setMessage("Family created successfully!");

      setTimeout(() => {
        router.replace("/(drawer)/dashboard");
      }, 1000);
    } catch (error) {
      console.log(error);

      setMessage("Failed to create family.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    try {
      setLoading(true);
      setMessage("");

      const user = auth.currentUser;

      if (!user) {
        setMessage("User not found.");
        return;
      }

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

      const googleEmail = user.email?.trim().toLowerCase() || "";

      const inviteEmail = inviteData.email?.trim().toLowerCase();

      if (googleEmail !== inviteEmail) {
        setMessage("This invite code does not match your Google account.");

        return;
      }

      const familyId = inviteData.familyId;

      // Create user profile
      await setDoc(doc(db, "users", user.uid), {
        activeFamilyId: familyId,
        role: "member",
        email: googleEmail,
      });

      // Create family member record
      await setDoc(doc(db, "familyMembers", `${familyId}_${user.uid}`), {
        familyId,
        userId: user.uid,
        role: "member",
        status: "active",
        joinedAt: new Date(),
      });

      // Mark invite accepted
      await updateDoc(doc(db, "invites", inviteDoc.id), {
        status: "accepted",
      });

      setMessage("Joined family successfully!");

      setTimeout(() => {
        router.replace("/(drawer)/dashboard");
      }, 1000);
    } catch (error) {
      console.log(error);

      setMessage("Failed to join family.");
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
            Family Setup
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

      {message ? (
        <Text
          style={{
            textAlign: "center",
            marginBottom: 16,
            color: message.includes("success") ? "green" : "red",
            fontSize: 16,
          }}
        >
          {message}
        </Text>
      ) : null}

      {mode === "start" && (
        <>
          <Text style={{ marginBottom: 8, fontSize: 16 }}>Family Name</Text>

          <AppTextInput
            placeholder="Example: Smith Family"
            value={familyName}
            onChangeText={setFamilyName}
          />

          <PrimaryButton
            title="Create Family"
            onPress={handleStartFamily}
            loading={loading}
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

          <PrimaryButton
            title="Join Family"
            onPress={handleJoinFamily}
            loading={loading}
          />
        </>
      )}
    </AppScreen>
  );
}
