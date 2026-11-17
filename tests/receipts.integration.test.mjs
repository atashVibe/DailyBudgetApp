import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { initializeApp as clientApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, getBytes, uploadBytes } from "firebase/storage";
import { createReceiptService } from "../functions/src/service.mjs";
import { createReceiptApi } from "../functions/src/api.mjs";

const requireBackend = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp } = requireBackend("firebase-admin/app");
const { getFirestore, Timestamp } = requireBackend("firebase-admin/firestore");
const { getAuth: adminAuth } = requireBackend("firebase-admin/auth");
const { getStorage } = requireBackend("firebase-admin/storage");
const sharp = requireBackend("sharp");
const { PDFDocument } = requireBackend("pdf-lib");
const { unzipSync } = requireBackend("fflate");
const projectId = "demo-dailybudget-receipts";
const DAY = 86400000;
let db, bucket, service, server, base, env, app, users, now, png, jpeg, pdf;
let failDelete = false,
  retained = false,
  failSaveAfterWrite = false;
const start = Date.UTC(2026, 10, 16);

before(async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST &&
      process.env.STORAGE_EMULATOR_HOST &&
      process.env.FIREBASE_AUTH_EMULATOR_HOST,
    "Run only with Firebase emulators; never against production.",
  );
  const backend = initializeApp(
    { projectId, storageBucket: `${projectId}.appspot.com` },
    "receipt-test",
  );
  db = getFirestore(backend);
  bucket = getStorage(backend).bucket();
  const originalFile = bucket.file.bind(bucket);
  bucket.file = (...args) => {
    const file = originalFile(...args);
    const save = file.save.bind(file);
    file.save = async (...values) => {
      await save(...values);
      if (failSaveAfterWrite)
        throw new Error("Simulated lost upload completion");
    };
    return file;
  };
  app = clientApp({ projectId, apiKey: "demo-only-key" }, "receipt-auth");
  const auth = getAuth(app);
  connectAuthEmulator(
    auth,
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,
    { disableWarnings: true },
  );
  users = [];
  for (const email of [
    "receipt-a@example.test",
    "receipt-b@example.test",
    "receipt-c@example.test",
    "receipt-d@example.test",
  ]) {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      "EmulatorTestOnly123!",
    );
    users.push({ uid: result.user.uid, token: await result.user.getIdToken() });
  }
  service = createReceiptService({
    db,
    bucket,
    auth: adminAuth(backend),
    clock: () => now,
    deleteObject: async (file) => {
      if (failDelete) throw new Error("Simulated Storage outage");
      await bucket.file(file.storagePath).delete({ ignoreNotFound: true });
      return retained
        ? { permanent: false, retainedUntil: now + 7 * DAY }
        : { permanent: true };
    },
  });
  server = createReceiptApi(service, adminAuth(backend)).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(
        new URL("../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
    storage: {
      rules: await readFile(
        new URL("../storage.rules", import.meta.url),
        "utf8",
      ),
    },
  });
  png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  jpeg = await sharp(png).jpeg().toBuffer();
  const document = await PDFDocument.create();
  document.addPage();
  pdf = Buffer.from(await document.save());
});

beforeEach(async () => {
  now = start;
  failDelete = false;
  retained = false;
  failSaveAfterWrite = false;
  await env.clearFirestore();
  await bucket.deleteFiles({ force: true });
  for (const [i, user] of users.entries()) {
    const familyId = i < 2 ? "family-a" : "family-b";
    await db.doc(`receiptAccess/${user.uid}`).set({ administrator: i === 0 });
    await db.doc(`users/${user.uid}`).set({ activeFamilyId: familyId });
    await db.doc(`families/${familyId}`).set({
      name: familyId,
      status: "active",
      createdBy: users[i < 2 ? 0 : 2].uid,
    });
    await db.doc(`familyMembers/${familyId}_${user.uid}`).set({
      familyId,
      userId: user.uid,
      role: i % 2 === 0 ? "admin" : "member",
      status: "active",
    });
    await db.doc(`entries/entry-${i}`).set({
      familyId,
      userId: user.uid,
      type: "expense",
      amount: 10,
      date: "2026-11-16",
    });
  }
  await db
    .doc("receiptFamilyAccess/family-b")
    .set({ plan: "premium", subscriptionStatus: "active" });
});

after(async () => {
  await env?.cleanup();
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  if (app) await deleteApp(app);
});

async function request(path, user = users[0], options = {}) {
  return fetch(base + path, {
    ...options,
    headers: {
      ...(user ? { Authorization: `Bearer ${user.token}` } : {}),
      ...options.headers,
    },
  });
}
async function upload({
  user = users[0],
  data = png,
  mime = "image/png",
  name = "receipt.png",
  entry = "entry-0",
  replace,
  requestId = randomUUID(),
} = {}) {
  return request("/upload", user, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Receipt-Mime": mime,
      "X-Receipt-Filename": encodeURIComponent(name),
      "X-Receipt-Transaction": entry,
      "X-Receipt-Request": requestId,
      ...(replace ? { "X-Receipt-Replace": replace } : {}),
    },
    body: data,
  });
}
async function successfulUpload(options) {
  const response = await upload(options);
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}
async function access(action, user = users[2]) {
  const response = await request("/admin/access", users[0], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(action.endsWith("admin")
        ? { userId: user.uid }
        : {
            familyId:
              user.uid === users[0].uid || user.uid === users[1].uid
                ? "family-a"
                : "family-b",
          }),
      action,
    }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}

