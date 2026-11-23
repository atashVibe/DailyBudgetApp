import { GoogleAuth, OAuth2Client } from "google-auth-library";
import {
  AppStoreServerAPIClient,
  SignedDataVerifier,
  Environment,
} from "@apple/app-store-server-library";
import { readFileSync } from "node:fs";
import { ReceiptError } from "./policy.mjs";
import { PAID_PLANS } from "./plans.mjs";

export const BUNDLE_ID = "com.atashvibe.dailybudget";
const time = (value) =>
  Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
export function productMapping(config, store, productId, basePlanId) {
  const matches = (config.products || []).filter(
    (p) =>
      p.store === store &&
      p.productId === productId &&
      (store !== "google" || p.basePlanId === basePlanId) &&
      PAID_PLANS.includes(p.plan) &&
      ["monthly", "yearly"].includes(p.interval),
  );
  if (matches.length !== 1)
    throw new ReceiptError(
      409,
      "This store product has not been configured for DailyBudget.",
      "product-not-configured",
    );
  return matches[0];
}
export function googleSnapshot(data, config, now) {
  const validStates = [
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_CANCELED",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  ];
  const items = (data.lineItems || [])
    .filter((i) => time(i.expiryTime))
    .sort((a, b) => time(b.expiryTime) - time(a.expiryTime));
  if (!items.length || data.subscriptionState === "SUBSCRIPTION_STATE_PENDING")
    throw new ReceiptError(
      409,
      "The store has not completed this subscription purchase.",
      "purchase-pending",
    );
  const item = items[0];
  const product = productMapping(
    config,
    "google",
    item.productId,
    item.offerDetails?.basePlanId,
  );
  const bindingId =
    data.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (!/^[a-f0-9-]{36}$/i.test(bindingId || ""))
    throw new ReceiptError(
      409,
      "This purchase is not linked to a DailyBudget family.",
      "purchase-not-bound",
    );
  return {
    ...product,
    bindingId,
    paidThrough: time(item.expiryTime),
    active:
      validStates.includes(data.subscriptionState) &&
      time(item.expiryTime) > now,
    willRenew: item.autoRenewingPlan?.autoRenewEnabled === true,
    trial: Boolean(item.offerPhase?.freeTrial),
    sandbox: Boolean(data.testPurchase),
    acknowledged:
      data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    linkedToken: data.linkedPurchaseToken || null,
    checkedAt: now,
    // Store-provided recurring price is for monitoring, never a receipt/client claim.
    recurringPrice: item.autoRenewingPlan?.recurringPrice || null,
  };
}

// No purchase is trusted until a fixed Google/Apple server endpoint verifies it.
// Provider errors/tokens/keys never leave this adapter.
export function createStoreVerifier({
  getConfig,
  clock = Date.now,
  googleRequest,
  appleFactory,
  loadAppleKey,
} = {}) {
  const google = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const request =
    googleRequest ||
    (async (options) => (await google.getClient()).request(options));
  async function verifyGoogle(token) {
    const config = await getConfig();
    if (!config.googleEnabled)
      throw new ReceiptError(
        503,
        "Google Play billing is not configured yet.",
        "billing-not-configured",
      );
    if (typeof token !== "string" || token.length < 10 || token.length > 4096)
      throw new ReceiptError(400, "Invalid store purchase.");
    try {
      const { data } = await request({
        url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${BUNDLE_ID}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,
        method: "GET",
        timeout: 15000,
        retry: false,
      });
      return googleSnapshot(data, config, clock());
    } catch (error) {
      if (error instanceof ReceiptError) throw error;
      throw new ReceiptError(
        503,
        "Google Play could not verify this purchase. No new access was granted. Retry verification.",
        "store-verification-unavailable",
      );
    }
  }
  async function acknowledgeGoogle(token, snapshot) {
    if (snapshot.acknowledged || !snapshot.active) return;
    try {
      await request({
        url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${BUNDLE_ID}/purchases/subscriptions/${encodeURIComponent(snapshot.productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,
        method: "POST",
        data: {},
        timeout: 15000,
        retry: false,
      });
    } catch {
      throw new ReceiptError(
        503,
        "Google Play confirmation is pending. Retry verification; do not buy again.",
        "acknowledgement-pending",
      );
    }
  }
  function appleVerifier(config, sandbox) {
    const roots = ["AppleRootCA-G2.cer", "AppleRootCA-G3.cer"].map((name) =>
      readFileSync(new URL(`../certs/${name}`, import.meta.url)),
    );
    return new SignedDataVerifier(
      roots,
      true,
      sandbox ? Environment.SANDBOX : Environment.PRODUCTION,
      BUNDLE_ID,
      config.appleAppId,
    );
  }
  async function apple(config, sandbox) {
    if (
      !config.appleEnabled ||
      !config.appleKeyId ||
      !config.appleIssuerId ||
      !Number.isSafeInteger(config.appleAppId)
    )
      throw new ReceiptError(
        503,
        "Apple billing is not configured yet.",
        "billing-not-configured",
      );
    if (appleFactory) return appleFactory(config, sandbox);
    const environment = sandbox ? Environment.SANDBOX : Environment.PRODUCTION;
    const key = await loadAppleKey();
    return {
      client: new AppStoreServerAPIClient(
        key,
        config.appleKeyId,
        config.appleIssuerId,
        BUNDLE_ID,
        environment,
      ),
      verifier: appleVerifier(config, sandbox),
    };
  }
  async function verifyApple(transactionId, sandbox = false) {
    if (!/^\d{5,40}$/.test(transactionId || ""))
      throw new ReceiptError(400, "Invalid Apple transaction.");
    const config = await getConfig();
    try {
      const { client, verifier } = await apple(config, sandbox);
      const initial = await client.getTransactionInfo(transactionId);
      const proof = await verifier.verifyAndDecodeTransaction(
        initial.signedTransactionInfo,
      );
      const statuses = await client.getAllSubscriptionStatuses(
        proof.originalTransactionId,
      );
      const records = [];
      for (const group of statuses.data || [])
        for (const record of group.lastTransactions || []) {
          const tx = await verifier.verifyAndDecodeTransaction(
            record.signedTransactionInfo,
          );
          if (tx.originalTransactionId !== proof.originalTransactionId)
            continue;
          const renewal = record.signedRenewalInfo
            ? await verifier.verifyAndDecodeRenewalInfo(
                record.signedRenewalInfo,
              )
            : {};
          records.push({ record, tx, renewal });
        }
      records.sort((a, b) => (b.tx.expiresDate || 0) - (a.tx.expiresDate || 0));
      if (!records.length)
        throw new ReceiptError(
          409,
          "Apple has not confirmed an auto-renewing subscription.",
        );
      const { record, tx, renewal } = records[0];
      if (
        tx.bundleId !== BUNDLE_ID ||
        tx.inAppOwnershipType === "FAMILY_SHARED" ||
        !/^[a-f0-9-]{36}$/i.test(tx.appAccountToken || "")
      )
        throw new ReceiptError(
          409,
          "This Apple purchase is not linked to this DailyBudget family.",
          "purchase-not-bound",
        );
      return {
        ...productMapping(config, "apple", tx.productId),
        bindingId: tx.appAccountToken,
        paidThrough: tx.revocationDate || tx.expiresDate,
        active:
          [1, 4].includes(record.status) &&
          !tx.revocationDate &&
          tx.expiresDate > clock(),
        willRenew: renewal.autoRenewStatus === 1,
        trial: tx.offerDiscountType === "FREE_TRIAL",
        sandbox,
        originalTransactionId: tx.originalTransactionId,
        checkedAt: clock(),
        acknowledged: true,
        recurringPrice: null,
      };
    } catch (error) {
      if (error instanceof ReceiptError) throw error;
      throw new ReceiptError(
        503,
        "Apple could not verify this purchase. No new access was granted. Retry verification.",
        "store-verification-unavailable",
      );
    }
  }
  async function appleNotification(signedPayload) {
    const config = await getConfig();
    // Try only explicitly configured environments. Sandbox proofs are later
    // restricted to the server's named test-account allowlist.
    for (const sandbox of config.sandboxTesterUids?.length
      ? [false, true]
      : [false]) {
      try {
        if (!config.appleEnabled || !Number.isSafeInteger(config.appleAppId))
          throw new Error("Apple notifications not configured");
        const verifier = appleVerifier(config, sandbox);
        const event = await verifier.verifyAndDecodeNotification(signedPayload);
        if (event.notificationType === "TEST") return null;
        const tx = await verifier.verifyAndDecodeTransaction(
          event.data.signedTransactionInfo,
        );
        return { transactionId: tx.transactionId, sandbox };
      } catch {
        /* Do not expose signed payloads or certificate diagnostics. */
      }
    }
    throw new ReceiptError(401, "Invalid Apple notification.");
  }
  return { verifyGoogle, acknowledgeGoogle, verifyApple, appleNotification };
}

export async function verifyGooglePush(authorization, config) {
  const match = /^Bearer (\S+)$/.exec(authorization || "");
  if (!match || !config.googlePushAudience || !config.googlePushServiceAccount)
    throw new ReceiptError(401, "Invalid Google notification.");
  try {
    const ticket = await new OAuth2Client().verifyIdToken({
      idToken: match[1],
      audience: config.googlePushAudience,
    });
    const p = ticket.getPayload();
    if (
      p.email_verified !== true ||
      p.email !== config.googlePushServiceAccount ||
      !["https://accounts.google.com", "accounts.google.com"].includes(p.iss)
    )
      throw new Error();
  } catch {
    throw new ReceiptError(401, "Invalid Google notification.");
  }
}
