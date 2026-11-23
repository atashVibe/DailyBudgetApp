// Trusted owner Cloud Shell only. Uses ADC; never put a service-account key here.
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { planCatalog, PAID_PLANS } from "../src/plans.mjs";
const [project, action, plan, price, quota] = process.argv.slice(2);
if (
  project !== "dailybudget-35c26" ||
  !["show", "init", "price"].includes(action)
)
  throw new Error(
    "Usage: node functions/scripts/subscriptions-admin.mjs dailybudget-35c26 show|init|price [premium|premium_plus|premium_pro MONTHLY_US_CENTS QUOTA_BYTES]",
  );
initializeApp({ projectId: project });
const db = getFirestore(),
  ref = db.doc("receiptConfig/subscriptions");
if (action === "init") {
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists)
      throw new Error(
        "Subscription configuration already exists. Read it first; no changes were made.",
      );
    tx.create(ref, {
      purchasesEnabled: false,
      googleEnabled: false,
      appleEnabled: false,
      yearlyDiscountBps: 1500,
      plans: Object.fromEntries(
        planCatalog()
          .plans.filter((p) => p.id !== "free")
          .map((p) => [
            p.id,
            { monthlyCents: p.monthlyCents, storageBytes: p.storageBytes },
          ]),
      ),
      products: [],
      updatedAt: Timestamp.now(),
    });
  });
  console.log(
    "Family proposals initialized. Purchases remain disabled; no plan was granted or payment taken.",
  );
} else if (action === "price") {
  const monthlyCents = Number(price),
    storageBytes = Number(quota);
  if (
    !PAID_PLANS.includes(plan) ||
    !Number.isSafeInteger(monthlyCents) ||
    monthlyCents <= 0 ||
    monthlyCents > 1e6 ||
    !Number.isSafeInteger(storageBytes) ||
    storageBytes <= 0 ||
    storageBytes > 1e12
  )
    throw new Error("Use a valid paid plan, integer cents and integer bytes.");
  await db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    tx.set(
      ref,
      {
        plans: {
          ...(current.data()?.plans || {}),
          [plan]: { monthlyCents, storageBytes },
        },
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  });
  console.log(
    "Catalog proposal/quota updated. Store prices must be changed separately in Play Console/App Store Connect. No payment was taken.",
  );
}
const config = (await ref.get()).data() || {};
console.log(
  JSON.stringify(
    {
      catalog: planCatalog(config),
      purchasesEnabled: config.purchasesEnabled === true,
      googleEnabled: config.googleEnabled === true,
      appleEnabled: config.appleEnabled === true,
      productCount: config.products?.length || 0,
    },
    null,
    2,
  ),
);