test("JPG, JPEG, PNG and PDF originals round-trip unchanged", async () => {
  for (const [index, data, mime, name] of [
    [0, jpeg, "image/jpeg", "photo.jpg"],
    [1, jpeg, "image/jpeg", "photo.jpeg"],
    [2, png, "image/png", "photo.png"],
    [3, pdf, "application/pdf", "scan.pdf"],
  ]) {
    const id = `format-${index}`;
    await db.doc(`entries/${id}`).set({
      familyId: "family-a",
      userId: users[0].uid,
      type: "expense",
      date: "2025-04-01",
    });
    const receipt = await successfulUpload({ data, mime, name, entry: id });
    assert.equal(receipt.originalFilename, name);
    assert.equal(receipt.fileSize, data.length);
    const download = await request(`/file/${receipt.receiptId}`);
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), data);
    const stored = (await db.doc(`receipts/${receipt.receiptId}`).get()).data();
    const [metadata] = await bucket.file(stored.storagePath).getMetadata();
    assert.ok(!metadata.metadata?.firebaseStorageDownloadTokens);
  }
});

test("authentication and family isolation applies even to global receipt administrators", async () => {
  const receipt = await successfulUpload();
  assert.equal((await request(`/file/${receipt.receiptId}`, null)).status, 401);
  await access("grant-admin");
  assert.equal(
    (await request(`/file/${receipt.receiptId}`, users[2])).status,
    403,
  );
  assert.equal(
    (await upload({ user: users[2], replace: receipt.receiptId })).status,
    403,
  );
  assert.equal(
    (
      await request(`/receipts/${receipt.receiptId}`, users[2], {
        method: "DELETE",
      })
    ).status,
    403,
  );
  assert.equal((await request(`/file/${receipt.receiptId}`)).status, 200);
});

test("Firestore role/metadata writes and direct Storage access cannot bypass the gateway", async () => {
  const receipt = await successfulUpload();
  const a = env.authenticatedContext(users[0].uid),
    b = env.authenticatedContext(users[2].uid);
  await assertSucceeds(
    getDoc(doc(a.firestore(), "receipts", receipt.receiptId)),
  );
  await assertFails(getDoc(doc(b.firestore(), "receipts", receipt.receiptId)));
  await assertFails(
    getDoc(
      doc(
        env.unauthenticatedContext().firestore(),
        "receipts",
        receipt.receiptId,
      ),
    ),
  );
  await assertFails(
    setDoc(doc(a.firestore(), "receiptAccess", users[0].uid), {
      administrator: true,
    }),
  );
  await assertFails(
    setDoc(doc(a.firestore(), "receipts", receipt.receiptId), {
      userId: users[0].uid,
    }),
  );
  const record = (await db.doc(`receipts/${receipt.receiptId}`).get()).data();
  for (const context of [a, b, env.unauthenticatedContext()]) {
    await assertFails(getBytes(ref(context.storage(), record.storagePath)));
    await assertFails(
      uploadBytes(
        ref(context.storage(), `receipts/${users[0].uid}/bypass`),
        png,
      ),
    );
  }
});

test("free/family-admin access cannot upload or grant receipt admin, but receipt admins need no subscription", async () => {
  await db.doc("receiptFamilyAccess/family-b").set({ plan: "free" });
  assert.equal(
    (await upload({ user: users[2], entry: "entry-2" })).status,
    403,
  );
  assert.equal(
    (
      await request("/admin/access", users[2], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: users[2].uid, action: "grant-admin" }),
      })
    ).status,
    403,
  );
  await successfulUpload();
  assert.equal((await service.getAccess(users[0].uid)).plan, "free");
});

test("actual content, size and decoded validity are checked", async () => {
  assert.equal(
    (await upload({ mime: "application/pdf", name: "fake.pdf" })).status,
    415,
  );
  assert.equal(
    (await upload({ data: Buffer.from("not an image"), name: "fake.png" }))
      .status,
    415,
  );
  assert.equal((await upload({ data: png.subarray(0, 16) })).status, 415);
  assert.equal(
    (await upload({ data: Buffer.alloc(10 * 1024 * 1024 + 1) })).status,
    413,
  );
  assert.equal((await db.collection("receipts").get()).size, 0);
});

