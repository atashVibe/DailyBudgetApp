export type ReportEntry = {
  amount: number;
  type: "expense" | "income" | "refund" | "cashback";
  date?: string;
};

export const calculateMonthlyTotal = (
  entries: ReportEntry[],
  year: number,
  month: number,
) => {
  let totalCents = 0;

  entries.forEach((entry) => {
    if (!entry.date) return;

    const entryDate = new Date(entry.date + "T00:00:00");

    const isTargetMonth =
      entryDate.getFullYear() === year && entryDate.getMonth() === month;

    if (!isTargetMonth) return;

    totalCents += Math.round(calculateEntryImpact(entry) * 100);
  });

  return totalCents / 100;
};

export const calculateYearlyTotal = (entries: ReportEntry[], year: number) => {
  let totalCents = 0;

  entries.forEach((entry) => {
    if (!entry.date) return;

    const entryDate = new Date(entry.date + "T00:00:00");

    if (entryDate.getFullYear() !== year) return;

    totalCents += Math.round(calculateEntryImpact(entry) * 100);
  });

  return totalCents / 100;
};

export const calculateEntryImpact = (entry: ReportEntry) => {
  switch (entry.type) {
    case "expense":
      return entry.amount;

    case "refund":
      return -entry.amount;

    case "cashback":
    case "income":
      return 0;

    default:
      return 0;
  }
};
