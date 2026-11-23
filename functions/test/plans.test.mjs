import assert from "node:assert/strict";
import test from "node:test";
import { planCatalog, FILE_LIMIT } from "../src/plans.mjs";
import { permissions, DAY } from "../src/policy.mjs";
const now = Date.UTC(2026, 10, 22);
test("family catalog has the proposed USD prices, rounded annual discount, shared quotas and Premium-only trial", () => {
  const catalog = planCatalog();
  assert.deepEqual(
    catalog.plans.map((p) => [
      p.id,
      p.monthlyCents,
      p.yearlyCents,
      p.storageBytes,
      p.trialMonths,
    ]),
    [
      ["free", 0, 0, 0, 0],
      ["premium", 499, 5090, 2e9, 1],
      ["premium_plus", 899, 9170, 5e9, 0],
      ["premium_pro", 1499, 15290, 20e9, 0],
    ],
  );
  for (const p of catalog.plans.slice(1)) {
    const permission = permissions(
      { plan: p.id, subscriptionStatus: "active", paidThrough: now + DAY },
      now,
    );
    assert.equal(permission.canUpload, true);
    assert.equal(permission.limits.maxStorageBytes, p.storageBytes);
    assert.equal(permission.limits.maxFileBytes, FILE_LIMIT);
  }
});
test("trusted configuration changes proposals/quotas without allowing invalid numbers or a larger file ceiling", () => {
  const config = {
    yearlyDiscountBps: 2000,
    plans: {
      premium: { monthlyCents: 699, storageBytes: 3e9 },
      free: { storageBytes: 999 },
      premium_pro: { monthlyCents: NaN, storageBytes: -1 },
    },
  };
  assert.equal(planCatalog(config).plans[1].yearlyCents, 6710);
  assert.equal(planCatalog(config).plans[0].storageBytes, 0);
  assert.equal(planCatalog(config).plans[3].storageBytes, 20e9);
  const p = permissions(
    { plan: "premium", subscriptionStatus: "active" },
    now,
    { premium: { maxFileBytes: 999999999 } },
    config,
  );
  assert.equal(p.limits.maxStorageBytes, 3e9);
  assert.equal(p.limits.maxFileBytes, FILE_LIMIT);
});
test("paid cancellation preserves access until period end, then starts a fixed 30-day grace", () => {
  const access = {
    plan: "premium_plus",
    subscriptionStatus: "canceled",
    paidThrough: now + 5 * DAY,
    willRenew: false,
  };
  assert.equal(permissions(access, now).canUpload, true);
  assert.equal(permissions(access, now).willRenew, false);
  assert.equal(permissions(access, now + 5 * DAY).canUpload, false);
  assert.equal(permissions(access, now + 34 * DAY).canRead, true);
  assert.equal(permissions(access, now + 35 * DAY).expired, true);
});
test("expired trials and unrecognized plans cannot obtain uploads", () => {
  assert.equal(
    permissions(
      {
        plan: "premium",
        subscriptionStatus: "trialing",
        paidThrough: now + DAY,
      },
      now,
    ).trial,
    true,
  );
  assert.equal(
    permissions(
      {
        plan: "premium",
        subscriptionStatus: "trialing",
        paidThrough: now - DAY,
      },
      now,
    ).canUpload,
    false,
  );
  assert.equal(
    permissions({ plan: "hacked", subscriptionStatus: "active" }, now)
      .canUpload,
    false,
  );
});