test("duplicate/retried uploads preserve one original; count and byte quotas cannot be bypassed", async () => {
  const requestId = randomUUID();
  const receipt = await successfulUpload({ requestId });
  assert.equal(
    (await successfulUpload({ requestId })).receiptId,
    receipt.receiptId,
  );
  assert.equal((await successfulUpload()).receiptId, receipt.receiptId);
  await successfulUpload({ data: jpeg, mime: "image/jpeg" });
  assert.equal(
    (await upload({ data: pdf, mime: "application/pdf" })).status,
    409,
  );
  assert.equal((await db.collection("receipts").get()).size, 2);
  await db
    .doc("receiptConfig/global")
    .set({ plans: { administrator: { maxStorageBytes: 1 } } });
  assert.equal(
    (
      await upload({
        data: pdf,
        mime: "application/pdf",
        replace: receipt.receiptId,
      })
    ).status,
    413,
  );
});

test("replacement works at the two-receipt limit and keeps original metadata identity", async () => {
  const first = await successfulUpload();
  await successfulUpload({ data: jpeg, mime: "image/jpeg" });
  const replaced = await successfulUpload({
    replace: first.receiptId,
    data: pdf,
    mime: "application/pdf",
    name: "new.pdf",
  });
  assert.equal(replaced.receiptId, first.receiptId);
  assert.equal(replaced.uploadedAt, first.uploadedAt);
  assert.deepEqual(
    Buffer.from(
      await (await request(`/file/${first.receiptId}`)).arrayBuffer(),
    ),
    pdf,
  );
  assert.equal((await db.collection("receipts").get()).size, 2);
  assert.equal((await bucket.getFiles())[0].length, 2);
});

test("concurrent upload attempts cannot exceed a transaction's receipt limit", async () => {
  const results = await Promise.all([
    upload(),
    upload({ data: jpeg, mime: "image/jpeg" }),
    upload({ data: pdf, mime: "application/pdf" }),
  ]);
  assert.ok(results.every((r) => [200, 409].includes(r.status)));
  assert.ok((await db.collection("receipts").get()).size <= 2);
});

test("cancellation starts an exact non-extending 30-day grace period with download/export access", async () => {
  const receipt = await successfulUpload({ user: users[2], entry: "entry-2" });
  const canceled = await access("cancel");
  assert.equal(canceled.deletionScheduledAt, start + 30 * DAY);
  assert.equal(
    (
      await upload({
        user: users[2],
        entry: "entry-2",
        data: jpeg,
        mime: "image/jpeg",
      })
    ).status,
    403,
  );
  assert.equal(
    (await request(`/file/${receipt.receiptId}`, users[2])).status,
    200,
  );
  const exported = await request("/export", users[2]);
  assert.equal(exported.status, 200);
  const zip = unzipSync(new Uint8Array(await exported.arrayBuffer()));
  const manifest = JSON.parse(Buffer.from(zip["manifest.json"]).toString());
  assert.equal(manifest.receipts.length, 1);
  assert.ok(manifest.receipts[0].archivePath.startsWith("2026/entry-2/"));
  assert.deepEqual(Buffer.from(zip[manifest.receipts[0].archivePath]), png);
  assert.equal(
    manifest.receipts[0].sha256,
    createHash("sha256").update(png).digest("hex"),
  );
  now += 2 * DAY;
  assert.equal((await access("cancel")).deletionScheduledAt, start + 30 * DAY);
});

test("renewal or Archive activation prevents grace cleanup; Archive cannot upload/replace", async () => {
  for (const action of ["activate-premium", "activate-archive"]) {
    await successfulUpload({ user: users[2], entry: "entry-2" });
    await access("cancel");
    now += 29 * DAY;
    await access(action);
    now += 2 * DAY;
    await service.maintain();
    const records = await service.list(users[2].uid);
    assert.equal(records.length, 1);
    assert.equal(
      (await request(`/file/${records[0].receiptId}`, users[2])).status,
      200,
    );
    if (action === "activate-archive") {
      assert.equal(
        (
          await upload({
            user: users[2],
            entry: "entry-2",
            replace: records[0].receiptId,
            data: jpeg,
            mime: "image/jpeg",
          })
        ).status,
        403,
      );
    }
  }
});

test("expiry deletes only eligible user's files/metadata and leaves budget history and administrators intact", async () => {
  await successfulUpload();
  await successfulUpload({ user: users[2], entry: "entry-2" });
  await access("cancel");
  now += 30 * DAY;
  await service.maintain();
  await service.maintain();
  assert.equal((await service.list(users[2].uid)).length, 0);
  assert.equal((await service.list(users[0].uid)).length, 1);
  assert.equal((await db.doc("entries/entry-1").get()).exists, true);
});

