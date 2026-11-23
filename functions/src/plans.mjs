// Private Firestore configuration is the source of proposals/quotas. Store
// checkout always displays the store's actual localized price and eligibility.
export const FILE_LIMIT = 10_000_000;
export const PAID_PLANS = ["premium", "premium_plus", "premium_pro"];
const defaults = {
  free: { name: "Free", monthlyCents: 0, storageBytes: 0 },
  premium: { name: "Premium", monthlyCents: 499, storageBytes: 2_000_000_000 },
  premium_plus: {
    name: "Premium Plus",
    monthlyCents: 899,
    storageBytes: 5_000_000_000,
  },
  premium_pro: {
    name: "Premium Pro",
    monthlyCents: 1499,
    storageBytes: 20_000_000_000,
  },
};
export function planCatalog(config = {}) {
  const discount =
    Number.isSafeInteger(config.yearlyDiscountBps) &&
    config.yearlyDiscountBps >= 0 &&
    config.yearlyDiscountBps <= 9000
      ? config.yearlyDiscountBps
      : 1500;
  return {
    currency: "USD",
    yearlyDiscountBps: discount,
    plans: Object.entries(defaults).map(([id, value]) => {
      const custom = config.plans?.[id] || {};
      const monthlyCents =
        id !== "free" &&
        Number.isSafeInteger(custom.monthlyCents) &&
        custom.monthlyCents > 0 &&
        custom.monthlyCents <= 1_000_000
          ? custom.monthlyCents
          : value.monthlyCents;
      const storageBytes =
        id !== "free" &&
        Number.isSafeInteger(custom.storageBytes) &&
        custom.storageBytes > 0 &&
        custom.storageBytes <= 1_000_000_000_000
          ? custom.storageBytes
          : value.storageBytes;
      return {
        id,
        name: value.name,
        monthlyCents,
        yearlyCents: Math.round(
          (monthlyCents * 12 * (10000 - discount)) / 10000,
        ),
        storageBytes,
        maxFileBytes: id === "free" ? 0 : FILE_LIMIT,
        trialMonths: id === "premium" ? 1 : 0,
      };
    }),
  };
}
export const planName = (id) =>
  defaults[id]?.name || (id === "archive" ? "Archive" : "Free");
