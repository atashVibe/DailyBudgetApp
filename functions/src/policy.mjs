import { FILE_LIMIT, PAID_PLANS, planCatalog, planName } from "./plans.mjs";
export const DAY = 86400000;
export const DEFAULT_LIMITS = Object.freeze({
  maxFileBytes: FILE_LIMIT,
  maxReceiptsPerTransaction: 2,
  maxStorageBytes: 100 * 1024 * 1024,
  maxReceipts: 2000,
});

export class ReceiptError extends Error {
  constructor(status, message, code = "receipt-error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function identifier(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new ReceiptError(400, "Invalid identifier.");
  }
  return value;
}

export function millis(value) {
  if (!value) return 0;
  return typeof value.toMillis === "function"
    ? value.toMillis()
    : Number(value);
}

// A family administrator is deliberately NOT a receipt administrator.
export function permissions(
  access = {},
  now = Date.now(),
  configuration = {},
  catalogConfig = {},
) {
  const administrator = access.administrator === true;
  const plan = [...PAID_PLANS, "archive"].includes(access.plan)
    ? access.plan
    : "free";
  const paidThrough = millis(access.paidThrough);
  const active =
    (["active", "trialing"].includes(access.subscriptionStatus) ||
      (access.subscriptionStatus === "canceled" && paidThrough > now)) &&
    (!paidThrough || now < paidThrough);
  const deadline =
    millis(access.graceUntil) ||
    (paidThrough && now >= paidThrough ? paidThrough + 30 * DAY : 0);
  const grace = !active && deadline > now;
  const tier = administrator
    ? "administrator"
    : active
      ? plan
      : grace
        ? "grace"
        : "free";
  const configured = configuration[tier === "grace" ? "premium" : tier] || {};
  const catalog = planCatalog(catalogConfig);
  const allowance = catalog.plans.find(
    (p) =>
      p.id === (tier === "grace" || (administrator && active) ? plan : tier),
  );
  const limits = {
    ...DEFAULT_LIMITS,
    maxStorageBytes: allowance?.storageBytes ?? DEFAULT_LIMITS.maxStorageBytes,
  };
  for (const key of Object.keys(limits)) {
    if (Number.isSafeInteger(configured[key]) && configured[key] > 0)
      limits[key] = configured[key];
  }
  // The HTTP gateway has a fixed safety ceiling regardless of plan configuration.
  limits.maxFileBytes = Math.min(limits.maxFileBytes, FILE_LIMIT);
  if (tier === "free") limits.maxStorageBytes = 0;
  return {
    administrator,
    plan,
    planName: planName(plan),
    subscriptionStatus: access.subscriptionStatus || "none",
    paidThrough: paidThrough || null,
    willRenew:
      active &&
      access.subscriptionStatus !== "canceled" &&
      access.willRenew !== false,
    billingSource: access.billingSource || "manual",
    interval: access.subscriptionInterval || null,
    trial: active && access.subscriptionStatus === "trialing",
    downgradeDownloadUntil: millis(access.downgradeDownloadUntil) || null,
    downgradeUploadBlocked: access.downgradeUploadBlocked === true,
    tier,
    active,
    canUpload:
      administrator ||
      (active &&
        PAID_PLANS.includes(plan) &&
        access.downgradeUploadBlocked !== true),
    canRead: administrator || active || grace,
    canReplace:
      administrator ||
      (active &&
        PAID_PLANS.includes(plan) &&
        access.downgradeUploadBlocked !== true),
    canDelete: true, // Current family members retain deletion rights regardless of payment.
    deletionScheduledAt:
      !administrator && !active && deadline ? deadline : null,
    expired: !administrator && !active && Boolean(deadline) && now >= deadline,
    limits,
  };
}

export function safeFilename(name) {
  const value = String(name || "receipt")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 180);
  return value && value !== "." && value !== ".." ? value : "receipt";
}

export function exportPath(receipt) {
  const year = /^\d{4}-\d{2}-\d{2}$/.test(receipt.transactionDate || "")
    ? receipt.transactionDate.slice(0, 4)
    : "undated";
  return `${year}/${identifier(receipt.transactionId)}/${identifier(receipt.receiptId)}-${safeFilename(receipt.originalFilename)}`;
}