test("failed deletions remain tracked and retry without deleting transactions", async () => {
  const receipt = await successfulUpload();
  failDelete = true;
  assert.equal(
    (
      await request(`/receipts/${receipt.receiptId}`, users[0], {
        method: "DELETE",
      })
    ).status,
    200,
  );
  assert.equal(
    (await db.doc(`receipts/${receipt.receiptId}`).get()).data().status,
    "deleting",
  );
  assert.equal(
    (
      await db
        .collection("receiptOperations")
        .where("state", "==", "cleanup_pending")
        .get()
    ).size,
    1,
  );
  failDelete = false;
  now += 3600001;
  await service.maintain();
  assert.equal(
    (await db.doc(`receipts/${receipt.receiptId}`).get()).exists,
    false,
  );
  assert.equal((await db.doc("entries/entry-0").get()).exists, true);
});

test("retained copies are never falsely reported as permanently erased", async () => {
  const receipt = await successfulUpload();
  retained = true;
  await request(`/receipts/${receipt.receiptId}`, users[0], {
    method: "DELETE",
  });
  const jobs = await db
    .collection("receiptOperations")
    .where("state", "==", "retained")
    .get();
  assert.equal(jobs.size, 1);
  assert.equal(jobs.docs[0].data().verifiedPermanent, false);
  assert.equal(
    (await db.doc(`receipts/${receipt.receiptId}`).get()).exists,
    true,
  );
  retained = false;
  now += 8 * DAY;
  await service.maintain();
  assert.equal(
    (await db.doc(`receipts/${receipt.receiptId}`).get()).exists,
    false,
  );
});

test("interrupted completion cleans orphan candidates without losing a previous original", async () => {
  const receipt = await successfulUpload();
  failSaveAfterWrite = true;
  assert.equal(
    (
      await upload({
        replace: receipt.receiptId,
        data: jpeg,
        mime: "image/jpeg",
      })
    ).status,
    503,
  );
  failSaveAfterWrite = false;
  const download = await request(`/file/${receipt.receiptId}`);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
  now += 10 * 60000 + 1;
  await service.maintain();
  assert.equal((await bucket.getFiles())[0].length, 1);
});

test("missing originals produce a download error rather than a false successful backup", async () => {
  const receipt = await successfulUpload();
  const record = (await db.doc(`receipts/${receipt.receiptId}`).get()).data();
  await bucket.file(record.storagePath).delete();
  assert.equal((await request(`/file/${receipt.receiptId}`)).status, 503);
});

test("account receipt cleanup is independent of budget records and is idempotent", async () => {
  await successfulUpload();
  await service.purgeAccount(users[0].uid);
  await service.purgeAccount(users[0].uid);
  assert.equal((await service.list(users[0].uid)).length, 1);
  assert.equal((await service.list(users[1].uid))[0].userId, null);
  assert.equal((await db.doc("entries/entry-0").get()).exists, true);
});

test("receipt administrators can grant and revoke roles, with immediate enforcement", async () => {
  await access("grant-admin");
  assert.equal((await service.getAccess(users[2].uid)).administrator, true);
  await access("revoke-admin");
  assert.equal((await service.getAccess(users[2].uid)).administrator, false);
  assert.equal((await request("/admin", users[2])).status, 403);
});

test("admin overview measures actual stored receipt bytes", async () => {
  await successfulUpload();
  await service.adminStats(users[0].uid);
  const response = await request("/admin");
  const stats = await response.json();
  assert.equal(response.status, 200, JSON.stringify(stats));
  assert.equal(stats.receiptCount, 1);
  assert.equal(stats.totalStoredBytes, png.length);
  assert.equal(stats.estimatedStorageUSD, null); // No invented regional pricing.
});

test("retrying a safely cleaned failed upload uses the same request identifier", async () => {
  const requestId = randomUUID();
  failSaveAfterWrite = true;
  assert.equal((await upload({ requestId })).status, 503);
  failSaveAfterWrite = false;
  assert.equal((await upload({ requestId })).status, 409);
  now += 10 * 60000 + 1;
  await service.maintain();
  await successfulUpload({ requestId });
  assert.equal((await db.collection("receipts").get()).size, 1);
});

test("exporting another account never includes the first owner's originals", async () => {
  await successfulUpload();
  const response = await request("/export", users[2]);
  const zip = unzipSync(new Uint8Array(await response.arrayBuffer()));
  assert.equal(
    JSON.parse(Buffer.from(zip["manifest.json"]).toString()).receipts.length,
    0,
  );
});

test("all current members share uploads, downloads, replacement, deletion and export", async () => {
  const receipt = await successfulUpload();
  const member = users[1];
  assert.equal(
    (await request(`/file/${receipt.receiptId}`, member)).status,
    200,
  );
  const shared = await service.list(member.uid);
  assert.equal(shared[0].receiptId, receipt.receiptId);
  const replacement = await successfulUpload({
    user: member,
    replace: receipt.receiptId,
    data: jpeg,
    mime: "image/jpeg",
    name: "member.jpg",
  });
  assert.equal(replacement.userId, users[0].uid);
  assert.equal(replacement.updatedBy, member.uid);
  const zip = unzipSync(
    new Uint8Array(await (await request("/export", member)).arrayBuffer()),
  );
  assert.equal(
    JSON.parse(Buffer.from(zip["manifest.json"]).toString()).receipts.length,
    1,
  );
  assert.equal(
    (
      await request(`/receipts/${receipt.receiptId}`, member, {
        method: "DELETE",
      })
    ).status,
    200,
  );
  assert.equal((await service.list(users[0].uid)).length, 0);
});

