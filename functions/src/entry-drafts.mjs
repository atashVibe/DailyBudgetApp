import { Timestamp } from "firebase-admin/firestore";
import { ReceiptError, identifier, millis, DAY } from "./policy.mjs";

const types = ["expense", "income", "refund", "cashback"];

// Drafts are separate from entries: an interrupted upload never changes a budget.
export async function receiptTarget(db, uid, id, now, tx) {
  identifier(id);
  const get = (ref) => (tx ? tx.get(ref) : ref.get());
  const entry = await get(db.doc(`entries/${id}`));
  if (entry.exists && types.includes(entry.data().type))
    return { entry: entry.data(), draft: false };
  const draft = (await get(db.doc(`receiptEntryDrafts/${id}`))).data();
  if (!draft || draft.userId !== uid)
    throw new ReceiptError(403, "Choose an entry to attach receipts.");
  if (draft.status !== "open" || millis(draft.expiresAt) <= now)
    throw new ReceiptError(
      410,
      "This unfinished entry has expired. Start a new entry.",
    );
  return { entry: { ...draft, type: "expense" }, draft: true };
}

function entryFields(input) {
  identifier(input.categoryId);
  identifier(input.budgetAreaId);
  if (
    typeof input.amount !== "number" ||
    !Number.isFinite(input.amount) ||
    input.amount < 0 ||
    !Number.isSafeInteger(Math.round(input.amount * 100))
  )
    throw new ReceiptError(400, "Enter a valid amount.");
  if (
    typeof input.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !Number.isFinite(Date.parse(input.date)) ||
    new Date(input.date).toISOString().slice(0, 10) !== input.date
  )
    throw new ReceiptError(400, "Choose a valid date.");
  if (typeof input.note !== "string" || input.note.length > 10000)
    throw new ReceiptError(400, "The note is too long.");
  return {
    amount: input.amount,
    categoryId: input.categoryId,
    budgetAreaId: input.budgetAreaId,
    date: input.date,
    note: input.note,
  };
}

