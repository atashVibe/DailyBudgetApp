import { createHash, randomUUID } from "node:crypto";
import { Timestamp, FieldPath, AggregateField } from "firebase-admin/firestore";
import {
  ReceiptError,
  identifier,
  millis,
  safeFilename,
  exportPath,
} from "./policy.mjs";
import { validateOriginal } from "./files.mjs";
import { createEntryDraftService, receiptTarget } from "./entry-drafts.mjs";
import { createFamilyContext } from "./family-context.mjs";
const pendingStates = ["prepared", "cleanup_pending", "retained"];
export function publicRecord(record) {
  const result = { ...record };
  for (const field of ["uploadedAt", "updatedAt", "createdAt", "nextAttemptAt"])
    if (result[field]?.toMillis) result[field] = result[field].toMillis();
  delete result.storagePath;
  delete result.sha256;
  return result;
}
export function createReceiptService({
  db,
  bucket,
  auth,
  clock = Date.now,
  deleteObject,
}) {
  const stamp = () => Timestamp.fromMillis(clock());
  const context = createFamilyContext(db, auth, clock);
  const roleRef = (uid) => db.doc(`receiptAccess/${identifier(uid)}`);
  const familyReceipts = async (familyId) =>
    (
      await db.collection("receipts").where("familyId", "==", familyId).get()
    ).docs.map((d) => d.data());
  const familyOperations = async (familyId) =>
    (
      await db
        .collection("receiptOperations")
        .where("familyId", "==", familyId)
        .where("state", "in", pendingStates)
        .get()
    ).docs.map((d) => ({ ...d.data(), id: d.id }));
  const audit = (data) =>
    db.collection("receiptAudit").add({ ...data, createdAt: stamp() });
  async function activeFamily(uid) {
    const familyId = (await db.doc(`users/${identifier(uid)}`).get()).data()
      ?.activeFamilyId;
    if (!familyId)
      throw new ReceiptError(
        403,
        "Choose an active family before using receipts.",
      );
    return identifier(familyId);
  }
  async function getAccess(uid, familyId) {
    return context(familyId || (await activeFamily(uid)), uid);
  }
  async function getUsage(uid, requestedFamilyId) {
    const { familyId } = await getAccess(uid, requestedFamilyId);
    const [receipts, operations] = await Promise.all([
      familyReceipts(familyId),
      familyOperations(familyId),
    ]);
    const live = receipts.filter((r) => r.status === "ready");
    return {
      liveBytes: live.reduce((n, r) => n + r.fileSize, 0),
      reservedBytes: operations.reduce(
        (n, op) => n + (op.cleanupFiles || []).reduce((s, f) => s + f.bytes, 0),
        0,
      ),
      receiptCount: receipts.length,
    };
  }
  async function lock(familyId, operation) {
    identifier(familyId);
    const ref = db.doc(`receiptLocks/${familyId}`),
      token = randomUUID();
    await db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (millis(current.data()?.until) > clock())
        throw new ReceiptError(
          409,
          "Another family receipt action is running. Please retry shortly.",
          "busy",
        );
      tx.set(ref, { token, until: Timestamp.fromMillis(clock() + 5 * 60000) });
    });
    const fence = async (tx) => {
      const current = await tx.get(ref);
      if (
        current.data()?.token !== token ||
        millis(current.data()?.until) <= clock()
      )
        throw new ReceiptError(
          409,
          "This receipt action expired. Please retry.",
          "busy",
        );
    };
    try {
      return await operation(fence);
    } finally {
      await db.runTransaction(async (tx) => {
        const current = await tx.get(ref);
        if (current.data()?.token === token) tx.delete(ref);
      });
    }
  }
  async function accessible(uid, receiptId) {
    const record = (
      await db.doc(`receipts/${identifier(receiptId)}`).get()
    ).data();
    if (!record) throw new ReceiptError(404, "Receipt not found.");
    await getAccess(uid, record.familyId); // Every current member; never another family.
    return record;
  }
  async function expense(uid, transactionId) {
    const target = await receiptTarget(db, uid, transactionId, clock());
    const access = await getAccess(uid, target.entry.familyId);
    return { ...target, access };
  }
  async function removeOriginal(file) {
    if (deleteObject) return deleteObject(file);
    if (process.env.STORAGE_EMULATOR_HOST) {
      await bucket.file(file.storagePath).delete({ ignoreNotFound: true });
      const [exists] = await bucket.file(file.storagePath).exists();
      if (exists) throw new Error("Object deletion could not be verified");
      return { permanent: true, emulator: true };
    }
    const [versions] = await bucket.getFiles({
      prefix: file.storagePath,
      versions: true,
    });
    for (const version of versions.filter((v) => v.name === file.storagePath))
      await version.delete({ ignoreNotFound: true });
    const [remaining] = await bucket.getFiles({
      prefix: file.storagePath,
      versions: true,
    });
    if (remaining.some((v) => v.name === file.storagePath))
      throw new Error("A retained/held version remains");
    const [soft] = await bucket.getFiles({
      prefix: file.storagePath,
      softDeleted: true,
    });
    const retained = soft.filter((v) => v.name === file.storagePath);
    if (retained.length) {
      const [settings] = await bucket.getMetadata();
      const fallback =
        clock() +
        Number(settings.softDeletePolicy?.retentionDurationSeconds || 604800) *
          1000;
      return {
        permanent: false,
        retainedUntil: Math.max(
          ...retained.map(
            (v) => Date.parse(v.metadata.hardDeleteTime || "") || fallback,
          ),
        ),
      };
    }
    return { permanent: true };
  }
  async function cleanOperation(operation, fence) {
    const opRef = db.doc(`receiptOperations/${operation.id}`),
      remaining = [];
    let retainedUntil = 0,
      protectedFiles = 0;
    try {
      const references = await familyReceipts(operation.familyId);
      for (const file of operation.cleanupFiles || []) {
        if (
          references.some(
            (r) => r.status === "ready" && r.storagePath === file.storagePath,
          )
        ) {
          protectedFiles++;
          continue;
        }
        const result = await removeOriginal(file);
        if (!result.permanent) {
          remaining.push(file);
          retainedUntil = Math.max(
            retainedUntil,
            result.retainedUntil || clock() + 86400000,
          );
        }
      }
      await db.runTransaction(async (tx) => {
        await fence(tx);
        const receipt = operation.deleteReceiptId
          ? await tx.get(db.doc(`receipts/${operation.deleteReceiptId}`))
          : null;
        if (!remaining.length && receipt?.data()?.status === "deleting")
          tx.delete(receipt.ref);
        tx.update(opRef, {
          state: remaining.length ? "retained" : "complete",
          cleanupFiles: remaining,
          nextAttemptAt: Timestamp.fromMillis(retainedUntil || clock()),
          verifiedPermanent: !remaining.length && !protectedFiles,
          updatedAt: stamp(),
        });
      });
      await audit({
        familyId: operation.familyId,
        actor: operation.actor || null,
        operationId: operation.id,
        action: operation.reason,
        result: protectedFiles
          ? "live_reference_preserved"
          : remaining.length
            ? "live_deleted_retained_copies"
            : operation.cleanupFiles?.length
              ? "permanent_deletion_verified"
              : "nothing_to_cleanup",
        retainedUntil: retainedUntil || null,
      });
    } catch (error) {
      await opRef.update({
        state: "cleanup_pending",
        nextAttemptAt: Timestamp.fromMillis(clock() + 3600000),
        attempts: (operation.attempts || 0) + 1,
        updatedAt: stamp(),
      });
      await audit({
        familyId: operation.familyId,
        operationId: operation.id,
        action: operation.reason,
        result: "deletion_failed_retry_scheduled",
        errorCode: String(error.code || "cleanup-failed"),
      });
    }
  }
  async function uploadOriginal(
    uid,
    { transactionId, requestId, replaceId, originalFilename, mimeType, bytes },
  ) {
    identifier(transactionId);
    identifier(requestId);
    if (replaceId) identifier(replaceId);
    const initial = await expense(uid, transactionId),
      familyId = initial.access.familyId;
    if (!initial.access.canUpload)
      throw new ReceiptError(
        403,
        "This family needs active Premium or administrator-sponsored receipt access to upload.",
      );
    if (!process.env.STORAGE_EMULATOR_HOST) {
      const [settings] = await bucket.getMetadata();
      if (settings.iamConfiguration?.publicAccessPrevention !== "enforced")
        throw new ReceiptError(
          503,
          "Storage privacy must be configured before uploads.",
          "storage-privacy-not-configured",
        );
    }
    await validateOriginal(bytes, mimeType, initial.access.limits.maxFileBytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return lock(familyId, async (fence) => {
      const { access, entry, draft } = await expense(uid, transactionId);
      if (!access.canUpload)
        throw new ReceiptError(403, "Family receipt upload access has ended.");
      const opRef = db.doc(`receiptOperations/${familyId}_${requestId}`),
        previous = (await opRef.get()).data();
      if (previous) {
        if (
          previous.sha256 !== sha256 ||
          previous.transactionId !== transactionId ||
          (previous.replaceId || null) !== (replaceId || null)
        )
          throw new ReceiptError(
            409,
            "This upload identifier was already used for another file.",
          );
        if (previous.committed)
          return publicRecord(await accessible(uid, previous.receiptId));
        if (previous.state !== "complete" || !previous.verifiedPermanent)
          throw new ReceiptError(
            409,
            "The previous upload is being cleaned up. Retry later.",
            "pending-cleanup",
          );
      }
      const receipts = (await familyReceipts(familyId)).filter(
        (r) => r.status === "ready",
      );
      const old = replaceId ? await accessible(uid, replaceId) : null;
      if (
        old &&
        (old.familyId !== familyId ||
          old.transactionId !== transactionId ||
          old.status !== "ready")
      )
        throw new ReceiptError(409, "This receipt cannot be replaced here.");
      const duplicate = receipts.find(
        (r) => r.transactionId === transactionId && r.sha256 === sha256,
      );
      if (duplicate) {
        if (replaceId && duplicate.receiptId !== replaceId)
          throw new ReceiptError(
            409,
            "That original is already attached. The selected receipt was not changed.",
          );
        return publicRecord(duplicate);
      }
      const usage = await getUsage(uid, familyId);
      if (
        !old &&
        receipts.filter((r) => r.transactionId === transactionId).length >=
          access.limits.maxReceiptsPerTransaction
      )
        throw new ReceiptError(
          409,
          "This transaction has reached its receipt limit.",
        );
      if (!old && usage.receiptCount >= access.limits.maxReceipts)
        throw new ReceiptError(
          413,
          "This family has reached its receipt count limit.",
        );
      if (
        usage.liveBytes + usage.reservedBytes + bytes.length >
        access.limits.maxStorageBytes
      )
        throw new ReceiptError(
          413,
          "This receipt would exceed your family’s storage allowance. Free space or choose a larger plan. Pending uploads and retained copies also count.",
          "storage-quota-exceeded",
        );
      const receiptId = old?.receiptId || randomUUID(),
        storagePath = `receipts/${familyId}/${transactionId}/${receiptId}/${requestId}`;
      const operation = {
        familyId,
        actor: uid,
        transactionId,
        receiptId,
        replaceId: replaceId || null,
        sha256,
        state: "prepared",
        cleanupFiles: [{ storagePath, bytes: bytes.length }],
        reason: "interrupted_upload",
        createdAt: stamp(),
        updatedAt: stamp(),
        nextAttemptAt: Timestamp.fromMillis(clock() + 600000),
      };
      if (previous) await opRef.set(operation);
      else await opRef.create(operation);
      try {
        await bucket.file(storagePath).save(bytes, {
          resumable: false,
          validation: "crc32c",
          metadata: {
            contentType: mimeType,
            cacheControl: "private, no-store",
          },
          preconditionOpts: { ifGenerationMatch: 0 },
        });
        const record = {
          receiptId,
          uploadRequestId: requestId,
          familyId,
          userId: old ? old.userId : uid,
          updatedBy: uid,
          transactionId,
          draft,
          originalFilename: safeFilename(originalFilename),
          storagePath,
          mimeType,
          fileSize: bytes.length,
          sha256,
          uploadedAt: old?.uploadedAt || stamp(),
          updatedAt: stamp(),
          status: "ready",
          transactionDate: entry.date || null,
          merchant:
            typeof entry.merchant === "string"
              ? entry.merchant.slice(0, 200)
              : null,
        };
        await db.runTransaction(async (tx) => {
          await fence(tx);
          const latestEntry = await receiptTarget(
            db,
            uid,
            transactionId,
            clock(),
            tx,
          );
          const current = await context(familyId, uid, tx);
          if (!current.canUpload || latestEntry.entry.familyId !== familyId)
            throw new ReceiptError(
              403,
              "Family membership, entry or upload access changed before saving.",
            );
          if (
            usage.liveBytes + usage.reservedBytes + bytes.length >
            current.limits.maxStorageBytes
          )
            throw new ReceiptError(
              413,
              "Your family allowance changed during upload. Free space or upgrade, then retry.",
              "storage-quota-exceeded",
            );
          tx.set(db.doc(`receipts/${receiptId}`), record);
          tx.set(
            db.doc(`receiptFamilyAccess/${familyId}`),
            {
              hasStorage: true,
              administratorSponsored: current.administratorFamily,
              updatedAt: stamp(),
            },
            { merge: true },
          );
          tx.update(opRef, {
            committed: true,
            state: old ? "cleanup_pending" : "complete",
            cleanupFiles: old
              ? [{ storagePath: old.storagePath, bytes: old.fileSize }]
              : [],
            reason: old ? "replaced_original" : "upload",
            nextAttemptAt: stamp(),
            updatedAt: stamp(),
          });
          tx.create(db.collection("receiptAudit").doc(), {
            familyId,
            actor: uid,
            receiptId,
            action: old ? "receipt_replaced" : "receipt_uploaded",
            result: "saved",
            createdAt: stamp(),
          });
        });
        if (old)
          await cleanOperation(
            { ...(await opRef.get()).data(), id: opRef.id },
            fence,
          );
        return publicRecord(record);
      } catch (error) {
        const latest = (await opRef.get()).data();
        if (latest.committed)
          await cleanOperation({ ...latest, id: opRef.id }, fence);
        else
          await opRef.update({
            state: "prepared",
            nextAttemptAt: Timestamp.fromMillis(clock() + 600000),
            updatedAt: stamp(),
          });
        throw error;
      }
    });
  }
  async function upload(uid, details) {
    try {
      return await uploadOriginal(uid, details);
    } catch (error) {
      try {
        const access = await getAccess(uid);
        await audit({
          familyId: access.familyId,
          actor: uid,
          action: "receipt_upload",
          result: "upload_failed",
          errorCode:
            error instanceof ReceiptError ? error.code : "storage-failed",
          status: error instanceof ReceiptError ? error.status : 503,
        });
      } catch {
        /* Logging must not hide the original upload result. */
      }
      throw error;
    }
  }
  async function queueDeletion(record, reason, fence, actor) {
    if (record.status === "deleting") return;
    const ref = db.collection("receiptOperations").doc();
    const operation = {
      familyId: record.familyId,
      actor: actor || null,
      receiptId: record.receiptId,
      deleteReceiptId: record.receiptId,
      state: "cleanup_pending",
      reason,
      cleanupFiles: [
        { storagePath: record.storagePath, bytes: record.fileSize },
      ],
      createdAt: stamp(),
      updatedAt: stamp(),
      nextAttemptAt: stamp(),
    };
    const queued = await db.runTransaction(async (tx) => {
      await fence(tx);
      const latest = await tx.get(db.doc(`receipts/${record.receiptId}`));
      const access = await context(record.familyId, actor, tx);
      if (!latest.exists || latest.data().status !== "ready") return false;
      if (reason === "grace_expired" && !access.expired) return false;
      if (reason === "family_closed" && !access.closed) return false;
      if (reason === "sole_member_account_deletion" && access.memberCount !== 1)
        return false;
      tx.update(latest.ref, { status: "deleting", updatedAt: stamp() });
      tx.create(ref, operation);
      return true;
    });
    if (queued) await cleanOperation({ ...operation, id: ref.id }, fence);
  }
  async function deleteReceipt(uid, receiptId) {
    let record;
    try {
      record = await accessible(uid, receiptId);
    } catch (error) {
      if (error.status === 404) return { accepted: true };
      throw error;
    }
    return lock(record.familyId, async (fence) => {
      await queueDeletion(record, "family_member_deleted_receipt", fence, uid);
      return { accepted: true };
    });
  }
  async function readFile(uid, receiptId) {
    const record = await accessible(uid, receiptId),
      access = await getAccess(uid, record.familyId);
    if (!access.canRead)
      throw new ReceiptError(
        403,
        "This family's receipt download access has ended.",
      );
    if (record.status !== "ready")
      throw new ReceiptError(409, "This receipt is awaiting deletion.");
    return { record, file: bucket.file(record.storagePath) };
  }
  async function exportReceipts(uid) {
    const access = await getAccess(uid);
    if (!access.canRead)
      throw new ReceiptError(
        403,
        "This family's receipt export access has ended.",
      );
    const receipts = (await familyReceipts(access.familyId)).filter(
        (r) => r.status === "ready" && !r.draft,
      ),
      entries = new Map();
    for (const receipt of receipts) {
      if (!entries.has(receipt.transactionId))
        entries.set(
          receipt.transactionId,
          (await db.doc(`entries/${receipt.transactionId}`).get()).data(),
        );
      const entry = entries.get(receipt.transactionId);
      if (entry?.familyId === access.familyId) {
        receipt.transactionDate = entry.date || receipt.transactionDate;
        receipt.merchant =
          typeof entry.merchant === "string"
            ? entry.merchant.slice(0, 200)
            : receipt.merchant;
      }
    }
    return receipts.map((record) => ({
      record,
      file: bucket.file(record.storagePath),
      path: exportPath(record),
    }));
  }
  async function downgradeReview(uid, preference) {
    if (!["newest", "oldest"].includes(preference))
      throw new ReceiptError(400, "Choose newest or oldest receipts to keep.");
    const access = await getAccess(uid);
    const membership = (
      await db.doc(`familyMembers/${access.familyId}_${uid}`).get()
    ).data();
    if (membership?.role !== "admin")
      throw new ReceiptError(
        403,
        "Only a current family administrator can review downgrade storage.",
      );
    if (!access.canRead || !access.downgradeUploadBlocked)
      throw new ReceiptError(
        409,
        "There is no downloadable downgrade review for this family.",
      );
    const [all, usage] = await Promise.all([
      familyReceipts(access.familyId),
      getUsage(uid),
    ]);
    const records = all
      .filter((r) => r.status === "ready" && !r.draft)
      .sort(
        (a, b) =>
          (millis(a.uploadedAt) - millis(b.uploadedAt)) *
            (preference === "oldest" ? 1 : -1) ||
          a.receiptId.localeCompare(b.receiptId),
      );
    const draftBytes = all
      .filter((r) => r.status === "ready" && r.draft)
      .reduce((sum, r) => sum + r.fileSize, 0);
    let remaining = Math.max(
      0,
      access.limits.maxStorageBytes - usage.reservedBytes - draftBytes,
    );
    const keep = [],
      extras = [];
    for (const record of records) {
      if (record.fileSize <= remaining) {
        keep.push(record);
        remaining -= record.fileSize;
      } else extras.push(record);
    }
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          familyId: access.familyId,
          quota: access.limits.maxStorageBytes,
          reserved: usage.reservedBytes,
          draftBytes,
          preference,
          records: records.map((r) => [
            r.receiptId,
            r.storagePath,
            r.fileSize,
            millis(r.updatedAt),
          ]),
        }),
      )
      .digest("hex");
    const exportParts = [];
    let part = [],
      partBytes = 0;
    for (const extra of extras) {
      if (part.length && partBytes + extra.fileSize > 50_000_000) {
        exportParts.push(part);
        part = [];
        partBytes = 0;
      }
      part.push(extra.receiptId);
      partBytes += extra.fileSize;
    }
    if (part.length) exportParts.push(part);
    return {
      exportParts,
      preference,
      fingerprint,
      keep: keep.map(publicRecord),
      extras: extras.map(publicRecord),
      extraBytes: extras.reduce((sum, r) => sum + r.fileSize, 0),
      keptBytes: keep.reduce((sum, r) => sum + r.fileSize, 0),
      retainedBytes: usage.reservedBytes,
    };
  }
  async function removeDowngradeExtras(
    uid,
    { preference, fingerprint, downloadConfirmed },
  ) {
    if (downloadConfirmed !== true)
      throw new ReceiptError(
        400,
        "Download and check the extra receipt files before confirming removal.",
      );
    const { familyId } = await getAccess(uid);
    return lock(familyId, async (fence) => {
      const review = await downgradeReview(uid, preference);
      if (review.fingerprint !== fingerprint)
        throw new ReceiptError(
          409,
          "Your receipts or allowance changed. Review and download the extras again.",
          "review-changed",
        );
      let removed = 0;
      for (const extra of review.extras) {
        await queueDeletion(
          await accessible(uid, extra.receiptId),
          "downgrade_selected",
          fence,
          uid,
        );
        removed++;
      }
      return { removed, pendingCleanup: true };
    });
  }
  async function requireAdmin(uid, tx) {
    const snap = tx ? await tx.get(roleRef(uid)) : await roleRef(uid).get();
    if (snap.data()?.administrator !== true)
      throw new ReceiptError(
        403,
        "Global receipt administrator access required.",
      );
  }
  async function setAccess(actor, target, action, details = {}) {
    identifier(target);
    await requireAdmin(actor);
    if (["grant-admin", "revoke-admin"].includes(action)) {
      try {
        await auth.getUser(target);
      } catch {
        throw new ReceiptError(404, "That account ID could not be verified.");
      }
      if (actor === target && action === "revoke-admin")
        throw new ReceiptError(
          409,
          "Ask another receipt administrator to revoke your access.",
        );
      await db.runTransaction(async (tx) => {
        await requireAdmin(actor, tx);
        tx.set(
          roleRef(target),
          { administrator: action === "grant-admin", updatedAt: stamp() },
          { merge: true },
        );
        tx.create(db.collection("receiptAudit").doc(), {
          actor,
          userId: target,
          action,
          result: "access_updated",
          createdAt: stamp(),
        });
      });
      return { administrator: action === "grant-admin" };
    }
    const familyId = target;
    if (!(await db.doc(`families/${familyId}`).get()).exists)
      throw new ReceiptError(404, "That family ID was not found.");
    return lock(familyId, async (fence) => {
      await db.runTransaction(async (tx) => {
        await fence(tx);
        await requireAdmin(actor, tx);
        const ref = db.doc(`receiptFamilyAccess/${familyId}`),
          current = (await tx.get(ref)).data();
        if (["google", "apple"].includes(current?.billingSource))
          throw new ReceiptError(
            409,
            "This is a store-verified subscription. Manage it in its original app store; administrative grants cannot change its billing.",
          );
        let update;
        if (action === "activate-premium" || action === "activate-archive")
          update = {
            plan: action === "activate-premium" ? "premium" : "archive",
            billingSource: "manual",
            downgradeUploadBlocked: false,
            downgradeDownloadUntil: null,
            subscriptionStatus: "active",
            graceUntil: null,
            paidThrough: null,
            subscriptionInterval: ["monthly", "yearly"].includes(
              details.interval,
            )
              ? details.interval
              : null,
          };
        else if (action === "cancel")
          update = {
            subscriptionStatus: "canceled",
            graceUntil:
              current?.subscriptionStatus === "canceled" && current.graceUntil
                ? current.graceUntil
                : Timestamp.fromMillis(clock() + 30 * 86400000),
          };
        else throw new ReceiptError(400, "Unknown family plan action.");
        tx.set(ref, { ...update, updatedAt: stamp() }, { merge: true });
        tx.create(db.collection("receiptAudit").doc(), {
          actor,
          familyId,
          action,
          result: "family_plan_updated",
          createdAt: stamp(),
        });
      });
      return context(familyId);
    });
  }
  async function setCategoryRequirement(
    uid,
    { familyId, categoryId, required, create } = {},
  ) {
    identifier(familyId);
    identifier(categoryId);
    if (typeof required !== "boolean")
      throw new ReceiptError(400, "Choose whether a receipt is required.");
    if (
      create &&
      (typeof create.name !== "string" ||
        !create.name.trim() ||
        create.name.trim().length > 200 ||
        !["expense", "income", "refund", "cashback"].includes(create.type))
    )
      throw new ReceiptError(400, "Choose a valid category name and type.");
    if (create) identifier(create.budgetAreaId);
    return lock(familyId, async (fence) =>
      db.runTransaction(async (tx) => {
        await fence(tx);
        const ref = db.doc(`categories/${categoryId}`);
        const [category, membership, area] = await Promise.all([
          tx.get(ref),
          tx.get(db.doc(`familyMembers/${familyId}_${uid}`)),
          create
            ? tx.get(db.doc(`budgetAreas/${create.budgetAreaId}`))
            : Promise.resolve(null),
        ]);
        const access = await context(familyId, uid, tx);
        if (
          membership.data()?.status !== "active" ||
          membership.data()?.role !== "admin"
        )
          throw new ReceiptError(
            403,
            "Only a family administrator can change category requirements.",
          );
        if (required && !access.canUpload)
          throw new ReceiptError(
            403,
            "Your family needs Premium receipt upload access before receipts can be required.",
          );
        if (create) {
          if (category.exists)
            throw new ReceiptError(
              409,
              "This category was already created. Refresh your categories.",
            );
          if (
            !area?.exists ||
            area.data().familyId !== familyId ||
            area.data().isArchived === true
          )
            throw new ReceiptError(
              400,
              "Choose an active budget area in this family.",
            );
          const data = {
            familyId,
            budgetAreaId: create.budgetAreaId,
            name: create.name.trim(),
            type: create.type,
            isDefault: false,
            isArchived: false,
            requiresReceipt: required,
            createdBy: uid,
            createdAt: stamp(),
          };
          tx.create(ref, data);
          return { id: categoryId, ...publicRecord(data) };
        }
        if (!category.exists || category.data().familyId !== familyId)
          throw new ReceiptError(404, "Category not found in this family.");
        tx.update(ref, { requiresReceipt: required });
        return { id: categoryId, requiresReceipt: required };
      }),
    );
  }
  async function purgeAccount(uid) {
    await entryDrafts.purgeDrafts(uid);
    // Leaving/deleting an account must not erase other members' shared files.
    const memberships = await db
      .collection("familyMembers")
      .where("userId", "==", uid)
      .get();
    for (const familyId of new Set(
      memberships.docs.map((d) => d.data().familyId),
    )) {
      await lock(familyId, async (fence) => {
        const access = await context(familyId);
        if (!access.closed && access.memberCount === 1) {
          try {
            await getAccess(uid, familyId);
          } catch {
            return;
          }
          for (const record of await familyReceipts(familyId))
            await queueDeletion(
              record,
              "sole_member_account_deletion",
              fence,
              uid,
            );
        }
      });
    }
    const [uploaded, updated] = await Promise.all([
      db.collection("receipts").where("userId", "==", uid).get(),
      db.collection("receipts").where("updatedBy", "==", uid).get(),
    ]);
    const records = new Map(
      [...uploaded.docs, ...updated.docs].map((d) => [d.id, d]),
    );
    for (const record of records.values()) {
      await lock(record.data().familyId, async (fence) => {
        await db.runTransaction(async (tx) => {
          await fence(tx);
          const current = await tx.get(record.ref);
          if (!current.exists) return;
          const fields = {};
          if (current.data().userId === uid) fields.userId = null;
          if (current.data().updatedBy === uid) fields.updatedBy = null;
          if (Object.keys(fields).length)
            tx.update(record.ref, { ...fields, updatedAt: stamp() });
        });
      });
    }
    return {
      accepted: true,
      message:
        "Shared receipts remain for other family members; sole-member family originals are submitted for deletion.",
    };
  }
  async function maintain() {
    await entryDrafts.cleanDrafts();
    const jobs = await db
      .collection("receiptOperations")
      .where("state", "in", pendingStates)
      .where("nextAttemptAt", "<=", stamp())
      .orderBy("nextAttemptAt")
      .limit(100)
      .get();
    for (const snapshot of jobs.docs) {
      try {
        await lock(snapshot.data().familyId, (fence) =>
          cleanOperation({ ...snapshot.data(), id: snapshot.id }, fence),
        );
      } catch (error) {
        if (error.code !== "busy")
          await audit({
            operationId: snapshot.id,
            action: "maintenance",
            result: "retry_pending",
            errorCode: String(error.code || "failed"),
          });
      }
    }
    const cursor = db.doc("receiptMaintenance/cursor");
    let last = (await cursor.get()).data()?.lastFamily;
    for (let page = 0; page < 5; page++) {
      let query = db
        .collection("receiptFamilyAccess")
        .orderBy(FieldPath.documentId())
        .limit(100);
      if (last) query = query.startAfter(last);
      const families = await query.get();
      if (families.empty) {
        last = null;
        break;
      }
      for (const family of families.docs) {
        try {
          await lock(family.id, async (fence) => {
            const access = await context(family.id);
            if (!access.closed && !access.expired) return;
            for (const record of await familyReceipts(family.id))
              await queueDeletion(
                record,
                access.closed ? "family_closed" : "grace_expired",
                fence,
              );
          });
        } catch (error) {
          await audit({
            familyId: family.id,
            action: "retention",
            result: "retry_pending",
            errorCode: String(error.code || "failed"),
          });
        }
      }
      last = families.docs.at(-1).id;
      if (families.size < 100) {
        last = null;
        break;
      }
    }
    await cursor.set({ lastFamily: last, updatedAt: stamp() });
  }
  async function adminStats(uid) {
    await requireAdmin(uid);
    const [families, roles, totals, failures, config, metadata] =
      await Promise.all([
        db.collection("receiptFamilyAccess").get(),
        db
          .collection("receiptAccess")
          .where("administrator", "==", true)
          .count()
          .get(),
        db
          .collection("receipts")
          .where("status", "==", "ready")
          .aggregate({
            count: AggregateField.count(),
            bytes: AggregateField.sum("fileSize"),
          })
          .get(),
        db
          .collection("receiptAudit")
          .where("result", "==", "deletion_failed_retry_scheduled")
          .orderBy("createdAt", "desc")
          .limit(20)
          .get(),
        db.doc("receiptConfig/global").get(),
        process.env.STORAGE_EMULATOR_HOST
          ? Promise.resolve([
              { location: "EMULATOR", storageClass: "EMULATOR" },
            ])
          : bucket.getMetadata(),
      ]);
    const counts = {
        premium: 0,
        archive: 0,
        administrator: roles.data().count,
        awaitingDeletion: 0,
      },
      deadlines = [];
    for (const family of families.docs) {
      const access = await context(family.id);
      if (access.active && access.plan === "premium") counts.premium++;
      if (access.active && access.plan === "archive") counts.archive++;
      if (access.deletionScheduledAt) {
        counts.awaitingDeletion++;
        deadlines.push({
          familyId: family.id,
          deletionScheduledAt: access.deletionScheduledAt,
        });
      }
    }
    const settings = metadata[0];
    let totalStoredBytes = 0,
      storedCopies = 0,
      mixedStorageClasses = false;
    for (const mode of process.env.STORAGE_EMULATOR_HOST
      ? [{}]
      : [{ versions: true }, { softDeleted: true }]) {
      let pageToken;
      do {
        const [files, next] = await bucket.getFiles({
          prefix: "receipts/",
          maxResults: 1000,
          autoPaginate: false,
          ...mode,
          ...(pageToken ? { pageToken } : {}),
        });
        for (const file of files) {
          totalStoredBytes += Number(file.metadata.size || 0);
          storedCopies++;
          if (
            file.metadata.storageClass &&
            file.metadata.storageClass !== settings.storageClass
          )
            mixedStorageClasses = true;
        }
        pageToken = next?.pageToken;
      } while (pageToken);
    }
    const [allReceipts, allOperations, uploadFailures] = await Promise.all([
      db.collection("receipts").get(),
      db
        .collection("receiptOperations")
        .where("state", "in", pendingStates)
        .get(),
      db
        .collection("receiptAudit")
        .where("result", "==", "upload_failed")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get(),
    ]);
    const perFamily = [],
      perUploader = new Map(),
      subscribers = { premium: 0, premium_plus: 0, premium_pro: 0, trials: 0 };
    for (const family of families.docs) {
      const access = await context(family.id);
      const live = allReceipts.docs
        .map((d) => d.data())
        .filter((r) => r.familyId === family.id && r.status === "ready");
      const reserved = allOperations.docs
        .map((d) => d.data())
        .filter((o) => o.familyId === family.id)
        .reduce(
          (sum, o) =>
            sum + (o.cleanupFiles || []).reduce((n, f) => n + f.bytes, 0),
          0,
        );
      const liveBytes = live.reduce((sum, r) => sum + r.fileSize, 0),
        chargedBytes = liveBytes + reserved;
      perFamily.push({
        familyId: family.id,
        plan: access.plan,
        billingSource: access.billingSource,
        active: access.active,
        liveBytes,
        reservedBytes: reserved,
        quotaBytes: access.limits.maxStorageBytes,
        overQuota: chargedBytes > access.limits.maxStorageBytes,
        receiptCount: live.length,
      });
      if (access.active && ["google", "apple"].includes(access.billingSource)) {
        if (access.trial) subscribers.trials++;
        else if (Object.hasOwn(subscribers, access.plan))
          subscribers[access.plan]++;
      }
      for (const r of live) {
        const id = r.userId || "removed-account";
        const value = perUploader.get(id) || {
          userId: id,
          bytes: 0,
          receiptCount: 0,
        };
        value.bytes += r.fileSize;
        value.receiptCount++;
        perUploader.set(id, value);
      }
    }
    const rate = config.data()?.pricing;
    const matched =
      !mixedStorageClasses &&
      rate &&
      rate.region?.toUpperCase() === settings.location?.toUpperCase() &&
      rate.storageClass === settings.storageClass &&
      Number.isFinite(rate.usdPerGiBMonth) &&
      rate.usdPerGiBMonth >= 0;
    return {
      perFamily,
      perUploader: [...perUploader.values()],
      verifiedSubscribers: subscribers,
      monthlySubscriptionRevenueUSD: null,
      revenueNotice:
        "Net revenue and fees must be read from Google Play/Apple financial reports. Catalog prices, trials and manual grants are not revenue.",
      failedUploads: uploadFailures.docs.map((d) => publicRecord(d.data())),
      receiptCount: totals.data().count,
      liveBytes: totals.data().bytes,
      totalStoredBytes,
      storedCopies,
      retainedOrPendingBytes: Math.max(
        0,
        totalStoredBytes - totals.data().bytes,
      ),
      counts,
      deadlines: deadlines
        .sort((a, b) => a.deletionScheduledAt - b.deletionScheduledAt)
        .slice(0, 50),
      failedDeletions: failures.docs.map((d) => publicRecord(d.data())),
      bucket: {
        location: settings.location,
        storageClass: settings.storageClass,
        softDeletePolicy: settings.softDeletePolicy || null,
        versioning: settings.versioning || null,
        retentionPolicy: settings.retentionPolicy || null,
      },
      estimatedStorageUSD: matched
        ? (totalStoredBytes / 1024 ** 3) * rate.usdPerGiBMonth
        : null,
      pricing: matched ? rate : null,
      estimateNotice:
        "Actual family receipt objects, including retained versions. Storage-only estimate before allowances; excludes requests, downloads, compute, database, backups and taxes. Verify regional pricing. Large inventories can take time to scan.",
    };
  }
  const entryDrafts = createEntryDraftService({
    db,
    clock,
    context,
    lock,
    queueDeletion,
  });
  return {
    setCategoryRequirement,
    startDraft: entryDrafts.startDraft,
    finalizeDraft: entryDrafts.finalizeDraft,
    getAccess,
    getUsage,
    upload,
    deleteReceipt,
    readFile,
    exportReceipts,
    setAccess,
    purgeAccount,
    maintain,
    adminStats,
    requireAdmin,
    withFamilyLock: lock,
    downgradeReview,
    removeDowngradeExtras,
    list: async (uid, transactionId) => {
      const { familyId } = await getAccess(uid);
      return (await familyReceipts(familyId))
        .filter(
          (r) =>
            (!r.draft || transactionId) &&
            (!transactionId || r.transactionId === transactionId),
        )
        .map(publicRecord);
    },
  };
}