test("leaving a family revokes both file and Firestore receipt access immediately", async () => {
  const receipt = await successfulUpload();
  await db
    .doc(`familyMembers/family-a_${users[1].uid}`)
    .update({ status: "inactive" });
  assert.equal(
    (await request(`/file/${receipt.receiptId}`, users[1])).status,
    403,
  );
  assert.equal((await request("/export", users[1])).status, 403);
  assert.equal((await upload({ user: users[1] })).status, 403);
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext(users[1].uid).firestore(),
        "receipts",
        receipt.receiptId,
      ),
    ),
  );
});

test("family subscription cancellation affects every member and renewal restores the family", async () => {
  const receipt = await successfulUpload({ user: users[2], entry: "entry-2" });
  assert.equal(
    (await request(`/file/${receipt.receiptId}`, users[3])).status,
    200,
  );
  await access("cancel");
  for (const member of [users[2], users[3]]) {
    assert.equal(
      (
        await upload({
          user: member,
          entry: "entry-2",
          data: jpeg,
          mime: "image/jpeg",
        })
      ).status,
      403,
    );
    assert.equal(
      (await request(`/file/${receipt.receiptId}`, member)).status,
      200,
    );
  }
  await access("activate-premium");
  await successfulUpload({
    user: users[3],
    entry: "entry-2",
    data: jpeg,
    mime: "image/jpeg",
  });
});

test("concurrent members share the same two-receipt transaction limit", async () => {
  const results = await Promise.all([
    upload(),
    upload({ user: users[1], data: jpeg, mime: "image/jpeg" }),
    upload({ user: users[1], data: pdf, mime: "application/pdf" }),
  ]);
  assert.ok(results.every((r) => [200, 409].includes(r.status)));
  assert.ok((await db.collection("receipts").get()).size <= 2);
});

test("receipt-family plan and global roles cannot be written by family members", async () => {
  const context = env.authenticatedContext(users[1].uid);
  await assertFails(
    setDoc(doc(context.firestore(), "receiptFamilyAccess", "family-a"), {
      plan: "premium",
      subscriptionStatus: "active",
    }),
  );
  assert.equal(
    (
      await request("/admin/access", users[1], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: "family-a",
          action: "activate-premium",
        }),
      })
    ).status,
    403,
  );
});

test("bulk export follows current authorized transaction years and preserves same-named originals", async () => {
  const first = await successfulUpload({ name: "receipt.png" });
  await db.doc("entries/older").set({
    userId: users[0].uid,
    familyId: "family-a",
    type: "expense",
    date: "2024-12-31",
    merchant: "Sample Merchant",
  });
  await successfulUpload({ entry: "older", name: "receipt.png" });
  await db.doc("entries/entry-0").update({ date: "2025-01-01" });
  const zip = unzipSync(
    new Uint8Array(await (await request("/export")).arrayBuffer()),
  );
  const manifest = JSON.parse(Buffer.from(zip["manifest.json"]).toString());
  assert.equal(manifest.receipts.length, 2);
  assert.ok(
    manifest.receipts.some(
      (r) =>
        r.archivePath.startsWith("2024/") && r.merchant === "Sample Merchant",
    ),
  );
  assert.ok(
    manifest.receipts.some(
      (r) =>
        r.receiptId === first.receiptId && r.archivePath.startsWith("2025/"),
    ),
  );
  for (const receipt of manifest.receipts)
    assert.deepEqual(Buffer.from(zip[receipt.archivePath]), png);
});

test("deleting a transaction does not automatically erase an active owner's tax originals", async () => {
  const receipt = await successfulUpload();
  await db.doc("entries/entry-0").delete();
  await service.maintain();
  assert.equal((await request(`/file/${receipt.receiptId}`)).status, 200);
  const zip = unzipSync(
    new Uint8Array(await (await request("/export")).arrayBuffer()),
  );
  const manifest = JSON.parse(Buffer.from(zip["manifest.json"]).toString());
  assert.equal(manifest.receipts[0].transactionDate, "2026-11-16");
});

test("bulk export fails visibly if an original is unavailable", async () => {
  const receipt = await successfulUpload();
  const record = (await db.doc(`receipts/${receipt.receiptId}`).get()).data();
  await bucket.file(record.storagePath).delete();
  await assert.rejects(async () => {
    const response = await request("/export");
    await response.arrayBuffer();
  });
});

test("invalid sign-in tokens cannot reach the receipt backend", async () => {
  assert.equal(
    (
      await request("/access", null, {
        headers: { Authorization: "Bearer invalid-token" },
      })
    ).status,
    401,
  );
});

