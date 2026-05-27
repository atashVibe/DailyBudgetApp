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
import { auth, db } from "../../services/auth";
import {
  calculateMonthlyTotal,
  calculateYearlyTotal,
  type ReportEntry,
} from "../../services/reports";
import AppScreen from "../components/common/AppScreen";
import BudgetSummaryCard from "../components/BudgetSummaryCard";
import ExpenseEntryForm from "../components/ExpenseEntryForm";
import RecentEntriesList from "../components/RecentEntriesList";

type Entry = {
  id: string;
  amount: number;
  type: string;
  budgetAreaId?: string;
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
  const [familyId, setFamilyId] = useState<string | null>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUserEmail(user?.email ?? "Unknown user");
      setUserId(user?.uid ?? null);

      if (!user) {
        setFamilyId(null);
        setIsAdmin(false);
        setDailyBudget(30);
        setSpentThisMonth(0);
        setSpentThisYear(0);
        setEditingEntry(null);
        setUserEmail("Loading...");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setFamilyId(data.activeFamilyId);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!familyId) return;
    const loadMonthSpending = async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const q = query(
        collection(db, "entries"),
        where("familyId", "==", familyId),
      );

      const snapshot = await getDocs(q);

      const entries: ReportEntry[] = snapshot.docs.map((doc) => {
        const data: any = doc.data();

        return {
          amount: Number(data.amount || 0),
          type: String(
            data.type || "expense",
          ).toLowerCase() as ReportEntry["type"],
          date: data.date,
        };
      });

      const monthTotal = calculateMonthlyTotal(
        entries,
        currentYear,
        currentMonth,
      );

      const yearTotal = calculateYearlyTotal(entries, currentYear);

      setSpentThisMonth(monthTotal);
      setSpentThisYear(yearTotal);
    };

    loadMonthSpending();
  }, [refreshSignal, familyId]);

  const handleUpdateBudget = async () => {
    const newBudget = Number(budgetInput);

    if (!newBudget || newBudget <= 0) return;

    if (!familyId) return;
    const docRef = doc(db, "families", familyId);

    await updateDoc(docRef, {
      dailyBudget: newBudget,
    });

    setDailyBudget(newBudget);
    setBudgetInput("");
  };

  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(() => {
    const fetchAccountData = async () => {
      if (!familyId) return;

      const docRef = doc(db, "families", familyId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        setDailyBudget(data.dailyBudget);

        const memberDocRef = doc(db, "familyMembers", `${familyId}_${userId}`);
        const memberDocSnap = await getDoc(memberDocRef);

        if (memberDocSnap.exists()) {
          const memberData = memberDocSnap.data();
          setIsAdmin(memberData.role === "admin");
        } else {
          setIsAdmin(false);
        }
      }
    };

    fetchAccountData();
  });

  return (
    <AppScreen
      style={{
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
        {familyId && (
          <ExpenseEntryForm
            familyId={familyId}
            refreshSignal={refreshSignal}
            onEntrySaved={handleEntrySaved}
            entryToEdit={editingEntry}
            onCancelEdit={handleCancelEdit}
          />
        )}
      </View>

      {familyId && (
        <RecentEntriesList
          familyId={familyId}
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
    </AppScreen>
  );
}


