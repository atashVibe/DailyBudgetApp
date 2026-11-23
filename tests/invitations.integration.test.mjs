import assert from "node:assert/strict";
import { test, before, beforeEach, after } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import {
  initializeApp as clientApp,
  deleteApp as deleteClientApp,
} from "firebase/app";
import {
  getAuth as clientAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createInvitationService } from "../functions/src/invitations.mjs";
import { createInvitationsApi } from "../functions/src/invitations-api.mjs";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const projectId = "demo-dailybudget-receipts";
let app, db, auth, now, service, mail, sender, member, env, client;
const DAY = 86400000;
const payload = (email = "new-member@example.test", role = "member") => ({
  email,
  role,
  requestId: randomUUID(),
});
before(async () => {
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  assert.match(
    process.env.FIRESTORE_EMULATOR_HOST || "",
    /^(localhost|127\.0\.0\.1):8080$/,
  );
  assert.match(
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "",
    /^(localhost|127\.0\.0\.1):9099$/,
  );
  app = initializeApp({ projectId }, "invitation-integration");
  db = getFirestore(app);
  auth = getAuth(app);
  sender = await auth.createUser({
    uid: `invitation-sender-${Date.now()}`,
    email: "invitation-sender@example.test",
    emailVerified: true,
    password: "EmulatorOnly123!",
  });
  member = await auth.createUser({
    uid: `invitation-member-${Date.now()}`,
    email: "invitation-member@example.test",
    emailVerified: true,
    password: "EmulatorOnly123!",
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
    "invitation-api-auth",
  );
  connectAuthEmulator(
    clientAuth(client),
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,
    { disableWarnings: true },
  );
});
beforeEach(async () => {
  now = Date.now();
  mail = [];
  await env.clearFirestore();
  await auth.updateUser(sender.uid, { emailVerified: true, disabled: false });
  const batch = db.batch();
  batch.set(db.doc("families/invite-family"), {
    name: "Test Family",
    status: "active",
    createdBy: sender.uid,
  });
  for (const [user, role] of [
    [sender, "admin"],
    [member, "member"],
  ]) {
    batch.set(db.doc(`users/${user.uid}`), {
      activeFamilyId: "invite-family",
      role,
      email: user.email,
    });
    batch.set(db.doc(`familyMembers/invite-family_${user.uid}`), {
      familyId: "invite-family",
      userId: user.uid,
      role,
      email: user.email,
      status: "active",
    });
  }
  await batch.commit();
  service = createInvitationService({
    db,
    auth,
    clock: () => now,
    send: async (message) => {
      assert.ok(message.to.endsWith("@example.test"));
      mail.push(message);
      return { accepted: [message.to] };
    },
  });
});
after(async () => {
  await env?.cleanup();
  await deleteClientApp(client);
  await deleteApp(app);
});
test("a verified active administrator emails a code and join link without granting membership", async () => {
  const result = await service.create(
    sender.uid,
    payload(" New-Member@example.test ", "admin"),
  );
  assert.equal(result.status, "accepted");
  assert.match(result.code, /^\d{8}$/);
  assert.equal(result.expiresAt, now + 600000);
  assert.equal(mail.length, 1);
  assert.equal(mail[0].to, "new-member@example.test");
  assert.ok(mail[0].text.includes(result.code));
  assert.ok(mail[0].text.includes(result.joinUrl));
  const invites = await db.collection("invites").get();
  assert.equal(invites.size, 1);
  assert.equal(invites.docs[0].data().role, "admin");
  assert.equal(invites.docs[0].data().status, "pending");
  assert.equal((await db.collection("familyMembers").get()).size, 2);
});
test("concurrent HTTP retries claim one invitation and send one email", async () => {
  const input = payload();
  const results = await Promise.all(
    Array.from({ length: 4 }, () => service.create(sender.uid, input)),
  );
  assert.equal(mail.length, 1);
  assert.equal((await db.collection("invites").get()).size, 1);
  assert.equal(new Set(results.map((result) => result.code)).size, 1);
  assert.equal((await service.create(sender.uid, input)).status, "accepted");
  assert.equal(mail.length, 1);
  await assert.rejects(
    service.create(sender.uid, { ...input, email: "another@example.test" }),
    (error) => error.status === 409,
  );
});
test("members, disabled senders and unverified senders cannot send invitation email", async () => {
  await assert.rejects(
    service.create(member.uid, payload()),
    (error) => error.status === 403,
  );
  await auth.updateUser(sender.uid, { emailVerified: false });
  await assert.rejects(
    service.create(sender.uid, payload()),
    (error) => error.code === "verify-email",
  );
  await auth.updateUser(sender.uid, { emailVerified: true, disabled: true });
  await assert.rejects(
    service.create(sender.uid, payload()),
    (error) => error.status === 403,
  );
  assert.equal(mail.length, 0);
  assert.equal((await db.collection("invites").get()).size, 0);
});
test("header injection, multiple recipients and forged roles are rejected before email", async () => {
  for (const input of [
    payload("victim@example.test\r\nBcc:other@example.test"),
    payload("one@example.test,two@example.test"),
    payload("person@example.test", "owner"),
    { ...payload(), requestId: "not-a-request" },
  ])
    await assert.rejects(
      service.create(sender.uid, input),
      (error) => error.status === 400,
    );
  assert.equal(mail.length, 0);
});
test("recipient cooldown and hourly sender quota limit outgoing email", async () => {
  await service.create(sender.uid, payload());
  await assert.rejects(
    service.create(sender.uid, payload()),
    (error) => error.status === 429,
  );
  for (let i = 1; i < 10; i++)
    await service.create(sender.uid, payload(`member-${i}@example.test`));
  await assert.rejects(
    service.create(sender.uid, payload("eleventh@example.test")),
    (error) => error.status === 429,
  );
  assert.equal(mail.length, 10);
});
test("a global daily email ceiling applies across families and senders", async () => {
  await db
    .doc(`invitationMailLimits/global_${Math.floor(now / DAY)}`)
    .set({ count: 100, expiresAt: Timestamp.fromMillis(now + 7 * DAY) });
  await assert.rejects(
    service.create(sender.uid, payload()),
    (error) => error.status === 429,
  );
  assert.equal(mail.length, 0);
});
test("provider failures stay honest and private; uncertain outcomes are never resent by retry", async () => {
  for (const code of ["EAUTH", "ETIMEDOUT"]) {
    let calls = 0;
    const failing = createInvitationService({
      db,
      auth,
      clock: () => now,
      send: async () => {
        calls++;
        throw Object.assign(new Error("SECRET_PASSWORD_AND_PROVIDER_DETAILS"), {
          code,
        });
      },
    });
    const input = payload(`${code.toLowerCase()}@example.test`);
    const result = await failing.create(sender.uid, input);
    assert.equal(result.status, code === "EAUTH" ? "failed" : "unknown");
    assert.match(result.code, /^\d{8}$/);
    await failing.create(sender.uid, input);
    assert.equal(calls, 1);
    assert.ok(!JSON.stringify(result).includes("SECRET_PASSWORD"));
  }
  const jobs = await db.collection("invitationDeliveries").get();
  assert.ok(
    !JSON.stringify(jobs.docs.map((doc) => doc.data())).includes(
      "SECRET_PASSWORD",
    ),
  );
});
test("authorization is checked again after the invitation claim before SMTP", async () => {
  const intercepted = {
    doc: db.doc.bind(db),
    collection: db.collection.bind(db),
    runTransaction: async (work) => {
      const result = await db.runTransaction(work);
      await db
        .doc(`familyMembers/invite-family_${sender.uid}`)
        .update({ role: "member" });
      return result;
    },
  };
  const guarded = createInvitationService({
    db: intercepted,
    auth,
    clock: () => now,
    send: async (message) => {
      mail.push(message);
      return { accepted: [message.to] };
    },
  });
  await assert.rejects(
    guarded.create(sender.uid, payload()),
    (error) => error.status === 403,
  );
  assert.equal(mail.length, 0);
});
test("expired/accepted idempotency retries do not create replacement codes or resend", async () => {
  const input = payload();
  const first = await service.create(sender.uid, input);
  now += 600001;
  assert.equal((await service.create(sender.uid, input)).status, "expired");
  assert.equal(mail.length, 1);
  assert.equal((await db.collection("invites").get()).size, 1);
  now -= 600001;
  const invite = (await db.collection("invites").get()).docs[0];
  await invite.ref.update({ status: "accepted" });
  assert.equal((await service.create(sender.uid, input)).status, "used");
  assert.equal(mail.length, 1);
  assert.ok(first.code);
});
test("private delivery/rate records cannot be read or reset by clients", async () => {
  await service.create(sender.uid, payload());
  const dbClient = env
    .authenticatedContext(sender.uid, {
      email: sender.email,
      email_verified: true,
    })
    .firestore();
  const job = (await db.collection("invitationDeliveries").get()).docs[0];
  await assertFails(getDoc(doc(dbClient, "invitationDeliveries", job.id)));
  await assertFails(
    setDoc(doc(dbClient, "invitationMailLimits", "forged"), { count: 0 }),
  );
});
test("old delivery/rate metadata is cleaned up without deleting budget history or invitation records", async () => {
  await service.create(sender.uid, payload());
  await db
    .doc("entries/keep-budget")
    .set({ amount: 12, familyId: "invite-family" });
  now += 7 * DAY + 1;
  assert.ok((await service.cleanup()) > 0);
  assert.equal((await db.collection("invitationDeliveries").get()).size, 0);
  assert.equal((await db.collection("invites").get()).size, 1);
  assert.equal((await db.doc("entries/keep-budget").get()).data().amount, 12);
});
test("HTTP endpoint rejects anonymous tokens and uses the verified UID rather than body claims", async () => {
  const server = createInvitationsApi(service, auth).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(url, { method: "POST" })).status, 401);
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: { Authorization: "Bearer invalid" },
        })
      ).status,
      401,
    );
    const signed = await signInWithEmailAndPassword(
      clientAuth(client),
      member.email,
      "EmulatorOnly123!",
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await signed.user.getIdToken(true)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload(),
        uid: sender.uid,
        familyId: "another-family",
      }),
    });
    assert.equal(response.status, 403);
    assert.equal(mail.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
