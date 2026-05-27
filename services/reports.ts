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
  let total = 0;

  entries.forEach((entry) => {
    if (!entry.date) return;

    const entryDate = new Date(entry.date + "T00:00:00");

    const isTargetMonth =
      entryDate.getFullYear() === year && entryDate.getMonth() === month;

    if (!isTargetMonth) return;

    total += calculateEntryImpact(entry);
  });

  return total;
};

export const calculateYearlyTotal = (entries: ReportEntry[], year: number) => {
  let total = 0;

  entries.forEach((entry) => {
    if (!entry.date) return;

    const entryDate = new Date(entry.date + "T00:00:00");

    if (entryDate.getFullYear() !== year) return;

    total += calculateEntryImpact(entry);
  });

  return total;
};

export const calculateEntryImpact = (entry: ReportEntry) => {
  switch (entry.type) {
    case "expense":
      return entry.amount;

    case "refund":
    case "cashback":
    case "income":
      return -entry.amount;

    default:
      return 0;
  }
};
