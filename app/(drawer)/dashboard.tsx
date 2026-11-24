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
import { Platform, ScrollView, View } from "react-native";
import Text from "../components/common/AppText";
import { useDashboardBack } from "../../hooks/useDashboardBack";
import {
  withTimeout,
  withCloudRetry,
  restartCloudConnection,
} from "../../services/loading";
import PrimaryButton from "../components/common/PrimaryButton";
import { auth, db } from "../../services/auth";
import {
  calculateMonthlyTotal,
  calculateYearlyTotal,
  type ReportEntry,
} from "../../services/reports";
import BudgetSummaryCard from "../components/BudgetSummaryCard";
import AppScreen from "../components/common/AppScreen";
import {
  dashboardStyles as ui,
  uiTokens as tokens,
} from "../components/common/dashboardStyles";
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
  useDashboardBack();
  const [accountIdentifier, setAccountIdentifier] = useState("Loading...");
  const [usesApplePrivateEmail, setUsesApplePrivateEmail] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const entriesFamily = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const formRef = useRef<View>(null);
  const handleCancelEdit = () => {
    setEditingEntry(null);
  };
  const formPosition = useRef(0);
  const revealForm = useCallback(() => {
    if (Platform.OS === "web") {
      // Web can scroll the document or an ancestor ScrollView. Let the browser
      // reveal the actual form in either case instead of guessing an offset.
      (formRef.current as unknown as HTMLElement | null)?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    } else {
      scrollRef.current?.scrollTo({
        y: Math.max(0, formPosition.current - 8),
        animated: false,
      });
    }
  }, []);
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
        try {
          await withTimeout(auth.authStateReady());
        } catch {
          if (active) {
            setLoadError(
              "Could not restore sign-in. Check your connection and retry.",
            );
            setLoading(false);
          }
          return;
        }
        if (!active) return;
        const user = auth.currentUser;
        if (!user) {
          router.replace("/login");
          return;
        }

        setLoading(true);
        setLoadError("");
        try {
          const userSnap = await withCloudRetry(async () => {
            const snapshot = await getDoc(doc(db, "users", user.uid));
            if (!snapshot.exists() && snapshot.metadata.fromCache)
              throw Object.assign(
                new Error("Reconnect to load your account."),
                { code: "unavailable" },
              );
            return snapshot;
          });
          if (!active) return;
          const nextFamilyId = userSnap.data()?.activeFamilyId as
            | string
            | undefined;

          if (!nextFamilyId) {
            router.replace("/family-setup");
            return;
          }

          const [familySnap, memberSnap] = await withCloudRetry(async () => {
            const snapshots = await Promise.all([
              getDoc(doc(db, "families", nextFamilyId)),
              getDoc(doc(db, "familyMembers", `${nextFamilyId}_${user.uid}`)),
            ]);
            if (
              snapshots.some(
                (snapshot) => !snapshot.exists() && snapshot.metadata.fromCache,
              )
            )
              throw Object.assign(new Error("Reconnect to load your family."), {
                code: "unavailable",
              });
            return snapshots;
          });
          if (!active) return;

          if (!familySnap.exists() || familySnap.data().status === "deleted") {
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
          setEntriesError("");
          setFamilyId(nextFamilyId);
          setDailyBudget(Number(familySnap.data().dailyBudget || 30));
          setIsAdmin(memberSnap.exists() && memberSnap.data().role === "admin");
          setRefreshSignal((current) => current + 1);
        } catch (error) {
          console.error("Failed to load dashboard:", error);
          if (active) {
            setLoadError(
              "You're still signed in. We couldn't connect to your budget. Check your connection and retry.",
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
      // Retrying must restart the focused loader even when the route is unchanged.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, loadAttempt]),
  );

  useEffect(() => {
    if (!familyId) return;
    if (entriesFamily.current !== familyId) {
      entriesFamily.current = familyId;
      setEntriesLoaded(false);
      setEntries([]);
      setSpentThisMonth(0);
      setSpentThisYear(0);
    }
    let active = true;
    setEntriesError("");
    const loadMonthSpending = async () => {
      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const q = query(
          collection(db, "entries"),
          where("familyId", "==", familyId),
          orderBy("createdAt", "desc"),
        );

        const snapshot = await withCloudRetry(() => getDocs(q));
        if (!active) return;

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
        setEntriesLoaded(true);
      } catch {
        if (active)
          setEntriesError(
            "Couldn't update spending. Your entries are kept. Check your connection and retry.",
          );
      }
    };

    void loadMonthSpending();
    return () => {
      active = false;
    };
  }, [refreshSignal, familyId]);

  if (loading) {
    return (
      <AppScreen style={{ padding: 16 }}>
        <DashboardLoadingCard label="Budget overview" rows={3} />
        <DashboardLoadingCard label="New entry" rows={4} />
        <DashboardLoadingCard label="Recent entries" rows={3} />
      </AppScreen>
    );
  }

  if (loadError) {
    return (
      <AppScreen style={{ justifyContent: "center" }}>
        <Text style={{ color: "#B91C1C", textAlign: "center" }}>
          {loadError}
        </Text>
        <PrimaryButton
          title="Retry dashboard"
          onPress={() => {
            void restartCloudConnection().finally(() =>
              setLoadAttempt((value) => value + 1),
            );
          }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      ref={scrollRef}
      style={{
        padding: 16,
        paddingTop: 18,
        backgroundColor: tokens.page,
        justifyContent: "flex-start",
        alignItems: "stretch",
      }}
    >
      {entriesLoaded ? (
        <BudgetSummaryCard
          dailyBudget={dailyBudget}
          spentThisMonth={spentThisMonth}
          spentThisYear={spentThisYear}
        />
      ) : !entriesError ? (
        <DashboardLoadingCard label="Budget overview" rows={3} />
      ) : null}
      {entriesError && (
        <View style={{ gap: 8, marginBottom: 12 }}>
          <Text accessibilityLiveRegion="polite">{entriesError}</Text>
          <PrimaryButton
            title="Retry spending"
            onPress={() => setRefreshSignal((value) => value + 1)}
          />
        </View>
      )}

      <View
        ref={formRef}
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
            onEditReady={revealForm}
          />
        )}
      </View>

      {!entriesLoaded && !entriesError ? (
        <DashboardLoadingCard label="Recent entries" rows={3} />
      ) : (
        familyId && (
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
            }}
          />
        )
      )}
      <Text
        style={{
          fontSize: 18,
          color: tokens.muted,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: tokens.muted,
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
          color: tokens.muted,
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

function DashboardLoadingCard({
  label,
  rows,
}: {
  label: string;
  rows: number;
}) {
  return (
    <View
      style={[
        ui.card,
        { minHeight: label === "Budget overview" ? 430 : undefined },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Loading ${label.toLowerCase()}`}
      accessibilityState={{ busy: true }}
    >
      <Text style={ui.title}>{label}</Text>
      <View accessible={false} style={{ gap: 12, marginTop: 16 }}>
        {Array.from({ length: rows }, (_, index) => (
          <View
            key={index}
            style={{
              height: index === 0 ? 32 : 16,
              width: index === rows - 1 ? "65%" : "100%",
              backgroundColor: tokens.border,
              borderRadius: 6,
            }}
          />
        ))}
      </View>
    </View>
  );
}
