export type BudgetStatus = {
  text: string;
  color: string;
};

export type BudgetSummary = {
  remainingToday: number;
  recoveryDays: number;
  usedPercent: number;
  progressPercent: number;
  status: BudgetStatus;
  yearlyUsedPercent: number;
  yearlyProgressPercent: number;
  yearlyStatus: BudgetStatus;
};

function getBudgetStatus(usedPercent: number): BudgetStatus {
  if (usedPercent > 100) {
    return { text: "Over budget", color: "#000000" };
  }

  if (usedPercent > 90) {
    return { text: "On The Border! Be careful!", color: "#C53030" };
  }

  if (usedPercent >= 61) {
    return { text: "Be careful", color: "#B7791F" };
  }

  return { text: "On track", color: "#2E7D32" };
}

export function calculateBudgetSummary(
  dailyBudget: number,
  spentThisMonth: number,
  spentThisYear: number,
  today = new Date(),
): BudgetSummary {
  const dayOfMonth = today.getDate();

  const totalDaysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();

  const allowedSoFar = dailyBudget * dayOfMonth;
  const fullMonthAllowance = totalDaysInMonth * dailyBudget;
  const remainingToday = allowedSoFar - spentThisMonth;

  const recoveryDays =
    remainingToday < 0 && dailyBudget > 0
      ? Math.ceil(Math.abs(remainingToday) / dailyBudget)
      : 0;

  const usedPercent =
    fullMonthAllowance > 0 ? (spentThisMonth / fullMonthAllowance) * 100 : 0;

  const progressPercent = Math.min(usedPercent, 100);

  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const daysPassedThisYear =
    Math.floor(
      (today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  const yearlyAllowedSoFar = daysPassedThisYear * dailyBudget;

  const yearlyUsedPercent =
    yearlyAllowedSoFar > 0 ? (spentThisYear / yearlyAllowedSoFar) * 100 : 0;

  const yearlyProgressPercent = Math.min(yearlyUsedPercent, 100);

  return {
    remainingToday,
    recoveryDays,
    usedPercent,
    progressPercent,
    status: getBudgetStatus(usedPercent),
    yearlyUsedPercent,
    yearlyProgressPercent,
    yearlyStatus: getBudgetStatus(yearlyUsedPercent),
  };
}
