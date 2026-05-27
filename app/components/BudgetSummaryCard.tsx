import { Text, View } from "react-native";
import { calculateBudgetSummary } from "../../services/financeCalculations";

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
  const summary = calculateBudgetSummary(
    dailyBudget,
    spentThisMonth,
    spentThisYear,
  );

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: "#EAF9F1",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Budget Summary
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 6 }}>
        Allowance: ${summary.remainingToday.toFixed(2)}
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 6 }}>
        Total Expences: ${spentThisMonth.toFixed(2)}
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: summary.status.color,
          fontWeight: summary.usedPercent > 100 ? "bold" : "normal",
        }}
      >
        Status: {summary.status.text}
      </Text>

      {summary.recoveryDays > 0 && (
        <Text
          style={{
            fontSize: 16,
            marginBottom: 6,
            color: "#000",
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
          marginTop: 10,
          marginBottom: 10,
        }}
      >
        <View
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
      <Text style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>
        Month passed: {summary.monthPassedPercent.toFixed(0)}% | Money used:{" "}
        {summary.progressPercent.toFixed(0)}%
      </Text>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 16, marginBottom: 6 }}>
          Yearly Spending: ${spentThisYear.toFixed(2)}
        </Text>
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
            style={{
              height: "100%",
              width: `${summary.yearlyProgressPercent}%`,
              backgroundColor: summary.yearlyStatus.color,
            }}
          />
        </View>

        <Text
          style={{
            fontSize: 16,
            color: summary.yearlyStatus.color,
            fontWeight: summary.yearlyUsedPercent > 100 ? "bold" : "normal",
          }}
        >
          Yearly Status: {summary.yearlyStatus.text}
        </Text>
      </View>
    </View>
  );
}
