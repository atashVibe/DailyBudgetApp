import assert from "node:assert/strict";
import { test, before, beforeEach, after } from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { initializeApp as clientApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";
import { readFile } from "node:fs/promises";
import { createReceiptService } from "../functions/src/service.mjs";
import { createSubscriptionService } from "../functions/src/subscriptions.mjs";
import { createStoreVerifier } from "../functions/src/store-verification.mjs";
import { createReceiptApi } from "../functions/src/api.mjs";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp } = require("firebase-admin/app"),
  { getFirestore, Timestamp } = require("firebase-admin/firestore"),
  { getAuth: adminAuth } = require("firebase-admin/auth"),
  { getStorage } = require("firebase-admin/storage"),
  sharp = require("sharp"),
  { unzipSync } = require("fflate");
const projectId = "demo-dailybudget-receipts",
  DAY = 86400000;
let db,
  bucket,
  receipts,
  subscriptions,
  users,
  env,
  server,
  base,
  now,
  proofs,
  png,
  client,
  backendAuth;
before(async () => {
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  for (const name of [
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_AUTH_EMULATOR_HOST",
    "STORAGE_EMULATOR_HOST",
  ])
    assert.match(
      process.env[name] || "",
      /^(http:\/\/)?(localhost|127\.0\.0\.1):\d+$/,
    );
  const app = initializeApp(
    { projectId, storageBucket: `${projectId}.appspot.com` },
    "subscription-test",
  );
  db = getFirestore(app);
  bucket = getStorage(app).bucket();
  users = [];
  const auth = adminAuth(app);
  backendAuth = auth;
  for (const name of ["owner", "member", "outsider"]) {
    const u = await auth.createUser({
      email: `subscription-${name}@example.test`,
      password: "EmulatorOnly123!",
      emailVerified: true,
    });
    users.push(u);
  }
  receipts = createReceiptService({
    db,
    bucket,
    auth,
    clock: () => now,
    deleteObject: async (file) => {
      await bucket.file(file.storagePath).delete({ ignoreNotFound: true });
      return { permanent: true };
    },
  });
  const verifier = createStoreVerifier({
    getConfig: async () =>
      (await db.doc("receiptConfig/subscriptions").get()).data(),
    clock: () => now,
    googleRequest: async (options) => {
      if (options.method === "POST") return { data: {} };
      const token = decodeURIComponent(options.url.split("/tokens/")[1]);
      if (!proofs.has(token))
        throw new Error("Invalid store proof; must never be exposed");
      return { data: proofs.get(token) };
    },
  });
  subscriptions = createSubscriptionService({
    db,
    receipts,
    verifier,
    clock: () => now,
  });
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(
        new URL("../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
  client = clientApp(
    { projectId, apiKey: "demo-only-key" },
    "subscription-client",
  );
  const ca = getAuth(client);
  connectAuthEmulator(ca, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {
    disableWarnings: true,
  });
  await signInWithEmailAndPassword(ca, users[0].email, "EmulatorOnly123!");
  users[0].token = await ca.currentUser.getIdToken();
  server = createReceiptApi(receipts, auth, subscriptions).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
});
beforeEach(async () => {
  now = Date.UTC(2026, 10, 22);
  proofs = new Map();
  await env.clearFirestore();
  const batch = db.batch();
  for (let i = 0; i < users.length; i++) {
    const familyId = i === 2 ? "subscription-other" : "subscription-family";
    batch.set(db.doc(`users/${users[i].uid}`), {
      activeFamilyId: familyId,
      email: users[i].email,
    });
    batch.set(db.doc(`familyMembers/${familyId}_${users[i].uid}`), {
      familyId,
      userId: users[i].uid,
      status: "active",
      role: i === 1 ? "member" : "admin",
      email: users[i].email,
    });
  }
  for (const familyId of ["subscription-family", "subscription-other"])
    batch.set(db.doc(`families/${familyId}`), {
      status: "active",
      name: familyId,
    });
  for (let i = 0; i < 4; i++)
    batch.set(db.doc(`entries/sub-entry-${i}`), {
      familyId: "subscription-family",
      userId: users[0].uid,
      type: "expense",
      amount: 10,
      date: "2026-11-22",
    });
  batch.set(db.doc("receiptConfig/subscriptions"), {
    purchasesEnabled: true,
    googleEnabled: true,
    products: ["premium", "premium_plus", "premium_pro"].map((plan) => ({
      store: "google",
      productId: plan,
      basePlanId: "monthly",
      plan,
      interval: "monthly",
    })),
  });
  await batch.commit();
});
after(async () => {
  await env?.cleanup();
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  if (client) await deleteApp(client);
});
async function paid(plan = "premium", options = {}) {
  const binding = await subscriptions.prepare(users[0].uid, "google"),
    token = options.token || randomUUID();
  proofs.set(token, {
    subscriptionState: options.state || "SUBSCRIPTION_STATE_ACTIVE",
    externalAccountIdentifiers: {
      obfuscatedExternalAccountId: binding.bindingId,
    },
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    ...(options.linkedToken
      ? { linkedPurchaseToken: options.linkedToken }
      : {}),
    ...(options.sandbox ? { testPurchase: {} } : {}),
    lineItems: [
      {
        productId: plan,
        offerDetails: { basePlanId: "monthly" },
        expiryTime: new Date(
          options.paidThrough || now + 30 * DAY,
        ).toISOString(),
        autoRenewingPlan: { autoRenewEnabled: options.willRenew !== false },
        ...(options.trial ? { offerPhase: { freeTrial: {} } } : {}),
      },
    ],
  });
  await subscriptions.verify({ store: "google", token }, users[0].uid);
  return token;
}
async function upload(entry = 0) {
  return receipts.upload(users[0].uid, {
    transactionId: `sub-entry-${entry}`,
    requestId: randomUUID(),
    originalFilename: `receipt-${entry}.png`,
    mimeType: "image/png",
    bytes: png,
  });
}
test("free plan proposals and disabled checkout never write a paid entitlement", async () => {
  await db
    .doc("receiptConfig/subscriptions")
    .set({ purchasesEnabled: false }, { merge: true });
  const result = await subscriptions.overview(users[0].uid);
  assert.equal(result.catalog.plans[3].storageBytes, 20e9);
  assert.equal(result.availability.google, false);
  await assert.rejects(
    subscriptions.prepare(users[0].uid, "google"),
    (e) => e.code === "billing-not-configured",
  );
  assert.equal(
    (await db.doc("familySubscriptions/subscription-family").get()).exists,
    false,
  );
  assert.equal((await receipts.getAccess(users[0].uid)).canUpload, false);
});
test("only a current family admin can prepare billing; another payer/family cannot steal it", async () => {
  await assert.rejects(
    subscriptions.prepare(users[1].uid, "google"),
    (e) => e.status === 403,
  );
  const binding = await subscriptions.prepare(users[0].uid, "google");
  assert.match(binding.bindingId, /^[a-f0-9-]{36}$/);
  await db
    .doc(`familyMembers/subscription-family_${users[1].uid}`)
    .update({ role: "admin" });
  await assert.rejects(
    subscriptions.prepare(users[1].uid, "google"),
    (e) => e.code === "different-payer",
  );
  await db
    .doc(`users/${users[0].uid}`)
    .update({ activeFamilyId: "subscription-other" });
  await db
    .doc(`familyMembers/subscription-other_${users[0].uid}`)
    .set({
      familyId: "subscription-other",
      userId: users[0].uid,
      role: "admin",
      status: "active",
    });
  await assert.rejects(
    subscriptions.prepare(users[0].uid, "google"),
    (e) => e.code === "payer-bound",
  );
});
test("verified real-format store response grants one shared family allowance; retries do not duplicate usage", async () => {
  const token = await paid();
  await upload();
  await subscriptions.verify(
    {
      store: "google",
      token,
      plan: "premium_pro",
      paidThrough: now + 999 * DAY,
    },
    users[0].uid,
  );
  assert.equal(
    (await receipts.getAccess(users[1].uid)).limits.maxStorageBytes,
    2e9,
  );
  assert.equal((await receipts.getUsage(users[0].uid)).liveBytes, png.length);
  assert.equal((await db.collection("subscriptionProofs").get()).size, 1);
  await assert.rejects(
    receipts.readFile(
      users[2].uid,
      (await receipts.list(users[0].uid))[0].receiptId,
    ),
    (e) => e.status === 403,
  );
});
test("forged tokens and mismatched account bindings grant no access", async () => {
  await subscriptions.prepare(users[0].uid, "google");
  await assert.rejects(
    subscriptions.verify(
      { store: "google", token: "forged-purchase-token" },
      users[0].uid,
    ),
  );
  proofs.set("foreign-store-token", {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    externalAccountIdentifiers: { obfuscatedExternalAccountId: randomUUID() },
    lineItems: [
      {
        productId: "premium_pro",
        expiryTime: new Date(now + DAY).toISOString(),
        offerDetails: { basePlanId: "monthly" },
      },
    ],
  });
  await assert.rejects(
    subscriptions.verify(
      { store: "google", token: "foreign-store-token" },
      users[0].uid,
    ),
    (e) => e.code === "purchase-not-bound",
  );
  assert.equal((await receipts.getAccess(users[0].uid)).canUpload, false);
});
test("sandbox purchases are rejected except for an explicitly named test account", async () => {
  await assert.rejects(
    paid("premium", { sandbox: true }),
    (e) => e.code === "sandbox-denied",
  );
  assert.equal((await receipts.getAccess(users[0].uid)).canUpload, false);
  await db
    .doc("receiptConfig/subscriptions")
    .set({ sandboxTesterUids: [users[0].uid] }, { merge: true });
  await paid("premium", { sandbox: true });
  assert.equal((await receipts.getAccess(users[1].uid)).canUpload, true);
});
test("cancellation keeps paid uploads through expiry and then exactly 30 days of downloads", async () => {
  await paid("premium_plus", { willRenew: false, paidThrough: now + DAY });
  const end = now + DAY;
  await upload();
  assert.equal((await receipts.getAccess(users[1].uid)).canUpload, true);
  now = end;
  const expired = await receipts.getAccess(users[1].uid);
  assert.equal(expired.canUpload, false);
  assert.equal(expired.canRead, true);
  assert.equal(expired.deletionScheduledAt, end + 30 * DAY);
  now = end + 30 * DAY;
  assert.equal((await receipts.getAccess(users[1].uid)).canRead, false);
});
test("refund or hold revokes uploads without extending the download deadline on repeated checks", async () => {
  const token = await paid();
  proofs.get(token).subscriptionState = "SUBSCRIPTION_STATE_ON_HOLD";
  await subscriptions.verify({ store: "google", token }, users[0].uid);
  const deadline = (await receipts.getAccess(users[0].uid)).deletionScheduledAt;
  now += DAY;
  await subscriptions.verify({ store: "google", token }, users[0].uid);
  assert.equal(
    (await receipts.getAccess(users[0].uid)).deletionScheduledAt,
    deadline,
  );
  assert.equal((await receipts.getAccess(users[0].uid)).canUpload, false);
});
test("upgrade/downgrade quotas follow verified products; old tokens cannot overwrite a replacement", async () => {
  const old = await paid("premium_pro");
  const lower = await paid("premium", { linkedToken: old });
  const p = await receipts.getAccess(users[1].uid);
  assert.equal(p.limits.maxStorageBytes, 2e9);
  assert.equal(p.canRead, true);
  assert.equal(p.canUpload, false);
  assert.equal(p.downgradeDownloadUntil, now + 30 * DAY);
  await assert.rejects(
    subscriptions.verify({ store: "google", token: old }, users[0].uid),
    (e) => e.code === "purchase-replaced",
  );
  now += DAY;
  await subscriptions.verify({ store: "google", token: lower }, users[0].uid);
  assert.equal(
    (await receipts.getAccess(users[0].uid)).downgradeDownloadUntil,
    p.downgradeDownloadUntil,
  );
  await paid("premium_plus", { linkedToken: lower });
  assert.equal((await receipts.getAccess(users[1].uid)).canUpload, true);
});
test("an unlinked second active purchase is not accepted as a new family subscription", async () => {
  await paid();
  await assert.rejects(
    paid("premium_pro"),
    (e) => e.code === "duplicate-subscription",
  );
  assert.equal((await receipts.getAccess(users[0].uid)).plan, "premium");
});
test("quota uses stored bytes and pending copies; client counter changes are denied", async () => {
  await paid("premium_plus");
  await db
    .doc("receipts/almost-full")
    .set({
      familyId: "subscription-family",
      status: "ready",
      fileSize: 5e9 - png.length + 1,
      receiptId: "almost-full",
    });
  await assert.rejects(upload(), (e) => e.code === "storage-quota-exceeded");
  assert.equal((await receipts.getUsage(users[0].uid)).receiptCount, 1);
  const user = env
    .authenticatedContext(users[0].uid, {
      email: users[0].email,
      email_verified: true,
    })
    .firestore();
  for (const collection of [
    "receiptFamilyAccess",
    "receiptConfig",
    "familySubscriptions",
    "subscriptionProofs",
    "subscriptionBindings",
    "subscriptionPayers",
    "subscriptionAudit",
  ]) {
    await assertFails(
      setDoc(doc(user, collection, "attempt"), {
        plan: "premium_pro",
        liveBytes: 0,
      }),
    );
    if (collection !== "receiptFamilyAccess")
      await assertFails(getDoc(doc(user, collection, "attempt")));
  }
});
test("downgrade lets the admin export chosen extras, preserve newest/oldest, and blocks uploads after cleanup", async () => {
  const high = await paid("premium_pro");
  for (let i = 0; i < 3; i++) {
    now += 1000;
    await upload(i);
  }
  await db
    .doc("receiptConfig/subscriptions")
    .set(
      { plans: { premium: { storageBytes: 2 * png.length } } },
      { merge: true },
    );
  await paid("premium", { linkedToken: high });
  const newest = await receipts.downgradeReview(users[0].uid, "newest"),
    oldest = await receipts.downgradeReview(users[0].uid, "oldest");
  assert.equal(newest.keep.length, 2);
  assert.equal(newest.extras.length, 1);
  assert.notEqual(newest.extras[0].receiptId, oldest.extras[0].receiptId);
  await assert.rejects(
    receipts.downgradeReview(users[1].uid, "newest"),
    (e) => e.status === 403,
  );
  const zip = await fetch(
    `${base}/export?keep=newest&review=${newest.fingerprint}&part=0`,
    { headers: { Authorization: `Bearer ${users[0].token}` } },
  );
  assert.equal(zip.status, 200);
  const archive = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  assert.deepEqual(
    Buffer.from(
      archive[Object.keys(archive).find((name) => name.endsWith(".png"))],
    ),
    png,
  );
  await assert.rejects(
    receipts.removeDowngradeExtras(users[0].uid, {
      preference: "newest",
      fingerprint: newest.fingerprint,
      downloadConfirmed: false,
    }),
    (e) => e.status === 400,
  );
  await receipts.removeDowngradeExtras(users[0].uid, {
    preference: "newest",
    fingerprint: newest.fingerprint,
    downloadConfirmed: true,
  });
  assert.equal((await receipts.list(users[0].uid)).length, 2);
  assert.equal((await db.collection("entries").get()).size, 4);
  assert.equal((await receipts.getAccess(users[0].uid)).canUpload, false);
});
test("changed review cannot delete a different set of receipts", async () => {
  const high = await paid("premium_pro");
  await upload();
  await db
    .doc("receiptConfig/subscriptions")
    .set({ plans: { premium: { storageBytes: 1 } } }, { merge: true });
  await paid("premium", { linkedToken: high });
  const review = await receipts.downgradeReview(users[0].uid, "newest");
  await db
    .doc(`receipts/${review.extras[0].receiptId}`)
    .update({ updatedAt: Timestamp.fromMillis(now + 1) });
  await assert.rejects(
    receipts.removeDowngradeExtras(users[0].uid, {
      preference: "newest",
      fingerprint: review.fingerprint,
      downloadConfirmed: true,
    }),
    (e) => e.code === "review-changed",
  );
  assert.equal((await receipts.list(users[0].uid)).length, 1);
});
test("manual operator grants cannot overwrite store billing; ordinary users cannot see subscriber/revenue monitoring", async () => {
  await paid();
  await assert.rejects(
    receipts.adminStats(users[1].uid),
    (e) => e.status === 403,
  );
  await db.doc(`receiptAccess/${users[0].uid}`).set({ administrator: true });
  await assert.rejects(
    receipts.setAccess(users[0].uid, "subscription-family", "cancel"),
    (e) => e.status === 409,
  );
  const stats = await receipts.adminStats(users[0].uid);
  assert.equal(stats.verifiedSubscribers.premium, 1);
  assert.equal(stats.monthlySubscriptionRevenueUSD, null);
  assert.ok(stats.perFamily.some((f) => f.familyId === "subscription-family"));
});
test("family members can request a trusted store refresh but cannot bypass its cooldown", async () => {
  const token = await paid();
  proofs.get(token).lineItems[0].autoRenewingPlan.autoRenewEnabled = false;
  const updated = await subscriptions.refresh(users[1].uid);
  assert.equal(updated.access.willRenew, false);
  await assert.rejects(
    subscriptions.refresh(users[0].uid),
    (e) => e.status === 429,
  );
});
test("a quota reduction during object saving is rechecked before publishing the receipt", async () => {
  await paid();
  const wrapped = {
    getMetadata: bucket.getMetadata.bind(bucket),
    file: (path) => {
      const file = bucket.file(path),
        save = file.save.bind(file);
      file.save = async (...args) => {
        await save(...args);
        await db
          .doc("receiptConfig/subscriptions")
          .set({ plans: { premium: { storageBytes: 1 } } }, { merge: true });
      };
      return file;
    },
  };
  const guarded = createReceiptService({
    db,
    bucket: wrapped,
    auth: backendAuth,
    clock: () => now,
  });
  await assert.rejects(
    guarded.upload(users[0].uid, {
      transactionId: "sub-entry-0",
      requestId: randomUUID(),
      originalFilename: "race.png",
      mimeType: "image/png",
      bytes: png,
    }),
    (e) => e.code === "storage-quota-exceeded",
  );
  assert.equal((await receipts.list(users[0].uid)).length, 0);
});
