export const DAY = 86400000;
export const DEFAULT_LIMITS = Object.freeze({
  maxFileBytes: 10 * 1024 * 1024,
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
export function permissions(access = {}, now = Date.now(), configuration = {}) {
  const administrator = access.administrator === true;
  const plan = ["premium", "archive"].includes(access.plan)
    ? access.plan
    : "free";
  const paidThrough = millis(access.paidThrough);
  const active =
    access.subscriptionStatus === "active" &&
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
  const limits = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(limits)) {
    if (Number.isSafeInteger(configured[key]) && configured[key] > 0)
      limits[key] = configured[key];
  }
  // The HTTP gateway has a fixed safety ceiling regardless of plan configuration.
  limits.maxFileBytes = Math.min(limits.maxFileBytes, 25 * 1024 * 1024);
  if (tier === "free") limits.maxStorageBytes = 0;
  return {
    administrator,
    plan,
    tier,
    active,
    canUpload: administrator || (active && plan === "premium"),
    canRead: administrator || active || grace,
    canReplace: administrator || (active && plan === "premium"),
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
