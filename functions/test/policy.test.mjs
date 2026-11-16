import assert from "node:assert/strict";
import test from "node:test";
import { DAY, permissions, safeFilename, exportPath } from "../src/policy.mjs";
const now = Date.UTC(2026, 10, 16);
test("free and family-admin users cannot upload", () => {
  for (const access of [{}, { role: "admin" }, { administrator: "true" }]) {
    const p = permissions(access, now);
    assert.equal(p.canUpload, false);
    assert.equal(p.canRead, false);
    assert.equal(p.canDelete, true);
  }
});
test("receipt administrators are not converted to premium subscribers", () => {
  const p = permissions(
    { administrator: true, plan: "free", graceUntil: now - DAY },
    now,
  );
  assert.equal(p.plan, "free");
  assert.equal(p.tier, "administrator");
  assert.equal(p.canUpload, true);
  assert.equal(p.expired, false);
});
test("cancellation blocks uploads immediately but allows 30-day export", () => {
  const access = {
    plan: "premium",
    subscriptionStatus: "canceled",
    graceUntil: now + 30 * DAY,
  };
  assert.equal(permissions(access, now).canUpload, false);
  assert.equal(permissions(access, now + 29 * DAY).canRead, true);
  assert.equal(permissions(access, now + 30 * DAY).canRead, false);
  assert.equal(permissions(access, now + 30 * DAY).expired, true);
});
test("archive and renewal prevent expiration deletion", () => {
  for (const plan of ["archive", "premium"]) {
    const p = permissions(
      { plan, subscriptionStatus: "active", graceUntil: now - DAY },
      now,
    );
    assert.equal(p.expired, false);
    assert.equal(p.canRead, true);
    assert.equal(p.canUpload, plan === "premium");
  }
});
test("a lapsed paid-through date supplies a bounded grace period", () => {
  const access = {
    plan: "premium",
    subscriptionStatus: "active",
    paidThrough: now - DAY,
  };
  assert.equal(permissions(access, now).canUpload, false);
  assert.equal(permissions(access, now).canRead, true);
  assert.equal(permissions(access, now + 30 * DAY).expired, true);
});
test("unsafe filenames cannot escape tax-year export folders", () => {
  assert.equal(safeFilename("../../private.pdf"), "private.pdf");
  assert.equal(
    exportPath({
      transactionDate: "2026-11-16",
      transactionId: "entry",
      receiptId: "receipt",
      originalFilename: "../a.pdf",
    }),
    "2026/entry/receipt-a.pdf",
  );
});
