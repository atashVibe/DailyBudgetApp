import { Text, View } from "react-native";

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
  const today = new Date();
  const dayOfMonth = today.getDate();
  const totalDaysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  const allowedSoFar = dailyBudget * dayOfMonth;
  const fullMonthAllowance = totalDaysInMonth * dailyBudget;
  const remainingToday = allowedSoFar - spentThisMonth;

  const recoveryDays =
    remainingToday < 0 && dailyBudget > 0
      ? Math.ceil(Math.abs(remainingToday) / dailyBudget)
      : 0;
  const usedPercent =
    fullMonthAllowance > 0
      ? (spentThisMonth / fullMonthAllowance) * 100
      : 0;
  const progressPercent = Math.min(usedPercent, 100);

  let statusText = "On track";
  let statusColor = "#2E7D32";

  if (usedPercent >= 61 && usedPercent <= 90) {
    statusText = "Be careful";
    statusColor = "#B7791F";
  } else if (usedPercent > 90 && usedPercent <= 100) {
    statusText = "On The Border! Be careful!";
    statusColor = "#C53030";
  } else if (usedPercent > 100) {
    statusText = "Over budget";
    statusColor = "#000000";
  }

  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const daysPassedThisYear =
    Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const yearlyAllowedSoFar = daysPassedThisYear * dailyBudget;

  const yearlyUsedPercent =
    yearlyAllowedSoFar > 0
      ? (spentThisYear / yearlyAllowedSoFar) * 100
      : 0;

  const yearlyProgressPercent = Math.min(yearlyUsedPercent, 100);

  let yearlyStatusText = "On track";
  let yearlyStatusColor = "#2E7D32";

  if (yearlyUsedPercent >= 61 && yearlyUsedPercent <= 90) {
    yearlyStatusText = "Be careful";
    yearlyStatusColor = "#B7791F";
  } else if (yearlyUsedPercent > 90 && yearlyUsedPercent <= 100) {
    yearlyStatusText = "On The Border! Be careful!";
    yearlyStatusColor = "#C53030";
  } else if (yearlyUsedPercent > 100) {
    yearlyStatusText = "Over budget";
    yearlyStatusColor = "#000000";
  }

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
        Allowance: ${remainingToday.toFixed(2)}
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 6 }}>
        Total Expences: ${spentThisMonth.toFixed(2)}
      </Text>

      {recoveryDays > 0 && (
        <Text style={{ fontSize: 16, marginBottom: 6, color: "#000", fontWeight: "700" }}>
          Recovery plan: No extra spending for {recoveryDays} day{recoveryDays === 1 ? "" : "s"}.
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
            width: `${progressPercent}%`,
            backgroundColor: statusColor,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 16,
          color: statusColor,
          fontWeight: usedPercent > 100 ? "bold" : "normal",
        }}
      >
        Status: {statusText}
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
              width: `${yearlyProgressPercent}%`,
              backgroundColor: yearlyStatusColor,
            }}
          />
        </View>

        <Text
          style={{
            fontSize: 16,
            color: yearlyStatusColor,
            fontWeight: yearlyUsedPercent > 100 ? "bold" : "normal",
          }}
        >
          Yearly Status: {yearlyStatusText}
        </Text>
      </View>

    </View>
  );
}