export function createEntryDraftService({
  db,
  clock,
  context,
  lock,
  queueDeletion,
}) {
  const stamp = () => Timestamp.fromMillis(clock());
  async function startDraft(uid, { familyId, draftId }) {
    identifier(familyId);
    identifier(draftId);
    return lock(familyId, async (fence) => {
      return db.runTransaction(async (tx) => {
        await fence(tx);
        const ref = db.doc(`receiptEntryDrafts/${draftId}`);
        const [draft, entry, openDrafts] = await Promise.all([
          tx.get(ref),
          tx.get(db.doc(`entries/${draftId}`)),
          tx.get(
            db
              .collection("receiptEntryDrafts")
              .where("familyId", "==", familyId)
              .where("status", "==", "open"),
          ),
        ]);
        const access = await context(familyId, uid, tx);
        if (entry.exists) {
          if (
            entry.data().userId === uid &&
            entry.data().familyId === familyId &&
            entry.data().receiptSubmissionId === draftId
          )
            return { draftId, committed: true };
          throw new ReceiptError(
            409,
            "That entry identifier is already in use.",
          );
        }
        if (draft.exists) {
          if (draft.data().userId !== uid || draft.data().familyId !== familyId)
            throw new ReceiptError(
              403,
              "This unfinished entry belongs to another member.",
            );
          if (
            draft.data().status !== "open" ||
            millis(draft.data().expiresAt) <= clock()
          )
            throw new ReceiptError(
              410,
              "This unfinished entry has expired. Start a new entry.",
            );
          return { draftId };
        }
        if (!access.canUpload)
          throw new ReceiptError(
            403,
            "Your family needs receipt upload access to attach a file.",
          );
        if (openDrafts.size >= 25)
          throw new ReceiptError(
            409,
            "Your family has too many unfinished receipt entries. Finish an existing entry or retry after its draft expires.",
          );
        tx.create(ref, {
          familyId,
          userId: uid,
          status: "open",
          createdAt: stamp(),
          expiresAt: Timestamp.fromMillis(clock() + DAY),
        });
        return { draftId };
      });
    });
  }
  async function finalizeDraft(uid, { draftId, entry: input }) {
    identifier(draftId);
    const fields = entryFields(input || {});
    const [draftDoc, entryDoc] = await Promise.all([
      db.doc(`receiptEntryDrafts/${draftId}`).get(),
      db.doc(`entries/${draftId}`).get(),
    ]);
    const familyId = draftDoc.data()?.familyId || entryDoc.data()?.familyId;
    if (!familyId) throw new ReceiptError(404, "Unfinished entry not found.");
    return lock(familyId, async (fence) =>
      db.runTransaction(async (tx) => {
        await fence(tx);
        const [draft, existing, category, area, receipts] = await Promise.all([
          tx.get(db.doc(`receiptEntryDrafts/${draftId}`)),
          tx.get(db.doc(`entries/${draftId}`)),
          tx.get(db.doc(`categories/${fields.categoryId}`)),
          tx.get(db.doc(`budgetAreas/${fields.budgetAreaId}`)),
          tx.get(
            db.collection("receipts").where("transactionId", "==", draftId),
          ),
        ]);
        const access = await context(familyId, uid, tx);
        if (existing.exists) {
          const saved = existing.data();
          if (
            saved.userId !== uid ||
            saved.receiptSubmissionId !== draftId ||
            Object.entries(fields).some(([key, value]) => saved[key] !== value)
          )
            throw new ReceiptError(
              409,
              "This entry was already saved. Refresh your entries before making further changes.",
            );
          return { entryId: draftId };
        }
        if (
          !draft.exists ||
          draft.data().userId !== uid ||
          draft.data().familyId !== familyId
        )
          throw new ReceiptError(
            403,
            "This unfinished entry belongs to another member.",
          );
        if (
          draft.data().status !== "open" ||
          millis(draft.data().expiresAt) <= clock()
        )
          throw new ReceiptError(
            410,
            "This unfinished entry has expired. Start a new entry.",
          );
        const cat = category.data();
        if (
          !cat ||
          cat.familyId !== familyId ||
          cat.budgetAreaId !== fields.budgetAreaId ||
          cat.isArchived === true ||
          !types.includes(cat.type) ||
          !area.exists ||
          area.data().familyId !== familyId ||
          area.data().isArchived === true
        )
          throw new ReceiptError(
            400,
            "Choose an active category in this family and budget area.",
          );
        const ready = receipts.docs.filter(
          (r) => r.data().status === "ready" && r.data().familyId === familyId,
        );
        if (ready.length && !access.canRead)
          throw new ReceiptError(
            403,
            "Your family's receipt access has ended.",
          );
        if (cat.requiresReceipt === true && !ready.length)
          throw new ReceiptError(
            409,
            "Attach a receipt before saving this category.",
            "receipt-required",
          );
        tx.create(existing.ref, {
          ...fields,
          type: cat.type,
          familyId,
          userId: uid,
          createdAt: stamp(),
          receiptSubmissionId: draftId,
          ...(ready.length ? { receiptId: ready[0].id } : {}),
        });
        for (const receipt of ready)
          tx.update(receipt.ref, {
            draft: false,
            transactionDate: fields.date,
          });
        tx.delete(draft.ref);
        return { entryId: draftId };
      }),
    );
  }
  async function cleanDrafts() {
    const drafts = await db
      .collection("receiptEntryDrafts")
      .where("status", "==", "open")
      .where("expiresAt", "<=", stamp())
      .limit(100)
      .get();
    for (const draft of drafts.docs) {
      try {
        await lock(draft.data().familyId, async (fence) => {
          const expired = await db.runTransaction(async (tx) => {
            await fence(tx);
            const current = await tx.get(draft.ref);
            if (
              !current.exists ||
              current.data().status !== "open" ||
              millis(current.data().expiresAt) > clock()
            )
              return false;
            tx.update(draft.ref, { status: "expired" });
            return true;
          });
          if (!expired) return;
          const receipts = await db
            .collection("receipts")
            .where("transactionId", "==", draft.id)
            .get();
          for (const receipt of receipts.docs)
            if (
              receipt.data().draft &&
              receipt.data().familyId === draft.data().familyId
            )
              await queueDeletion(
                receipt.data(),
                "abandoned_entry_draft",
                fence,
              );
        });
      } catch (error) {
        // Keep this draft eligible for retry if its deletion queue could not be prepared.
        if (error.code === "busy") continue;
        await db.runTransaction(async (tx) => {
          const current = await tx.get(draft.ref);
          if (current.exists && current.data().status === "expired")
            tx.update(draft.ref, { status: "open" });
        });
        await db.collection("receiptAudit").add({
          familyId: draft.data().familyId,
          action: "abandoned_entry_draft",
          result: "retry_pending",
          errorCode: String(error.code || "failed"),
          createdAt: stamp(),
        });
      }
    }
  }
  async function purgeDrafts(uid) {
    const drafts = await db
      .collection("receiptEntryDrafts")
      .where("userId", "==", uid)
      .get();
    for (const draft of drafts.docs) {
      await lock(draft.data().familyId, async (fence) => {
        const receipts = await db
          .collection("receipts")
          .where("transactionId", "==", draft.id)
          .get();
        for (const receipt of receipts.docs)
          if (
            receipt.data().draft &&
            receipt.data().familyId === draft.data().familyId
          )
            await queueDeletion(
              receipt.data(),
              "account_deleted_entry_draft",
              fence,
            );
        await db.runTransaction(async (tx) => {
          await fence(tx);
          const current = await tx.get(draft.ref);
          if (current.exists && current.data().userId === uid)
            tx.update(draft.ref, { userId: null, status: "expired" });
        });
      });
    }
  }
  return { startDraft, finalizeDraft, cleanDrafts, purgeDrafts };
}
