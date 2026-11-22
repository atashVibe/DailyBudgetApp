import { useRouter } from "expo-router";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { useRef, useState } from "react";
import { Text } from "react-native";
import { joinFamilyWithCode } from "../services/families";
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
  const submitting = useRef(false);
  const [message, setMessage] = useState("");
  const handleStartFamily = async () => {
    if (submitting.current) return;
    submitting.current = true;
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
      const familyRef = doc(collection(db, "families"));
      const batch = writeBatch(db);
      batch.set(familyRef, {
        name: familyName.trim(),
        dailyBudget: 30,
        status: "active",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, "users", user.uid), {
        activeFamilyId: familyRef.id,
        role: "admin",
        email: user.email?.toLowerCase() || "",
      });
      batch.set(doc(db, "familyMembers", `${familyRef.id}_${user.uid}`), {
        familyId: familyRef.id,
        userId: user.uid,
        email: user.email?.toLowerCase() || "",
        role: "admin",
        status: "active",
        ...(user.displayName?.trim()
          ? { displayName: user.displayName.trim() }
          : {}),
        joinedAt: serverTimestamp(),
      });
      await batch.commit();
      await seedFinanceData(familyRef.id, user.uid);

      setMessage("Family created successfully!");

      router.replace("/(drawer)/dashboard");
    } catch (error: any) {
      console.log("CREATE FAMILY ERROR:", error);
      console.log("ERROR CODE:", error?.code);
      console.log("ERROR MESSAGE:", error?.message);

      setMessage(
        `Failed to create family: ${error?.message || "Unknown error"}`,
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      setLoading(true);
      setMessage("");

      const user = auth.currentUser;

      if (!user) {
        setMessage("User not found.");
        return;
      }

      if (inviteCode.length !== 8) {
        setMessage("Enter a valid 8-digit code.");
        return;
      }

      if (!user.emailVerified) {
        router.push({
          pathname: "/join-invitation",
          params: { code: inviteCode },
        });
        return;
      }
      if (!user.email) {
        setMessage("Sign in with the invited email address.");
        return;
      }
      await joinFamilyWithCode(
        user.uid,
        user.email,
        inviteCode,
        user.displayName,
      );

      setMessage("Joined family successfully!");

      router.replace("/(drawer)/dashboard");
    } catch (error) {
      console.log(error);

      setMessage("Failed to join family.");
    } finally {
      submitting.current = false;
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
            placeholder="Enter 8-digit invitation code"
            value={inviteCode}
            onChangeText={(text) =>
              setInviteCode(text.replace(/[^0-9]/g, "").slice(0, 8))
            }
            keyboardType="number-pad"
            maxLength={8}
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
