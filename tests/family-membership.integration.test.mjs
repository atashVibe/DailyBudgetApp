import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, getDoc } from "firebase/firestore";
import { createFamilyMembershipService } from "../functions/src/family-membership.mjs";
import { createReceiptService } from "../functions/src/service.mjs";
import { createReceiptApi } from "../functions/src/api.mjs";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");
const sharp = require("sharp");
const projectId = "demo-dailybudget-receipts",
  familyId = "leave-family";
const prefix = `leave-${Date.now()}`;
const [owner, member, other] = ["owner", "member", "other"].map(
  (tag) => `${prefix}-${tag}`,
);
const password = "EmulatorOnly123!";
let app, db, auth, bucket, env, service;
before(async () => {
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.match(
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "",
    /^(localhost|127\.0\.0\.1):9099$/,
  );
  assert.ok(process.env.STORAGE_EMULATOR_HOST?.includes(":9199"));
  process.env.FIREBASE_STORAGE_EMULATOR_HOST =
    process.env.STORAGE_EMULATOR_HOST.replace(/^https?:\/\//, "");
  app = initializeApp(
    { projectId, storageBucket: `${projectId}.appspot.com` },
    "family-leave-tests",
  );
  db = getFirestore(app);
  auth = getAuth(app);
  bucket = getStorage(app).bucket();
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(
        new URL("../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
  service = createFamilyMembershipService({ db, auth });
});
beforeEach(async () => {
  await env.clearFirestore();
  for (const uid of [owner, member, other]) {
    try {
      await auth.getUser(uid);
      await auth.updateUser(uid, { disabled: false });
    } catch {
      await auth.createUser({
        uid,
        email: `${uid}@example.test`,
        password,
        emailVerified: true,
      });
    }
  }
  const batch = db.batch();
  batch.set(db.doc(`families/${familyId}`), {
    name: "Shared budget",
    createdBy: owner,
    status: "active",
    dailyBudget: 30,
  });
  for (const [uid, role] of [
    [owner, "admin"],
    [member, "member"],
  ]) {
    batch.set(db.doc(`users/${uid}`), {
      activeFamilyId: familyId,
      role,
      email: `${uid}@example.test`,
    });
    batch.set(db.doc(`familyMembers/${familyId}_${uid}`), {
      familyId,
      userId: uid,
      role,
      status: "active",
      email: `${uid}@example.test`,
      joinedAt: Timestamp.now(),
    });
  }
  batch.set(db.doc("entries/shared-entry"), {
    familyId,
    userId: member,
    date: "2026-11-23",
    type: "expense",
    amount: 12.5,
    note: "Keep shared history",
  });
  batch.set(db.doc(`receiptAccess/${owner}`), { administrator: true });
  await batch.commit();
});
after(async () => {
  await env?.cleanup();
  await deleteApp(app);
});
const review = (uid) => service.prepare(uid);
const addAdmin = async () => {
  await db
    .doc(`users/${other}`)
    .set({
      activeFamilyId: familyId,
      role: "admin",
      email: `${other}@example.test`,
    });
  await db
    .doc(`familyMembers/${familyId}_${other}`)
    .set({ familyId, userId: other, role: "admin", status: "active" });
};

test("leaving preserves the account, family history and original receipt; former-member reads stop", async () => {
  const receipts = createReceiptService({ db, auth, bucket });
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  const saved = await receipts.upload(member, {
    transactionId: "shared-entry",
    requestId: randomUUID(),
    originalFilename: "shared.png",
    mimeType: "image/png",
    bytes: png,
  });
  const receiptId = saved.receiptId;
  const before = (await db.doc(`receipts/${receiptId}`).get()).data();
  const selected = await review(member);
  assert.equal(selected.canLeave, true);
  await service.leave(member, selected);
  assert.equal((await auth.getUser(member)).uid, member);
  assert.equal(
    (await db.doc(`users/${member}`).get()).data().activeFamilyId,
    null,
  );
  assert.equal(
    (await db.doc(`familyMembers/${familyId}_${member}`).get()).data().status,
    "inactive",
  );
  assert.equal(
    (await db.doc(`families/${familyId}`).get()).data().status,
    "active",
  );
  assert.equal(
    (await db.doc("entries/shared-entry").get()).data().amount,
    12.5,
  );
  assert.deepEqual(
    (await db.doc(`receipts/${receiptId}`).get()).data(),
    before,
  );
  const original = await receipts.readFile(owner, receiptId);
  assert.deepEqual((await original.file.download())[0], png);
  await assert.rejects(receipts.readFile(member, receiptId));
  const former = env
    .authenticatedContext(member, {
      email: `${member}@example.test`,
      email_verified: true,
    })
    .firestore();
  await assertFails(getDoc(doc(former, "entries", "shared-entry")));
  await assertFails(getDoc(doc(former, "receipts", receiptId)));
  assert.deepEqual(await service.leave(member, selected), { left: true });
});
test("the last administrator cannot leave either a shared or a sole-member family", async () => {
  let selected = await review(owner);
  assert.equal(selected.canLeave, false);
  await assert.rejects(service.leave(owner, selected), { code: "LAST_ADMIN" });
  await db
    .doc(`familyMembers/${familyId}_${member}`)
    .update({ status: "inactive" });
  selected = await review(owner);
  assert.equal(selected.canLeave, false);
  await assert.rejects(service.leave(owner, selected), { code: "LAST_ADMIN" });
});
test("an administrator can leave with another live administrator; disabled or deleted accounts do not count", async () => {
  await addAdmin();
  await auth.updateUser(other, { disabled: true });
  assert.equal((await review(owner)).canLeave, false);
  await auth.deleteUser(other);
  assert.equal((await review(owner)).canLeave, false);
  await auth.createUser({
    uid: other,
    email: `${other}@example.test`,
    password,
    emailVerified: true,
  });
  const selected = await review(owner);
  assert.equal(selected.canLeave, true);
  await service.leave(owner, selected);
  assert.equal(
    (await db.doc(`familyMembers/${familyId}_${other}`).get()).data().status,
    "active",
  );
});
test("two concurrent leave requests cannot remove both remaining administrators", async () => {
  await addAdmin();
  const [a, b] = await Promise.all([review(owner), review(other)]);
  const results = await Promise.allSettled([
    service.leave(owner, a),
    service.leave(other, b),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.find((result) => result.status === "rejected").reason.code,
    "LAST_ADMIN",
  );
  const active = (
    await db.collection("familyMembers").where("familyId", "==", familyId).get()
  ).docs.filter(
    (item) => item.data().role === "admin" && item.data().status === "active",
  );
  assert.equal(active.length, 1);
});
test("a stale confirmation cannot leave a changed, newly rejoined or different family", async () => {
  const selected = await review(member);
  await db
    .doc(`familyMembers/${familyId}_${member}`)
    .update({ displayName: "Changed" });
  await assert.rejects(service.leave(member, selected), {
    code: "FAMILY_CHANGED",
  });
  const fresh = await review(member);
  await service.leave(member, fresh);
  await db
    .doc(`users/${member}`)
    .update({ activeFamilyId: familyId, role: "member" });
  await db
    .doc(`familyMembers/${familyId}_${member}`)
    .update({ status: "active", joinedAt: Timestamp.now() });
  await assert.rejects(service.leave(member, fresh), {
    code: "FAMILY_CHANGED",
  });
  await db
    .doc(`users/${member}`)
    .update({ activeFamilyId: "different-family" });
  await assert.rejects(service.leave(member, fresh), {
    code: "FAMILY_CHANGED",
  });
  assert.equal(
    (await db.doc(`users/${member}`).get()).data().activeFamilyId,
    "different-family",
  );
});
test("inactive/nonmembers cannot prepare departure or select another account", async () => {
  await assert.rejects(review(other));
  await db
    .doc(`familyMembers/${familyId}_${member}`)
    .update({ status: "inactive" });
  await assert.rejects(review(member));
  await db
    .doc(`familyMembers/${familyId}_${member}`)
    .update({ status: "active" });
  const selected = await review(member);
  await service.leave(member, { ...selected, userId: owner });
  assert.equal(
    (await db.doc(`familyMembers/${familyId}_${owner}`).get()).data().status,
    "active",
  );
});
test("leaving does not cancel or transfer the payer's store subscription", async () => {
  const binding = {
    payerUid: member,
    store: "google",
    status: "active",
    productId: "test-product",
  };
  await db.doc(`familySubscriptions/${familyId}`).set(binding);
  const selected = await review(member);
  assert.equal(selected.isStorePayer, true);
  await service.leave(member, selected);
  assert.deepEqual(
    (await db.doc(`familySubscriptions/${familyId}`).get()).data(),
    binding,
  );
});
test("the HTTP leave routes require Firebase authentication and bind mutations to that caller", async () => {
  const app = createReceiptApi({}, auth, undefined, service);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const url = `http://127.0.0.1:${server.address().port}/family/leave`;
  try {
    assert.equal((await fetch(url)).status, 401);
    const signin = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-only-key`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `${member}@example.test`,
          password,
          returnSecureToken: true,
        }),
      },
    );
    assert.equal(signin.status, 200);
    const token = (await signin.json()).idToken;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const prepared = await fetch(url, { headers });
    assert.equal(prepared.status, 200);
    const data = await prepared.json();
    assert.equal(
      (await fetch(url, { method: "POST", headers, body: "{}" })).status,
      400,
    );
    const left = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...data, userId: owner }),
    });
    assert.equal(left.status, 200);
    assert.equal(
      (await db.doc(`users/${owner}`).get()).data().activeFamilyId,
      familyId,
    );
    assert.equal(
      (await db.doc(`users/${member}`).get()).data().activeFamilyId,
      null,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
