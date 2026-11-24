import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Text from "./common/AppText";
import { calculateBudgetSummary } from "../../services/financeCalculations";
import {
  dashboardStyles as ui,
  uiTokens as tokens,
} from "./common/dashboardStyles";
import InfoButton from "../../components/InfoButton";

type Props = {
  dailyBudget: number;
  spentThisMonth?: number;
  spentThisYear?: number;
};
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
function Progress({ value, label }: { value: number; label: string }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: value }}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      style={styles.track}
    >
      <View
        style={{
          height: "100%",
          width: `${value}%`,
          backgroundColor: tokens.pressed,
          borderRadius: 10,
        }}
      />
    </View>
  );
}
export default function BudgetSummaryCard({
  dailyBudget,
  spentThisMonth = 0,
  spentThisYear = 0,
}: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [showPeriods, setShowPeriods] = useState(false);
  const [details, setDetails] = useState(false);
  const now = new Date(),
    year = now.getFullYear();
  const summary = calculateBudgetSummary(
    dailyBudget,
    spentThisMonth,
    spentThisYear,
    now,
  );
  const monthDays = new Date(year, now.getMonth() + 1, 0).getDate();
  const yearDays =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  const elapsed = yearly
    ? Math.round(
        (Date.UTC(year, now.getMonth(), now.getDate()) - Date.UTC(year, 0, 1)) /
          86400000,
      ) + 1
    : now.getDate();
  const periodDays = yearly ? yearDays : monthDays;
  const daysLeft = periodDays - elapsed + 1;
  const budget = (Math.round(dailyBudget * 100) * periodDays) / 100;
  const yearlyBudget = (Math.round(dailyBudget * 100) * yearDays) / 100;
  const spending = yearly ? spentThisYear : spentThisMonth;
  // Preserve the existing earned monthly allowance and full-year remaining values.
  const remaining = yearly
    ? (Math.round(budget * 100) - Math.round(spending * 100)) / 100
    : summary.remainingToday;
  const used = yearly ? summary.yearlyUsedPercent : summary.usedPercent;
  const fill = yearly ? summary.yearlyProgressPercent : summary.progressPercent;
  const today = (elapsed / periodDays) * 100;
  // Same budget × elapsed share, using the existing daily-budget cent precision.
  const pace = (Math.round(dailyBudget * 100) * elapsed) / 100;
  const over = spending > budget;
  const ahead = spending > pace;
  const status = over
    ? "Over budget"
    : ahead
      ? "Spending ahead of pace"
      : `On track, ${money(pace - spending)} under pace`;
  const statusText = over
    ? tokens.dangerText
    : ahead
      ? tokens.amberText
      : tokens.tealText;
  return (
    <View style={ui.card} testID="budget-overview-card">
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={ui.title}>Budget overview</Text>
          <InfoButton
            label="Spending calculation"
            expanded={showInfo}
            onPress={() => setShowInfo(!showInfo)}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Budget period"
          accessibilityState={{ expanded: showPeriods }}
          onPress={() => setShowPeriods(!showPeriods)}
          style={ui.period}
        >
          <Text style={{ fontSize: 13, color: tokens.text }}>
            {yearly ? "This year" : "This month"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={tokens.muted} />
        </Pressable>
      </View>
      {showPeriods && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {[false, true].map((value) => (
            <Pressable
              key={String(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: yearly === value }}
              onPress={() => {
                setYearly(value);
                setShowPeriods(false);
              }}
              style={ui.period}
            >
              <Text style={ui.detail}>
                {value ? "This year" : "This month"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {showInfo && (
        <Text style={[ui.detail, { marginBottom: 12 }]}>
          Monthly allowance is earned through today; Remaining is that allowance
          minus expenses and refunds. The yearly amount uses the full year. The
          bar compares spending with the whole month or year budget; Today marks
          the elapsed days. The pace badge is a daily comparison. The daily
          guide divides the existing remaining amount by days left, including
          today. Income and cashback do not affect these figures.
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <Text
          style={[
            styles.numbers,
            {
              fontSize: 30,
              fontWeight: "600",
              color: remaining < 0 ? tokens.danger : tokens.text,
            },
          ]}
        >
          {money(remaining)}
        </Text>
        <Text style={{ fontSize: 15, color: tokens.muted }}>left</Text>
      </View>
      <Text style={[ui.detail, { marginTop: 4, marginBottom: 20 }]}>
        {daysLeft} day{daysLeft === 1 ? "" : "s"} left, about{" "}
        <Text style={{ color: tokens.tealText, fontWeight: "600" }}>
          {money(remaining / daysLeft)} a day
        </Text>
      </Text>
      <View style={{ position: "relative" }}>
        <Progress
          value={fill}
          label={yearly ? "Yearly budget used" : "Monthly budget used"}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: `${Math.max(1, Math.min(99, today))}%`,
            top: -3,
            height: 16,
            width: 2,
            backgroundColor: tokens.text,
          }}
        />
        <View
          style={{
            alignSelf: "flex-start",
            marginLeft: `${Math.max(0, Math.min(84, today - 5))}%`,
            marginTop: 5,
          }}
        >
          <Text style={{ fontSize: 12, color: tokens.muted }}>Today</Text>
        </View>
      </View>
      <Text style={[ui.detail, styles.numbers, { marginTop: 6 }]}>
        {money(spending)} spent ({used.toFixed(0)}%)
      </Text>
      <View
        accessibilityRole="text"
        style={{
          alignSelf: "flex-start",
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 5,
          marginTop: 12,
          borderWidth: 1,
          borderColor: over
            ? tokens.danger
            : ahead
              ? tokens.amber
              : "transparent",
          backgroundColor: over
            ? tokens.dangerTint
            : ahead
              ? tokens.amberTint
              : tokens.tint,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "500", color: statusText }}>
          {status}
        </Text>
      </View>
      {summary.recoveryDays > 0 && !yearly && (
        <Text style={[ui.detail, { color: tokens.danger, marginTop: 8 }]}>
          Recovery plan: No extra spending for {summary.recoveryDays} day
          {summary.recoveryDays === 1 ? "" : "s"}.
        </Text>
      )}
      <View style={styles.divider} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          ["Budget", budget],
          ["Spent", spending],
          ["Daily budget", dailyBudget],
        ].map(([label, value]) => (
          <View key={String(label)} style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={{ fontSize: 12, color: tokens.muted }}>{label}</Text>
            <Text style={[styles.numbers, { fontSize: 15, fontWeight: "500" }]}>
              {money(Number(value))}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.divider} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[ui.detail, styles.numbers, { flex: 1, minWidth: 0 }]}>
          Yearly: {money(spentThisYear)} of {money(yearlyBudget)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Budget details"
          accessibilityState={{ expanded: details }}
          onPress={() => setDetails(!details)}
          style={styles.textButton}
        >
          <Text style={{ fontSize: 13, color: tokens.tealText }}>Details</Text>
          <Ionicons
            name={details ? "chevron-up" : "chevron-forward"}
            size={14}
            color={tokens.tealText}
          />
        </Pressable>
      </View>
      {details && (
        <View style={{ gap: 16, marginTop: 12 }}>
          <View testID="month-progress-row">
            <View style={ui.progressRow}>
              <Text style={ui.progressTitle}>Month progress</Text>
              <Text style={ui.detail}>
                {now.getDate()} of {monthDays} days (
                {summary.monthPassedPercent.toFixed(0)}%)
              </Text>
            </View>
            <Progress
              value={summary.monthPassedPercent}
              label="Month progress"
            />
          </View>
          <View testID="yearly-spending-row">
            <View style={ui.progressRow}>
              <Text style={ui.progressTitle}>Yearly spending</Text>
              <Text style={[ui.detail, { flexShrink: 1, textAlign: "right" }]}>
                {money(spentThisYear)} / {money(yearlyBudget)} (
                {summary.yearlyUsedPercent.toFixed(0)}%)
              </Text>
            </View>
            <Progress
              value={summary.yearlyProgressPercent}
              label="Yearly budget used"
            />
          </View>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  track: {
    height: 10,
    backgroundColor: tokens.border,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 5,
  },
  numbers: { fontVariant: ["tabular-nums"], color: tokens.text },
  divider: { height: 1, backgroundColor: tokens.border, marginVertical: 12 },
  textButton: {
    minHeight: 48,
    paddingLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
});
