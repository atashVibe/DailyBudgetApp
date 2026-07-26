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
import { seedFinanceData } from "../services/seedFinanceData";
import AppTextInput from "./components/common/AppTextInput";
import PrimaryButton from "./components/common/PrimaryButton";

import AppScreen from "./components/common/AppScreen";
import ModeToggle from "./components/common/ModeToggle";

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
        email: user.email?.toLowerCase() || "",
        role: "admin",
        status: "active",
        joinedAt: new Date(),
      });
      await seedFinanceData(familyRef.id, user.uid);

      setMessage("Family created successfully!");

      setTimeout(() => {
        router.replace("/(drawer)/dashboard");
      }, 1000);
    } catch (error: any) {
      console.log("CREATE FAMILY ERROR:", error);
      console.log("ERROR CODE:", error?.code);
      console.log("ERROR MESSAGE:", error?.message);

      setMessage(
        `Failed to create family: ${error?.message || "Unknown error"}`,
      );
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
      const invitedRole = inviteData.role === "admin" ? "admin" : "member";

      // Create user profile
      await setDoc(doc(db, "users", user.uid), {
        activeFamilyId: familyId,
        role: invitedRole,
        email: googleEmail,
      });

      // Create family member record
      await setDoc(doc(db, "familyMembers", `${familyId}_${user.uid}`), {
        familyId,
        userId: user.uid,
        email: googleEmail,
        role: invitedRole,
        status: "active",
        joinedAt: new Date(),
      });

      // Mark invite accepted
      await updateDoc(doc(db, "invites", inviteDoc.id), {
        status: "accepted",
        acceptedBy: user.uid,
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
