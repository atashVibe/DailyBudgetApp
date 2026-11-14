export type BudgetStatus = {
  text: string;
  color: string;
};

export type BudgetSummary = {
  remainingToday: number;
  recoveryDays: number;
  usedPercent: number;
  progressPercent: number;
  monthPassedPercent: number;
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

  // Work in cents so a floating-point remainder cannot create a recovery day.
  const dailyBudgetCents = Math.round(dailyBudget * 100);
  const monthlySpentCents = Math.round(spentThisMonth * 100);
  const yearlySpentCents = Math.round(spentThisYear * 100);
  const allowedSoFarCents = dailyBudgetCents * dayOfMonth;
  const fullMonthAllowanceCents = totalDaysInMonth * dailyBudgetCents;
  const remainingCents = allowedSoFarCents - monthlySpentCents;
  const remainingToday = remainingCents / 100;

  const recoveryDays =
    remainingCents < 0 && dailyBudgetCents > 0
      ? Math.ceil(Math.abs(remainingCents) / dailyBudgetCents)
      : 0;

  const usedPercent =
    fullMonthAllowanceCents > 0
      ? (monthlySpentCents / fullMonthAllowanceCents) * 100
      : 0;

  const progressPercent = Math.max(0, Math.min(usedPercent, 100));

  const monthPassedPercent = (dayOfMonth / totalDaysInMonth) * 100;

  const year = today.getFullYear();
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const fullYearAllowanceCents = dailyBudgetCents * (isLeapYear ? 366 : 365);

  const yearlyUsedPercent =
    fullYearAllowanceCents > 0
      ? (yearlySpentCents / fullYearAllowanceCents) * 100
      : 0;

  const yearlyProgressPercent = Math.max(0, Math.min(yearlyUsedPercent, 100));

  return {
    remainingToday,
    recoveryDays,
    usedPercent,
    progressPercent,
    monthPassedPercent,
    status: getBudgetStatus(usedPercent),
    yearlyUsedPercent,
    yearlyProgressPercent,
    yearlyStatus: getBudgetStatus(yearlyUsedPercent),
  };
}
