import { useFocusEffect, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { auth, db } from "../../services/auth";
import {
  calculateMonthlyTotal,
  calculateYearlyTotal,
  type ReportEntry,
} from "../../services/reports";
import BudgetSummaryCard from "../components/BudgetSummaryCard";
import AppScreen from "../components/common/AppScreen";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ExpenseEntryForm from "../components/ExpenseEntryForm";
import RecentEntriesList from "../components/RecentEntriesList";

type Entry = {
  id: string;
  amount: number;
  type: string;
  budgetAreaId?: string;
  categoryId?: string;
  category: string;
  note: string;
  date?: string;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [accountIdentifier, setAccountIdentifier] = useState("Loading...");
  const [usesApplePrivateEmail, setUsesApplePrivateEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
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
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadDashboardContext = async () => {
        const user = auth.currentUser;
        if (!user) {
          router.replace("/login");
          return;
        }

        setLoading(true);
        setLoadError("");
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          const nextFamilyId = userSnap.data()?.activeFamilyId as
            | string
            | undefined;

          if (!nextFamilyId) {
            router.replace("/family-setup");
            return;
          }

          const [familySnap, memberSnap] = await Promise.all([
            getDoc(doc(db, "families", nextFamilyId)),
            getDoc(
              doc(db, "familyMembers", `${nextFamilyId}_${user.uid}`),
            ),
          ]);

          if (
            !familySnap.exists() ||
            familySnap.data().status === "deleted"
          ) {
            router.replace("/family-setup");
            return;
          }

          if (!active) return;
          const email = user.email?.trim() ?? "";
          const hasApplePrivateEmail = email
            .toLowerCase()
            .endsWith("@privaterelay.appleid.com");
          const displayName = user.displayName?.trim();

          setUsesApplePrivateEmail(hasApplePrivateEmail);
          setAccountIdentifier(
            hasApplePrivateEmail
              ? displayName || "Email hidden by Apple"
              : email || displayName || "Unknown user",
          );
          setEditingEntry(null);
          setSpentThisMonth(0);
          setSpentThisYear(0);
          setFamilyId(nextFamilyId);
          setDailyBudget(Number(familySnap.data().dailyBudget || 30));
          setIsAdmin(
            memberSnap.exists() && memberSnap.data().role === "admin",
          );
          setRefreshSignal((current) => current + 1);
        } catch (error) {
          console.error("Failed to load dashboard:", error);
          if (active) {
            setLoadError(
              "The dashboard could not be loaded. Please try opening it again.",
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      };

      void loadDashboardContext();
      return () => {
        active = false;
      };
    }, [router]),
  );

  useEffect(() => {
    if (!familyId) return;
    const loadMonthSpending = async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const q = query(
        collection(db, "entries"),
        where("familyId", "==", familyId),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);

      const loadedEntries: Entry[] = snapshot.docs.map((entryDocument) => {
        const data = entryDocument.data();

        return {
          id: entryDocument.id,
          amount: Number(data.amount || 0),
          type: String(data.type || "expense").toLowerCase(),
          budgetAreaId: data.budgetAreaId,
          category: data.category || "",
          categoryId: data.categoryId,
          note: String(data.note || ""),
          date: data.date,
        };
      });

      setEntries(loadedEntries);

      const reportEntries: ReportEntry[] = loadedEntries.map((entry) => ({
        amount: entry.amount,
        type: entry.type as ReportEntry["type"],
        date: entry.date,
      }));

      const monthTotal = calculateMonthlyTotal(
        reportEntries,
        currentYear,
        currentMonth,
      );

      const yearTotal = calculateYearlyTotal(reportEntries, currentYear);

      setSpentThisMonth(monthTotal);
      setSpentThisYear(yearTotal);
    };

    loadMonthSpending();
  }, [refreshSignal, familyId]);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (loadError) {
    return (
      <AppScreen style={{ justifyContent: "center" }}>
        <Text style={{ color: "#B91C1C", textAlign: "center" }}>
          {loadError}
        </Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      style={{
        padding: 24,
        paddingTop: 24,
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
          entries={entries}
          editingEntryId={editingEntry?.id ?? null}
          refreshSignal={refreshSignal}
          onEntryDeleted={(entryId) => {
            setEntries((current) =>
              current.filter((entry) => entry.id !== entryId),
            );
            setRefreshSignal((prev) => prev + 1);
          }}
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
        {accountIdentifier}
      </Text>

      {usesApplePrivateEmail && (
        <Text
          style={{
            fontSize: 13,
            color: "#64748B",
            textAlign: "center",
            marginTop: -16,
            marginBottom: 24,
          }}
        >
          Signed in with Apple using Hide My Email
        </Text>
      )}
    </AppScreen>
  );
}
