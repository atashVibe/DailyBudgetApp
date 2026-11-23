import { createHash, randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { ReceiptError, DAY, millis } from "./policy.mjs";
import { planCatalog } from "./plans.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const stamp = (value) => Timestamp.fromMillis(value);
export function createSubscriptionService({
  db,
  receipts,
  verifier,
  clock = Date.now,
}) {
  const config = async () =>
    (await db.doc("receiptConfig/subscriptions").get()).data() || {};
  async function actor(uid, admin = false) {
    const access = await receipts.getAccess(uid);
    const member = (
      await db.doc(`familyMembers/${access.familyId}_${uid}`).get()
    ).data();
    if (admin && member?.role !== "admin")
      throw new ReceiptError(
        403,
        "Only a current family administrator can manage subscriptions.",
      );
    return { ...access, isFamilyAdmin: member?.role === "admin" };
  }
  async function overview(uid) {
    const [access, c] = await Promise.all([actor(uid), config()]);
    const binding = (
      await db.doc(`familySubscriptions/${access.familyId}`).get()
    ).data();
    return {
      catalog: planCatalog(c),
      access: { ...access, usage: await receipts.getUsage(uid) },
      isFamilyAdmin: access.isFamilyAdmin,
      isPayer: binding?.payerUid === uid,
      availability: {
        google: c.purchasesEnabled === true && c.googleEnabled === true,
        apple: c.purchasesEnabled === true && c.appleEnabled === true,
      },
      products: (c.products || [])
        .filter((p) => ["google", "apple"].includes(p.store))
        .map(
          ({ store, productId, basePlanId, plan, interval, trialOfferId }) => ({
            store,
            productId,
            basePlanId,
            plan,
            interval,
            trialOfferId,
          }),
        ),
      sandboxTesting: (c.sandboxTesterUids || []).includes(uid),
      currentProduct: binding?.productId || null,
      currentStore: binding?.store || null,
    };
  }
  async function prepare(uid, store) {
    if (!["google", "apple"].includes(store))
      throw new ReceiptError(400, "Choose a supported app store.");
    const a = await actor(uid, true),
      c = await config();
    if (c.purchasesEnabled !== true || c[`${store}Enabled`] !== true)
      throw new ReceiptError(
        503,
        "Store purchases are not configured yet. Selecting a plan does not activate it.",
        "billing-not-configured",
      );
    return receipts.withFamilyLock(a.familyId, async (fence) =>
      db.runTransaction(async (tx) => {
        await fence(tx);
        const familyRef = db.doc(`familySubscriptions/${a.familyId}`),
          payerRef = db.doc(`subscriptionPayers/${uid}`);
        const [existing, payer, member] = await Promise.all([
          tx.get(familyRef),
          tx.get(payerRef),
          tx.get(db.doc(`familyMembers/${a.familyId}_${uid}`)),
        ]);
        if (
          member.data()?.role !== "admin" ||
          member.data()?.status !== "active"
        )
          throw new ReceiptError(
            403,
            "Your family administrator access changed.",
          );
        if (existing.exists && existing.data().payerUid !== uid)
          throw new ReceiptError(
            409,
            "This family's billing is managed by its original purchaser. Contact that person; do not buy another subscription.",
            "different-payer",
          );
        if (existing.data()?.store && existing.data().store !== store)
          throw new ReceiptError(
            409,
            "Manage this subscription in its original app store. Contact support before changing stores to avoid duplicate billing.",
            "different-store",
          );
        if (payer.exists && payer.data().familyId !== a.familyId)
          throw new ReceiptError(
            409,
            "Your store billing is already linked to another family. Manage that subscription before contacting support to change billing ownership.",
            "payer-bound",
          );
        const bindingId = existing.data()?.bindingId || randomUUID();
        if (!existing.exists) {
          tx.create(familyRef, {
            familyId: a.familyId,
            payerUid: uid,
            bindingId,
            createdAt: stamp(clock()),
          });
          tx.create(db.doc(`subscriptionBindings/${bindingId}`), {
            familyId: a.familyId,
            payerUid: uid,
          });
          tx.set(payerRef, { familyId: a.familyId, bindingId });
        }
        return { bindingId, familyId: a.familyId, store };
      }),
    );
  }
  async function apply(snapshot, proof, expectedUid) {
    const c = await config();
    const binding = (
      await db.doc(`subscriptionBindings/${snapshot.bindingId}`).get()
    ).data();
    if (!binding || (expectedUid && binding.payerUid !== expectedUid))
      throw new ReceiptError(
        409,
        "This store purchase belongs to a different family billing account.",
        "purchase-not-bound",
      );
    if (
      snapshot.sandbox &&
      !(c.sandboxTesterUids || []).includes(binding.payerUid)
    )
      throw new ReceiptError(
        403,
        "Test purchases cannot activate access for this account.",
        "sandbox-denied",
      );
    const familyId = binding.familyId;
    return receipts.withFamilyLock(familyId, async (fence) => {
      await db.runTransaction(async (tx) => {
        await fence(tx);
        const accessRef = db.doc(`receiptFamilyAccess/${familyId}`),
          familyRef = db.doc(`familySubscriptions/${familyId}`);
        const proofRef = db.doc(
          `subscriptionProofs/${hash(`${snapshot.store}:${snapshot.originalTransactionId || proof.token}`)}`,
        );
        const [old, family, prior, familyDoc] = await Promise.all([
          tx.get(accessRef),
          tx.get(familyRef),
          tx.get(proofRef),
          tx.get(db.doc(`families/${familyId}`)),
        ]);
        if (!familyDoc.exists || familyDoc.data().status === "deleted")
          throw new ReceiptError(
            409,
            "This purchase's family is closed. Cancel it in the app store.",
          );
        if (family.data()?.store && family.data().store !== snapshot.store)
          throw new ReceiptError(
            409,
            "This family already uses a different app store.",
          );
        if (
          family.data()?.bindingId !== snapshot.bindingId ||
          (prior.exists && prior.data().familyId !== familyId)
        )
          throw new ReceiptError(
            409,
            "Store purchase ownership cannot be transferred between families.",
          );
        if (snapshot.checkedAt < millis(family.data()?.verifiedAt))
          throw new ReceiptError(
            409,
            "A newer store verification is already saved. Refresh the plan.",
          );
        // Do not let an old Google token overwrite a later replacement purchase.
        if (
          snapshot.store === "google" &&
          family.data()?.proofId &&
          family.data().proofId !== proofRef.id &&
          prior.exists
        )
          throw new ReceiptError(
            409,
            "This purchase has already been replaced.",
            "purchase-replaced",
          );
        if (snapshot.linkedToken) {
          const linked = await tx.get(
            db.doc(
              `subscriptionProofs/${hash(`google:${snapshot.linkedToken}`)}`,
            ),
          );
          if (linked.exists && linked.data().familyId !== familyId)
            throw new ReceiptError(
              409,
              "This replacement belongs to a different family.",
            );
        }
        const before = old.data() || {};
        if (
          family.data()?.proofId &&
          family.data().proofId !== proofRef.id &&
          !snapshot.linkedToken &&
          millis(before.paidThrough) > clock()
        )
          throw new ReceiptError(
            409,
            "An active purchase already pays for this family. Use the original store subscription to change plans.",
            "duplicate-subscription",
          );
        const catalog = planCatalog(c).plans;
        const previousQuota =
          catalog.find((p) => p.id === before.plan)?.storageBytes || 0;
        const nextQuota =
          catalog.find((p) => p.id === snapshot.plan)?.storageBytes || 0;
        const downgrade = snapshot.active && nextQuota < previousQuota;
        const upgrade = snapshot.active && nextQuota > previousQuota;
        const paidThrough = snapshot.paidThrough;
        const grace = snapshot.active
          ? null
          : before.subscriptionStatus === "expired" && before.graceUntil
            ? before.graceUntil
            : stamp(Math.min(paidThrough, clock()) + 30 * DAY);
        tx.set(
          accessRef,
          {
            plan: snapshot.plan,
            subscriptionStatus: snapshot.active
              ? snapshot.trial
                ? "trialing"
                : snapshot.willRenew
                  ? "active"
                  : "canceled"
              : "expired",
            paidThrough: stamp(paidThrough),
            willRenew: snapshot.willRenew,
            subscriptionInterval: snapshot.interval,
            billingSource: snapshot.store,
            graceUntil: grace,
            downgradeUploadBlocked: upgrade
              ? false
              : downgrade
                ? true
                : before.downgradeUploadBlocked === true,
            downgradeDownloadUntil: upgrade
              ? null
              : downgrade
                ? stamp(clock() + 30 * DAY)
                : before.downgradeDownloadUntil || null,
            updatedAt: stamp(clock()),
          },
          { merge: true },
        );
        tx.set(familyRef, {
          ...family.data(),
          store: snapshot.store,
          productId: snapshot.productId,
          proofId: proofRef.id,
          verifiedAt: stamp(snapshot.checkedAt),
          verificationNextAt: stamp(
            Math.min(
              clock() + 6 * 60 * 60 * 1000,
              snapshot.paidThrough > clock()
                ? snapshot.paidThrough
                : clock() + 6 * 60 * 60 * 1000,
            ),
          ),
          sandbox: snapshot.sandbox,
        });
        tx.set(proofRef, {
          familyId,
          bindingId: snapshot.bindingId,
          store: snapshot.store,
          token: proof.token || null,
          transactionId:
            snapshot.originalTransactionId || proof.transactionId || null,
          sandbox: snapshot.sandbox,
          updatedAt: stamp(clock()),
        });
        tx.create(db.collection("subscriptionAudit").doc(), {
          familyId,
          store: snapshot.store,
          plan: snapshot.plan,
          status: snapshot.active ? "verified-active" : "verified-expired",
          sandbox: snapshot.sandbox,
          createdAt: stamp(clock()),
        });
      });
      return { verified: true, familyId, active: snapshot.active };
    });
  }
  async function verify(proof, uid) {
    const c = await config();
    if (c.purchasesEnabled !== true)
      throw new ReceiptError(
        503,
        "Store billing is not enabled yet.",
        "billing-not-configured",
      );
    if (!["google", "apple"].includes(proof.store))
      throw new ReceiptError(400, "Unsupported store.");
    if (uid) await actor(uid, true);
    const snapshot =
      proof.store === "google"
        ? await verifier.verifyGoogle(proof.token)
        : await verifier.verifyApple(
            proof.transactionId,
            proof.sandbox === true,
          );
    if (!Number.isFinite(snapshot.paidThrough) || snapshot.paidThrough <= 0)
      throw new ReceiptError(
        409,
        "The store did not provide a valid subscription period.",
      );
    const result = await apply(snapshot, proof, uid);
    if (proof.store === "google")
      await verifier.acknowledgeGoogle(proof.token, snapshot);
    return result;
  }
  async function reconcileDue() {
    const c = await config();
    if (c.purchasesEnabled !== true) return;
    const due = await db
      .collection("familySubscriptions")
      .where("verificationNextAt", "<=", stamp(clock()))
      .limit(100)
      .get();
    for (const family of due.docs) {
      try {
        const proof = (
          await db.doc(`subscriptionProofs/${family.data().proofId}`).get()
        ).data();
        if (proof) await verify(proof);
      } catch {
        // Outages do not create a fresh paid period or extend retention.
        await family.ref.set(
          {
            verificationNextAt: stamp(clock() + 60 * 60 * 1000),
            verificationFailedAt: stamp(clock()),
          },
          { merge: true },
        );
      }
    }
  }
  async function refresh(uid) {
    const a = await actor(uid);
    const ref = db.doc(`familySubscriptions/${a.familyId}`);
    const proof = await db.runTransaction(async (tx) => {
      const family = await tx.get(ref);
      if (!family.data()?.proofId) return null;
      if (millis(family.data().lastManualRefreshAt) > clock() - 60000)
        throw new ReceiptError(
          429,
          "Wait one minute before checking the store again.",
        );
      const stored = await tx.get(
        db.doc(`subscriptionProofs/${family.data().proofId}`),
      );
      tx.update(ref, { lastManualRefreshAt: stamp(clock()) });
      return stored.data();
    });
    if (proof) await verify(proof);
    return overview(uid);
  }
  return { config, overview, prepare, verify, reconcileDue, refresh };
}
