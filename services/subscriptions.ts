import { auth } from "./auth";
import { receiptRequest, type ReceiptAccess, type Receipt } from "./receipts";
export type Plan = {
  id: string;
  name: string;
  monthlyCents: number;
  yearlyCents: number;
  storageBytes: number;
  maxFileBytes: number;
  trialMonths: number;
};
export type StoreProduct = {
  store: "google" | "apple";
  productId: string;
  basePlanId?: string;
  plan: string;
  interval: "monthly" | "yearly";
  trialOfferId?: string;
};
export type SubscriptionOverview = {
  catalog: { currency: string; yearlyDiscountBps: number; plans: Plan[] };
  access: ReceiptAccess;
  isFamilyAdmin: boolean;
  isPayer: boolean;
  availability: { google: boolean; apple: boolean };
  products: StoreProduct[];
  sandboxTesting?: boolean;
  currentProduct: string | null;
  currentStore: string | null;
};
export type CleanupReview = {
  preference: "newest" | "oldest";
  fingerprint: string;
  keep: Receipt[];
  extras: Receipt[];
  keptBytes: number;
  extraBytes: number;
  retainedBytes: number;
  exportParts?: string[][];
};
export async function subscriptionRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Please sign in again.");
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await receiptRequest(
      `/subscription${path}`,
      {
        signal: controller.signal,
        ...(body === undefined
          ? {}
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
      },
      uid,
    );
    if (auth.currentUser?.uid !== uid)
      throw new Error(
        "Your signed-in account changed. Reopen the family plan page.",
      );
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}
export const getSubscriptionOverview = () =>
  subscriptionRequest<SubscriptionOverview>("");
