import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { auth } from "../services/auth";
import BudgetSummaryCard from "./components/BudgetSummaryCard";
import ExpenseEntryForm from "./components/ExpenseEntryForm";
import PrimaryButton from "./components/PrimaryButton";
import RecentEntriesList from "./components/RecentEntriesList";

export default function DashboardScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("Loading...");
  const [refreshKey, setRefreshKey] = useState(0);
  const handleEntrySaved = () => {
  setRefreshKey((prev) => prev + 1);
};
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? "Unknown user");
    });

    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
      }}
      contentContainerStyle={{
        padding: 24,
        paddingTop: 80,
        justifyContent: "flex-start",
        alignItems: "stretch",
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        DailyBudget
      </Text>

      <BudgetSummaryCard />
      <ExpenseEntryForm onEntrySaved={handleEntrySaved} />
      <RecentEntriesList key={refreshKey} />

      <Text
        style={{
          fontSize: 18,
          color: "#009f65",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        You are signed in.
      </Text>

      <Text
        style={{
          fontSize: 16,
          color: "#009f65",
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        {userEmail}
      </Text>

      <View style={{ marginTop: 40 }}>
        <PrimaryButton title="Sign Out" onPress={handleSignOut} />
      </View>
    </ScrollView>
  );
}