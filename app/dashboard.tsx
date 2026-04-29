import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { auth, db } from "../services/auth";
import BudgetSummaryCard from "./components/BudgetSummaryCard";
import ExpenseEntryForm from "./components/ExpenseEntryForm";
import PrimaryButton from "./components/PrimaryButton";
import RecentEntriesList from "./components/RecentEntriesList";

const ACCOUNT_ID = "9AfxRrBY2raoW8Rhts7x";

type Entry = {
  id: string;
  amount: number;
  type: string;
  category: string;
  note: string;
  date?: string;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("Loading...");
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const handleCancelEdit = () => { setEditingEntry(null); };
  const formPosition = useRef(0);
  const [dailyBudget] = useState(30);
  const [spentThisMonth, setSpentThisMonth] = useState(0);
  const [spentThisYear, setSpentThisYear] = useState(0);
  const handleEntrySaved = () => {
    setRefreshSignal((prev) => prev + 1);
    setEditingEntry(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? "Unknown user");
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadMonthSpending = async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const q = query(
        collection(db, "entries"),
        where("accountId", "==", ACCOUNT_ID)
      );

      const snapshot = await getDocs(q);

      let monthTotal = 0;
      let yearTotal = 0;

      snapshot.forEach((doc) => {
        const data: any = doc.data();

        if (!data.date) return;

        const entryDate = new Date(data.date + "T00:00:00");

        const isThisMonth =
          entryDate.getFullYear() === currentYear &&
          entryDate.getMonth() === currentMonth;

        const isThisYear = entryDate.getFullYear() === currentYear;

        const amount = Number(data.amount || 0);

        if (data.type === "Expense") {
          if (isThisMonth) monthTotal += amount;
          if (isThisYear) yearTotal += amount;
        }

        if (data.type === "Refund") {
          if (isThisMonth) monthTotal -= amount;
          if (isThisYear) yearTotal -= amount;
        }
      });

      setSpentThisMonth(monthTotal);
      setSpentThisYear(yearTotal);
    };

    loadMonthSpending();
  }, [refreshSignal]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <ScrollView ref={scrollRef}
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

      <BudgetSummaryCard
        dailyBudget={dailyBudget}
        spentThisMonth={spentThisMonth}
        spentThisYear={spentThisYear}
      />

      <View
        onLayout={(event) => {
          formPosition.current = event.nativeEvent.layout.y;
        }}
      >
        <ExpenseEntryForm
          accountId={ACCOUNT_ID}
          onEntrySaved={handleEntrySaved}
          entryToEdit={editingEntry}
          onCancelEdit={handleCancelEdit}
        />
      </View>

      <RecentEntriesList
        accountId={ACCOUNT_ID}
        editingEntryId={editingEntry?.id ?? null}
        refreshSignal={refreshSignal}
        onEntryDeleted={() => setRefreshSignal((prev) => prev + 1)}
        onEditEntry={(entry) => {
          setEditingEntry(entry);
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              y: formPosition.current,
              animated: true,
            });
          }, 100);
        }}
      />
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