test("an abandoned family loses admin sponsorship and gets grace instead of immediate deletion", async () => {
  const result = await createUserWithEmailAndPassword(
    getAuth(app),
    "deleted-owner@example.test",
    "EmulatorTestOnly123!",
  );
  const user = { uid: result.user.uid, token: await result.user.getIdToken() };
  await db.doc(`receiptAccess/${user.uid}`).set({ administrator: true });
  await db.doc(`users/${user.uid}`).set({ activeFamilyId: "abandoned" });
  await db
    .doc("families/abandoned")
    .set({ status: "active", name: "Abandoned test family" });
  await db
    .doc(`familyMembers/abandoned_${user.uid}`)
    .set({ userId: user.uid, familyId: "abandoned", status: "active" });
  await db.doc("entries/deleted-owner").set({
    userId: user.uid,
    familyId: "abandoned",
    type: "expense",
    date: "2026-11-16",
  });
  const receipt = await successfulUpload({ user, entry: "deleted-owner" });
  await successfulUpload();
  await requireBackend("firebase-admin/auth")
    .getAuth(requireBackend("firebase-admin/app").getApp("receipt-test"))
    .deleteUser(user.uid);
  await service.maintain();
  assert.equal(
    (await db.doc(`receipts/${receipt.receiptId}`).get()).exists,
    true,
  );
  now += 30 * DAY;
  await service.maintain();
  assert.equal(
    (await db.doc(`receipts/${receipt.receiptId}`).get()).exists,
    false,
  );
  assert.equal((await service.list(users[0].uid)).length, 1);
  assert.equal((await db.doc("entries/deleted-owner").get()).exists, true);
});

