import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { auth, db } from "../services/auth";
import PrimaryButton from "./components/PrimaryButton";

export default function SettingsScreen() {
  const [dailyBudget, setDailyBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      // 🔹 1. Get user's account
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const accId = userData.accountId;

      setAccountId(accId);
      setIsAdmin(userData.role === "admin");

      // 🔹 2. Get account data
      const accountRef = doc(db, "accounts", accId);
      const accountSnap = await getDoc(accountRef);

      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        setDailyBudget(accountData.dailyBudget);
      }
    });

    return unsubscribe;
  }, []);

  const handleUpdateBudget = async () => {
    if (!isAdmin || !accountId) return;

    const newBudget = Number(budgetInput);

    if (!newBudget || newBudget <= 0) return;

    const docRef = doc(db, "accounts", accountId);

    await updateDoc(docRef, {
      dailyBudget: newBudget,
    });

    setDailyBudget(newBudget);
    setBudgetInput("");
  };

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 80 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 20 }}>
        Settings
      </Text>

      <Text style={{ marginBottom: 10 }}>
        Current Daily Budget: {dailyBudget}
      </Text>

      {isAdmin ? (
        <>
          <TextInput
            value={budgetInput}
            onChangeText={setBudgetInput}
            placeholder="Enter new daily budget"
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
            }}
          />

          <PrimaryButton
            title="Update Family Daily Budget"
            onPress={handleUpdateBudget}
          />
        </>
      ) : (
        <Text style={{ color: "#666", marginTop: 10 }}>
          Only the account admin can change the family budget.
        </Text>
      )}
    </View>
  );
}
