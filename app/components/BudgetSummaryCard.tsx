import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { calculateBudgetSummary } from "../../services/financeCalculations";

function getCardBackground(allowance: number) {
  if (allowance < -200) return "#000000";
  if (allowance < -20) return "#FDE8E8";
  if (allowance <= 20) return "#FFF5CC";
  return "#EAF9F1";
}

type Props = {
  dailyBudget: number;
  spentThisMonth?: number;
  spentThisYear?: number;
};

export default function BudgetSummaryCard({
  dailyBudget,
  spentThisMonth = 0,
  spentThisYear = 0,
}: Props) {
  const [showSpendingInfo, setShowSpendingInfo] = useState(false);
  const summary = calculateBudgetSummary(
    dailyBudget,
    spentThisMonth,
    spentThisYear,
  );

  const backgroundColor = getCardBackground(summary.remainingToday);
  const hasDarkBackground = backgroundColor === "#000000";
  const textColor = hasDarkBackground ? "#FF7B7B" : "#111827";
  const detailColor = hasDarkBackground ? textColor : "#4B5563";

  return (
    <View
      style={{
        width: "100%",
        backgroundColor,
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: textColor }}>
          Budget Summary
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Spending calculation"
          accessibilityState={{ expanded: showSpendingInfo }}
          hitSlop={6}
          onPress={() => setShowSpendingInfo((visible) => !visible)}
          style={{
            minWidth: 36,
            minHeight: 32,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              width: 18,
              borderWidth: 1,
              borderRadius: 9,
              borderColor: detailColor,
              color: detailColor,
              fontSize: 12,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            i
          </Text>
        </Pressable>
      </View>
      {showSpendingInfo && (
        <Text style={{ fontSize: 13, color: detailColor, marginBottom: 6 }}>
          Expenses minus refunds. Income and cashback do not affect your budget.
        </Text>
      )}

      <Text style={{ fontSize: 16, color: textColor, marginBottom: 4 }}>
        Allowance: ${summary.remainingToday.toFixed(2)}
      </Text>

      <Text style={{ fontSize: 14, color: textColor }}>
        Total Expenses: ${spentThisMonth.toFixed(2)}
        <Text style={{ fontSize: 12, fontWeight: "600" }}>
          {" · "}
          {summary.status.text === "On The Border! Be careful!"
            ? "Near limit"
            : summary.status.text}
        </Text>
      </Text>

      {summary.recoveryDays > 0 && (
        <Text
          style={{
            fontSize: 16,
            marginTop: 4,
            color: textColor,
            fontWeight: "700",
          }}
        >
          Recovery plan: No extra spending for {summary.recoveryDays} day
          {summary.recoveryDays === 1 ? "" : "s"}.
        </Text>
      )}
      <View
        style={{
          height: 12,
          backgroundColor: "#E5E7EB",
          borderRadius: 999,
          overflow: "hidden",
          marginTop: 6,
          marginBottom: 6,
        }}
      >
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Monthly budget used"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: summary.progressPercent,
          }}
          style={{
            height: "100%",
            width: `${summary.progressPercent}%`,
            backgroundColor: summary.status.color,
          }}
        />
      </View>
      <View
        style={{
          height: 12,
          backgroundColor: "#E5E7EB",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 6,
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${summary.monthPassedPercent}%`,
            backgroundColor: "#0ea249",
          }}
        />
      </View>
      <Text style={{ fontSize: 13, color: detailColor }}>
        Month passed: {summary.monthPassedPercent.toFixed(0)}% | Money used:{" "}
        {summary.progressPercent.toFixed(0)}%
      </Text>

      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 14, color: textColor }}>
          Yearly Spending: ${spentThisYear.toFixed(2)}
          <Text style={{ fontSize: 12, fontWeight: "600" }}>
            {" · "}
            {summary.yearlyStatus.text === "On The Border! Be careful!"
              ? "Near limit"
              : summary.yearlyStatus.text}
          </Text>
        </Text>
        <View
          style={{
            height: 12,
            backgroundColor: "#E5E7EB",
            borderRadius: 999,
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Yearly budget used"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: summary.yearlyProgressPercent,
            }}
            style={{
              height: "100%",
              width: `${summary.yearlyProgressPercent}%`,
              backgroundColor: summary.yearlyStatus.color,
            }}
          />
        </View>
      </View>
    </View>
  );
}