async function receiptCategory({ required = true, type = "expense" } = {}) {
  await db
    .doc("budgetAreas/receipt-area")
    .set({ familyId: "family-a", name: "Daily", isArchived: false });
  await db.doc("categories/receipt-category").set({
    familyId: "family-a",
    budgetAreaId: "receipt-area",
    name: "Required receipts",
    type,
    requiresReceipt: required,
    isArchived: false,
    createdBy: users[0].uid,
  });
  return {
    amount: 12.5,
    categoryId: "receipt-category",
    budgetAreaId: "receipt-area",
    date: "2026-11-16",
    note: "Receipt-first entry",
  };
}
async function postJson(path, body, user = users[0]) {
  return request(path, user, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function beginDraft(user = users[0], familyId = "family-a") {
  const draftId = randomUUID();
  const response = await postJson("/entry-drafts", { familyId, draftId }, user);
  assert.equal(response.status, 200, await response.text());
  return draftId;
}

test("required receipt drafts do not affect budgets until verified originals and entry commit together", async () => {
  const entry = await receiptCategory();
  const draftId = await beginDraft();
  assert.equal((await db.doc(`entries/${draftId}`).get()).exists, false);
  assert.equal(
    (await postJson("/entry-drafts/commit", { draftId, entry })).status,
    409,
  );
  const receipt = await successfulUpload({ entry: draftId });
  assert.equal((await db.doc(`entries/${draftId}`).get()).exists, false);
  assert.equal(
    (await (await request("/receipts")).json()).some(
      (r) => r.receiptId === receipt.receiptId,
    ),
    false,
  );
  const unfinishedExport = unzipSync(
    new Uint8Array(await (await request("/export")).arrayBuffer()),
  );
  assert.equal(
    JSON.parse(Buffer.from(unfinishedExport["manifest.json"]).toString())
      .receipts.length,
    0,
  );
  const response = await postJson("/entry-drafts/commit", { draftId, entry });
  assert.equal(response.status, 200, await response.text());
  const saved = (await db.doc(`entries/${draftId}`).get()).data();
  assert.equal(saved.receiptId, receipt.receiptId);
  assert.equal(saved.amount, 12.5);
  assert.equal(saved.type, "expense");
  assert.equal(
    (await db.doc(`receipts/${receipt.receiptId}`).get()).data().draft,
    false,
  );
  assert.equal(
    (await db.doc(`receiptEntryDrafts/${draftId}`).get()).exists,
    false,
  );
  assert.equal(
    (await postJson("/entry-drafts/commit", { draftId, entry })).status,
    200,
  );
  assert.equal((await db.collection("entries").get()).size, 5);
  assert.equal(
    (
      await postJson("/entry-drafts/commit", {
        draftId,
        entry: { ...entry, amount: 99 },
      })
    ).status,
    409,
  );
});

test("draft attachment failures and category changes cannot create incomplete required entries", async () => {
  const entry = await receiptCategory({ required: false });
  const draftId = await beginDraft();
  await db.doc("categories/receipt-category").update({ requiresReceipt: true });
  assert.equal(
    (await upload({ entry: draftId, data: Buffer.from("not an image") }))
      .status,
    415,
  );
  assert.equal(
    (await postJson("/entry-drafts/commit", { draftId, entry })).status,
    409,
  );
  assert.equal((await db.doc(`entries/${draftId}`).get()).exists, false);
  await successfulUpload({ entry: draftId });
  assert.equal(
    (await postJson("/entry-drafts/commit", { draftId, entry })).status,
    200,
  );
});

test("only the draft author can upload or commit it, while completed receipts are shared with current members", async () => {
  const entry = await receiptCategory();
  const draftId = await beginDraft(users[1]);
  assert.equal((await upload({ entry: draftId, user: users[0] })).status, 403);
  assert.equal(
    (await postJson("/entry-drafts/commit", { draftId, entry }, users[0]))
      .status,
    403,
  );
  assert.equal(
    (
      await postJson(
        "/entry-drafts",
        { familyId: "family-a", draftId },
        users[2],
      )
    ).status,
    403,
  );
  const receipt = await successfulUpload({ entry: draftId, user: users[1] });
  assert.equal(
    (await postJson("/entry-drafts/commit", { draftId, entry }, users[1]))
      .status,
    200,
  );
  assert.equal(
    (await request(`/file/${receipt.receiptId}`, users[0])).status,
    200,
  );
  assert.equal(
    (await request(`/file/${receipt.receiptId}`, users[2])).status,
    403,
  );
});

test("Firestore enforces category receipt requirements, verified associations, draft reservation, and administrator-only settings", async () => {
  const entry = await receiptCategory();
  const member = env.authenticatedContext(users[1].uid).firestore();
  const administrator = env.authenticatedContext(users[0].uid).firestore();
  const id = randomUUID();
  const data = {
    ...entry,
    familyId: "family-a",
    userId: users[1].uid,
    type: "expense",
  };
  await assertFails(setDoc(doc(member, "entries", id), data));
  await assertFails(
    setDoc(doc(member, "entries", id), { ...data, receiptId: "invented-file" }),
  );
  const wrongReceipt = await successfulUpload();
  await assertFails(
    setDoc(doc(member, "entries", id), {
      ...data,
      receiptId: wrongReceipt.receiptId,
    }),
  );
  await assertFails(
    setDoc(
      doc(member, "categories", "receipt-category"),
      { requiresReceipt: false },
      { merge: true },
    ),
  );
  await assertSucceeds(
    setDoc(
      doc(administrator, "categories", "receipt-category"),
      { requiresReceipt: false },
      { merge: true },
    ),
  );
  await assertSucceeds(setDoc(doc(member, "entries", id), data));
  const draftId = await beginDraft(users[1]);
  const pending = await successfulUpload({ entry: draftId, user: users[1] });
  await assertFails(
    setDoc(doc(member, "entries", draftId), {
      ...data,
      receiptId: pending.receiptId,
    }),
  );
  await assertFails(
    setDoc(doc(member, "receiptEntryDrafts", "forged-draft"), {
      familyId: "family-a",
      userId: users[1].uid,
    }),
  );
  await assertFails(
    setDoc(
      doc(administrator, "categories", "receipt-category"),
      { requiresReceipt: "false" },
      { merge: true },
    ),
  );
});

test("expired abandoned drafts clean their files without touching completed entries or budget history", async () => {
  const entry = await receiptCategory();
  const abandonedId = await beginDraft();
  const abandoned = await successfulUpload({ entry: abandonedId });
  const completedId = await beginDraft();
  const completed = await successfulUpload({ entry: completedId });
  assert.equal(
    (await postJson("/entry-drafts/commit", { draftId: completedId, entry }))
      .status,
    200,
  );
  now += DAY + 1;
  await service.maintain();
  assert.equal((await db.doc(`entries/${abandonedId}`).get()).exists, false);
  assert.equal(
    (
      await bucket
        .file(
          (await db.doc(`receipts/${completed.receiptId}`).get()).data()
            .storagePath,
        )
        .exists()
    )[0],
    true,
  );
  assert.equal(
    (await db.doc(`receipts/${abandoned.receiptId}`).get()).exists,
    false,
  );
  assert.equal((await db.doc(`entries/${completedId}`).get()).exists, true);
  assert.equal((await db.doc("entries/entry-0").get()).exists, true);
  assert.equal(
    (await postJson("/entry-drafts/commit", { draftId: abandonedId, entry }))
      .status,
    410,
  );
});

test("receipt-first entries preserve each category type and reject invalid or cross-family associations", async () => {
  for (const type of ["expense", "income", "refund", "cashback"]) {
    const entry = await receiptCategory({ type });
    const draftId = await beginDraft();
    await successfulUpload({ entry: draftId });
    assert.equal(
      (
        await postJson("/entry-drafts/commit", {
          draftId,
          entry: { ...entry, date: "2026-02-30" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await postJson("/entry-drafts/commit", {
          draftId,
          entry: { ...entry, budgetAreaId: "other-area" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await postJson("/entry-drafts/commit", {
          draftId,
          entry: { ...entry, type: "forged", userId: users[2].uid },
        })
      ).status,
      200,
    );
    const saved = (await db.doc(`entries/${draftId}`).get()).data();
    assert.equal(saved.type, type);
    assert.equal(saved.userId, users[0].uid);
  }
});

test("account deletion removes unfinished private drafts while preserving completed shared family receipts", async () => {
  await receiptCategory();
  const shared = await successfulUpload({ user: users[1], entry: "entry-1" });
  const draftId = await beginDraft(users[1]);
  const draftReceipt = await successfulUpload({
    user: users[1],
    entry: draftId,
  });
  const response = await request("/delete-account-receipts", users[1], {
    method: "POST",
  });
  assert.equal(response.status, 200);
  assert.equal(
    (await db.doc(`receipts/${draftReceipt.receiptId}`).get()).exists,
    false,
  );
  const draft = (await db.doc(`receiptEntryDrafts/${draftId}`).get()).data();
  assert.equal(draft.status, "expired");
  assert.equal(draft.userId, null);
  assert.equal(
    (await db.doc(`receipts/${shared.receiptId}`).get()).data().status,
    "ready",
  );
  assert.equal((await db.doc("entries/entry-1").get()).exists, true);
});

test("a previously uploaded draft can finish during grace without permitting new uploads", async () => {
  const entry = await receiptCategory();
  const draftId = await beginDraft();
  await successfulUpload({ entry: draftId });
  await db
    .doc(`receiptAccess/${users[0].uid}`)
    .update({ administrator: false });
  const retry = await postJson("/entry-drafts", {
    draftId,
    familyId: "family-a",
  });
  assert.equal(retry.status, 200);
  assert.equal(
    (await upload({ entry: draftId, data: jpeg, mime: "image/jpeg" })).status,
    403,
  );
  assert.equal(
    (await postJson("/entry-drafts/commit", { draftId, entry })).status,
    200,
  );
  assert.equal((await db.doc(`entries/${draftId}`).get()).exists, true);
});

test("category requirements need family-admin rights and current family upload access, including required category creation", async () => {
  await receiptCategory({ required: false });
  const payload = {
    familyId: "family-a",
    categoryId: "receipt-category",
    required: true,
  };
  assert.equal(
    (await postJson("/categories/receipt-requirement", payload, users[1]))
      .status,
    403,
  );
  assert.equal(
    (await postJson("/categories/receipt-requirement", payload)).status,
    200,
  ); // Administrator-sponsored access.
  await db
    .doc(`receiptAccess/${users[0].uid}`)
    .update({ administrator: false });
  assert.equal(
    (await postJson("/categories/receipt-requirement", payload)).status,
    403,
  );
  assert.equal(
    (
      await postJson("/categories/receipt-requirement", {
        ...payload,
        required: false,
      })
    ).status,
    200,
  );
  const create = {
    name: "New required category",
    type: "expense",
    budgetAreaId: "receipt-area",
  };
  assert.equal(
    (
      await postJson("/categories/receipt-requirement", {
        ...payload,
        categoryId: "no-partial-category",
        create,
      })
    ).status,
    403,
  );
  assert.equal(
    (await db.doc("categories/no-partial-category").get()).exists,
    false,
  );
  await db
    .doc("receiptFamilyAccess/family-a")
    .set({ plan: "premium", subscriptionStatus: "active" }, { merge: true });
  assert.equal(
    (await postJson("/categories/receipt-requirement", payload)).status,
    200,
  );
  const created = await postJson("/categories/receipt-requirement", {
    ...payload,
    categoryId: "new-receipt-category",
    create,
  });
  assert.equal(created.status, 200);
  assert.equal((await created.json()).requiresReceipt, true);
  assert.equal(
    (await db.doc("categories/new-receipt-category").get()).data().createdBy,
    users[0].uid,
  );
  await db.doc("receiptFamilyAccess/family-a").update({ plan: "archive" });
  assert.equal(
    (await postJson("/categories/receipt-requirement", payload)).status,
    403,
  );
});

test("client category writes cannot bypass required-receipt entitlements, but admins can clear old requirements without Premium", async () => {
  await receiptCategory({ required: false });
  const administrator = env.authenticatedContext(users[0].uid).firestore();
  await assertFails(
    setDoc(
      doc(administrator, "categories", "receipt-category"),
      { requiresReceipt: true },
      { merge: true },
    ),
  );
  await assertFails(
    setDoc(doc(administrator, "categories", "forged-required"), {
      familyId: "family-a",
      createdBy: users[0].uid,
      requiresReceipt: true,
    }),
  );
  await db.doc("categories/receipt-category").update({ requiresReceipt: true });
  await db
    .doc(`receiptAccess/${users[0].uid}`)
    .update({ administrator: false });
  await assertSucceeds(
    setDoc(
      doc(administrator, "categories", "receipt-category"),
      { requiresReceipt: false },
      { merge: true },
    ),
  );
  await assertSucceeds(
    setDoc(doc(administrator, "categories", "optional-free-category"), {
      familyId: "family-a",
      createdBy: users[0].uid,
      requiresReceipt: false,
    }),
  );
});
