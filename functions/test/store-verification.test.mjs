import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  SignedDataVerifier,
  Environment,
} from "@apple/app-store-server-library";
import {
  createStoreVerifier,
  googleSnapshot,
  productMapping,
  verifyGooglePush,
  BUNDLE_ID,
} from "../src/store-verification.mjs";
const now = Date.UTC(2026, 10, 22),
  bindingId = "4d63dd16-393f-48d7-aefa-b629c87b5a1e";
const config = {
  googleEnabled: true,
  products: [
    {
      store: "google",
      productId: "dailybudget-premium",
      basePlanId: "monthly",
      plan: "premium",
      interval: "monthly",
    },
  ],
};
const data = {
  subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
  externalAccountIdentifiers: { obfuscatedExternalAccountId: bindingId },
  acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
  lineItems: [
    {
      productId: "dailybudget-premium",
      expiryTime: new Date(now + 86400000).toISOString(),
      offerDetails: { basePlanId: "monthly" },
      autoRenewingPlan: { autoRenewEnabled: true },
      offerPhase: { freeTrial: {} },
    },
  ],
};
test("Google adapter verifies against the fixed publisher API and acknowledges only after a confirmed purchase", async () => {
  const calls = [];
  const adapter = createStoreVerifier({
    getConfig: async () => config,
    clock: () => now,
    googleRequest: async (options) => {
      calls.push(options);
      return { data };
    },
  });
  const token = "opaque-token-not-a-url/with+characters";
  const result = await adapter.verifyGoogle(token);
  assert.equal(result.plan, "premium");
  assert.equal(result.bindingId, bindingId);
  assert.equal(result.trial, true);
  assert.equal(result.active, true);
  assert.equal(
    calls[0].url,
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${BUNDLE_ID}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,
  );
  await adapter.acknowledgeGoogle(token, result);
  assert.equal(calls[1].method, "POST");
  assert.ok(calls[1].url.endsWith(encodeURIComponent(token) + ":acknowledge"));
});
test("pending/unbound/unmapped Google purchases cannot grant a plan; cancellation respects the paid expiry", () => {
  assert.throws(
    () =>
      googleSnapshot(
        { ...data, subscriptionState: "SUBSCRIPTION_STATE_PENDING" },
        config,
        now,
      ),
    /not completed/,
  );
  assert.throws(
    () =>
      googleSnapshot({ ...data, externalAccountIdentifiers: {} }, config, now),
    /not linked/,
  );
  assert.throws(
    () => productMapping(config, "google", "forged-product", "monthly"),
    /not been configured/,
  );
  const cancelled = googleSnapshot(
    {
      ...data,
      subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
      lineItems: [
        { ...data.lineItems[0], autoRenewingPlan: { autoRenewEnabled: false } },
      ],
    },
    config,
    now,
  );
  assert.equal(cancelled.active, true);
  assert.equal(cancelled.willRenew, false);
  assert.equal(googleSnapshot(data, config, now + 2 * 86400000).active, false);
});
test("provider errors never reveal tokens, secret keys, raw metadata or diagnostic bodies", async () => {
  const adapter = createStoreVerifier({
    getConfig: async () => config,
    googleRequest: async () => {
      throw new Error(
        "secret-credential purchase-token private-provider-response",
      );
    },
  });
  await assert.rejects(
    adapter.verifyGoogle("private-purchase-token"),
    (e) =>
      e.status === 503 &&
      !e.message.includes("secret-credential") &&
      !e.message.includes("private-purchase-token"),
  );
});
test("disabled store configuration makes no publisher request", async () => {
  const adapter = createStoreVerifier({
    getConfig: async () => ({}),
    googleRequest: async () => assert.fail("must not contact store"),
  });
  await assert.rejects(
    adapter.verifyGoogle("private-purchase-token"),
    (e) => e.code === "billing-not-configured",
  );
});
test("Apple's actual certificate verifier rejects a forged transaction and notification", async () => {
  const roots = ["AppleRootCA-G2.cer", "AppleRootCA-G3.cer"].map((name) =>
    readFileSync(new URL(`../certs/${name}`, import.meta.url)),
  );
  const verifier = new SignedDataVerifier(
    roots,
    false,
    Environment.PRODUCTION,
    BUNDLE_ID,
    1234567890,
  );
  await assert.rejects(
    verifier.verifyAndDecodeTransaction(
      "e30.eyJwcm9kdWN0SWQiOiJwcmVtaXVtX3BybyJ9.Zm9yZ2Vk",
    ),
  );
  await assert.rejects(
    verifier.verifyAndDecodeNotification("e30.e30.Zm9yZ2Vk"),
  );
});
test("Google notification authentication rejects missing or malformed identity before reading purchase data", async () => {
  await assert.rejects(verifyGooglePush("", {}), (e) => e.status === 401);
  await assert.rejects(
    verifyGooglePush("Bearer forged", {}),
    (e) => e.status === 401,
  );
});
test("forged Apple notifications are rejected without accessing the signing-key secret", async () => {
  const adapter = createStoreVerifier({
    getConfig: async () => ({ appleEnabled: true, appleAppId: 1234567890 }),
    loadAppleKey: async () =>
      assert.fail("Unverified notifications must not access secrets"),
  });
  await assert.rejects(
    adapter.appleNotification("e30.e30.Zm9yZ2Vk"),
    (e) => e.status === 401,
  );
});
