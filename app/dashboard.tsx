import { useFocusEffect, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { auth, db } from "../services/auth";
import BudgetSummaryCard from "./components/BudgetSummaryCard";
import ExpenseEntryForm from "./components/ExpenseEntryForm";
import RecentEntriesList from "./components/RecentEntriesList";

type Entry = {
  id: string;
  amount: number;
  type: string;
  category: string;
  note: string;
  date?: string;
};

export default function DashboardScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("Loading...");
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const handleCancelEdit = () => {
    setEditingEntry(null);
  };
  const formPosition = useRef(0);
  const [dailyBudget, setDailyBudget] = useState(30);
  const [spentThisMonth, setSpentThisMonth] = useState(0);
  const [spentThisYear, setSpentThisYear] = useState(0);
  const handleEntrySaved = () => {
    setRefreshSignal((prev) => prev + 1);
    setEditingEntry(null);
  };
  const [budgetInput, setBudgetInput] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUserEmail(user?.email ?? "Unknown user");
      setUserId(user?.uid ?? null);

      if (!user) {
        setAccountId(null);
        setIsAdmin(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setAccountId(data.accountId);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!accountId) return;
    const loadMonthSpending = async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const q = query(
        collection(db, "entries"),
        where("accountId", "==", accountId),
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
  }, [refreshSignal, accountId]);

  const handleUpdateBudget = async () => {
    const newBudget = Number(budgetInput);

    if (!newBudget || newBudget <= 0) return;

    if (!accountId) return;
    const docRef = doc(db, "accounts", accountId);

    await updateDoc(docRef, {
      dailyBudget: newBudget,
    });

    setDailyBudget(newBudget);
    setBudgetInput("");
  };

  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(() => {
    const fetchAccountData = async () => {
      if (!accountId) return;

      const docRef = doc(db, "accounts", accountId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        setDailyBudget(data.dailyBudget);

        if (userId && data.adminUserId === userId) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    };

    fetchAccountData();
  });

  return (
    <ScrollView
      ref={scrollRef}
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
        {accountId && (
          <ExpenseEntryForm
            accountId={accountId}
            onEntrySaved={handleEntrySaved}
            entryToEdit={editingEntry}
            onCancelEdit={handleCancelEdit}
          />
        )}
      </View>

      {accountId && (
        <RecentEntriesList
          accountId={accountId}
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
      )}
      <Text
        style={{
          fontSize: 18,
          color: "#009f65",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: isAdmin ? "#009f65" : "#666",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {isAdmin ? "Admin account" : "Member account"}
        </Text>
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
    </ScrollView>
  );
}
