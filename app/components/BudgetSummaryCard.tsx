import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { calculateBudgetSummary } from "../../services/financeCalculations";
import { dashboardStyles as ui } from "./common/dashboardStyles";

type Props = {
  dailyBudget: number;
  spentThisMonth?: number;
  spentThisYear?: number;
};
const money = (value: number) => `$${value.toFixed(2)}`;
const compactMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
function Progress({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={{
        height: 9,
        backgroundColor: "#DCE5F1",
        borderRadius: 20,
        overflow: "hidden",
        marginTop: 5,
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${value}%`,
          backgroundColor: color,
          borderRadius: 20,
        }}
      />
    </View>
  );
}
function Ring({ percent, negative }: { percent: number; negative: boolean }) {
  const value = Math.max(0, Math.min(100, percent));
  const color = negative ? "#C53030" : "#2BCEA6";
  return (
    <View
      style={{
        width: 108,
        height: 108,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Platform.OS === "web" ? (
        React.createElement(
          "svg",
          {
            width: 108,
            height: 108,
            viewBox: "0 0 124 124",
            "aria-hidden": true,
            style: { position: "absolute" },
          },
          React.createElement("circle", {
            cx: 62,
            cy: 62,
            r: 54,
            fill: "none",
            stroke: "#CEEFE1",
            strokeWidth: 11,
          }),
          React.createElement("circle", {
            cx: 62,
            cy: 62,
            r: 54,
            fill: "none",
            stroke: color,
            strokeWidth: 11,
            strokeLinecap: value ? "round" : "butt",
            strokeDasharray: `${(339.292 * value) / 100} 339.292`,
            transform: "rotate(-90 62 62)",
          }),
        )
      ) : (
        <>
          <View
            style={{
              position: "absolute",
              inset: 2,
              borderWidth: 11,
              borderColor: "#CEEFE1",
              borderRadius: 62,
            }}
          />
          {Array.from({ length: Math.round(value) }, (_, i) => {
            const angle = ((i * 3.6 - 90) * Math.PI) / 180;
            return (
              <View
                key={i}
                style={{
                  position: "absolute",
                  width: 11,
                  height: 11,
                  borderRadius: 6,
                  backgroundColor: color,
                  left: 48.5 + 46 * Math.cos(angle),
                  top: 48.5 + 46 * Math.sin(angle),
                }}
              />
            );
          })}
        </>
      )}
      <Text style={{ fontSize: 26, fontWeight: "800", color: "#10182B" }}>
        {value.toFixed(0)}%
      </Text>
      <Text style={{ fontSize: 13, color: "#334155" }}>Remaining</Text>
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
  const now = new Date();
  const summary = calculateBudgetSummary(
    dailyBudget,
    spentThisMonth,
    spentThisYear,
    now,
  );
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const year = now.getFullYear();
  const yearDays =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  const allowance =
    (Math.round(dailyBudget * 100) * (yearly ? yearDays : now.getDate())) / 100;
  const spending = yearly ? spentThisYear : spentThisMonth;
  const remaining = yearly
    ? (Math.round(allowance * 100) - Math.round(spending * 100)) / 100
    : summary.remainingToday;
  const percent = allowance > 0 ? (remaining / allowance) * 100 : 0;
  const status = yearly ? summary.yearlyStatus : summary.status;
  return (
    <View style={ui.card}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 15,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={[ui.title, { fontSize: 18 }]}>Budget Overview</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Spending calculation"
            onPress={() => setShowInfo(!showInfo)}
            hitSlop={8}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#52647A"
            />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Budget period"
          accessibilityState={{ expanded: showPeriods }}
          onPress={() => setShowPeriods(!showPeriods)}
          style={ui.period}
        >
          <Text style={{ color: "#17243A", fontSize: 13 }}>
            {yearly ? "This Year" : "This Month"}
          </Text>
          <Ionicons name="chevron-down" size={15} />
        </Pressable>
      </View>
      {showPeriods && (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          {[false, true].map((value) => (
            <Pressable
              key={String(value)}
              accessibilityRole="button"
              onPress={() => {
                setYearly(value);
                setShowPeriods(false);
              }}
              style={ui.period}
            >
              <Text>{value ? "This Year" : "This Month"}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {showInfo && (
        <Text style={ui.detail}>
          Monthly allowance is earned through today; Remaining is that allowance
          minus expenses and refunds. Status compares spending with the full
          month or year. Income and cashback do not affect these figures.
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <View style={{ alignItems: "center", flexGrow: 1 }}>
          <Ring percent={percent} negative={remaining < 0} />
        </View>
        <View style={{ flexGrow: 2, flexBasis: 165, minWidth: 0, gap: 8 }}>
          <Metric
            icon="wallet-outline"
            label="Allowance"
            value={money(allowance)}
          />
          <Metric
            icon="pricetag-outline"
            label="Total Expenses"
            value={money(spending)}
          />
          <Metric
            icon="cash-outline"
            label="Remaining"
            value={money(remaining)}
            highlighted
            negative={remaining < 0}
          />
          <Text
            style={{
              fontSize: 12,
              color: status.text === "Over budget" ? "#B91C1C" : "#486175",
            }}
          >
            {status.text === "On The Border! Be careful!"
              ? "Near limit"
              : status.text}{" "}
            · {yearly ? "Whole year" : "Whole month"} budget
          </Text>
          {!yearly && (
            <Progress
              value={summary.progressPercent}
              label="Monthly budget used"
              color="#2BCEA6"
            />
          )}
        </View>
      </View>
      {summary.recoveryDays > 0 && !yearly && (
        <Text style={{ marginTop: 10, color: "#B91C1C", fontSize: 13 }}>
          Recovery plan: No extra spending for {summary.recoveryDays} day
          {summary.recoveryDays === 1 ? "" : "s"}.
        </Text>
      )}
      <View
        style={{
          backgroundColor: "#F7FAFF",
          borderRadius: 14,
          marginTop: 16,
          padding: 12,
          gap: 13,
        }}
      >
        <View testID="month-progress-row">
          <View style={ui.progressRow}>
            <View style={ui.progressLabel}>
              <Ionicons name="calendar-outline" size={19} color="#009F62" />
              <Text style={ui.progressTitle}>Month Progress</Text>
            </View>
            <Text style={[ui.detail, { flexShrink: 1, textAlign: "right" }]}>
              {now.getDate()} of {days} days (
              {summary.monthPassedPercent.toFixed(0)}%)
            </Text>
          </View>
          <Progress
            value={summary.monthPassedPercent}
            label="Month progress"
            color="#2BCEA6"
          />
        </View>
        <View testID="yearly-spending-row">
          <View style={ui.progressRow}>
            <View style={ui.progressLabel}>
              <Ionicons
                name="calendar-number-outline"
                size={19}
                color="#009F62"
              />
              <Text style={ui.progressTitle}>Yearly Spending</Text>
            </View>
            <Text
              accessibilityLabel={`${money(spentThisYear)} of ${money((Math.round(dailyBudget * 100) * yearDays) / 100)} (${summary.yearlyUsedPercent.toFixed(0)}%)`}
              style={[ui.detail, { flexShrink: 1, textAlign: "right" }]}
            >
              {compactMoney(spentThisYear)} /{" "}
              {compactMoney((Math.round(dailyBudget * 100) * yearDays) / 100)} (
              {summary.yearlyUsedPercent.toFixed(0)}%)
            </Text>
          </View>
          <Progress
            value={summary.yearlyProgressPercent}
            label="Yearly budget used"
            color="#0589DD"
          />
        </View>
      </View>
    </View>
  );
}
function Metric({
  icon,
  label,
  value,
  highlighted,
  negative,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  highlighted?: boolean;
  negative?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        padding: 8,
        borderRadius: 12,
        backgroundColor: highlighted
          ? negative
            ? "#FEE2E2"
            : "#CFF3DF"
          : "transparent",
      }}
    >
      <Ionicons
        name={icon}
        size={20}
        color={highlighted ? "#00854C" : "#17243A"}
      />
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: highlighted ? "700" : "400",
          color: "#17243A",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: negative ? "#B91C1C" : highlighted ? "#007D43" : "#10182B",
          flexShrink: 1,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
