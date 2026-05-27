import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { auth, db } from "../../services/auth";
import PrimaryButton from "../components/PrimaryButton";
import FamilyBudgetSection from "../components/settings/FamilyBudgetSection";

export default function SettingsScreen() {
  const router = useRouter();
  const [dailyBudget, setDailyBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      // 🔹 1. Get user's account
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const famId = userData.activeFamilyId;
      if (!famId) return;

      setFamilyId(famId);
      setIsAdmin(userData.role === "admin");

      // 🔹 2. Get account data
      const accountRef = doc(db, "families", famId);
      const accountSnap = await getDoc(accountRef);

      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        setDailyBudget(accountData.dailyBudget);
      }
    });

    return unsubscribe;
  }, []);

  const handleSwitchUser = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.log("Google sign-out skipped:", error);
    }

    await signOut(auth);

    router.replace("/login");
  };

  const handleUpdateBudget = async () => {
    if (!isAdmin || !familyId) return;

    const newBudget = Number(budgetInput);

    if (!newBudget || newBudget <= 0) return;

    const docRef = doc(db, "families", familyId);

    await updateDoc(docRef, {
      dailyBudget: newBudget,
    });

    setDailyBudget(newBudget);
    setBudgetInput("");
  };

  const handleInviteMember = async () => {
    if (!isAdmin || !familyId || !auth.currentUser) return;

    const email = inviteEmail.trim().toLowerCase();

    if (!email) return;

    await addDoc(collection(db, "invites"), {
      email,
      familyId,
      role: "member",
      createdBy: auth.currentUser.uid,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    setInviteEmail("");
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingTop: 80 }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 20 }}>
        Settings test
      </Text>

      <FamilyBudgetSection
        dailyBudget={dailyBudget}
        budgetInput={budgetInput}
        isAdmin={isAdmin}
        onBudgetInputChange={setBudgetInput}
        onUpdateBudget={handleUpdateBudget}
      />

      <View style={{ marginTop: 24 }}>
        <PrimaryButton title="Switch User" onPress={handleSwitchUser} />
      </View>
    </ScrollView>
  );
}
