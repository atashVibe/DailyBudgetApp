import { createHash, randomInt } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { DAY, ReceiptError, millis } from "./policy.mjs";

const JOIN_URL = "https://atashvibe.github.io/DailyBudgetApp/join-invitation";
const HOUR = 60 * 60 * 1000;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const stamp = (value) => Timestamp.fromMillis(value);
export const invitationLink = (code) => {
  if (!/^\d{8}$/.test(code))
    throw new ReceiptError(400, "Invalid invitation code.");
  return `${JOIN_URL}?code=${code}`;
};
export function invitationEmail(email, familyName, role, code, expiresAt) {
  const name = String(familyName || "your family")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .slice(0, 100);
  return {
    to: email,
    subject: "You're invited to DailyBudget",
    text: [
      `You have been invited to join ${name} on DailyBudget as ${role === "admin" ? "an administrator" : "a member"}.`,
      "",
      `Invitation code: ${code}`,
      `Join: ${invitationLink(code)}`,
      "",
      `This invitation expires at ${new Date(expiresAt).toISOString()} (10 minutes after creation).`,
      `Sign in or create an account using ${email}. Opening the link does not join automatically.`,
      "Current family members share budget information and family receipts according to the family's access plan.",
      "If you weren't expecting this invitation, you can ignore it.",
    ].join("\n"),
  };
}
function inputValues(input) {
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (
    email.length > 254 ||
    !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email)
  )
    throw new ReceiptError(400, "Enter one valid email address.");
  if (!["member", "admin"].includes(input.role))
    throw new ReceiptError(400, "Choose member or administrator.");
  if (
    typeof input.requestId !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(input.requestId)
  )
    throw new ReceiptError(400, "Invalid invitation request. Please retry.");
  return { email, role: input.role, requestId: input.requestId };
}

// SMTP has no universal exactly-once guarantee. Claim each request before sending;
// duplicate/retried HTTP requests never send again, including uncertain outcomes.
export function createInvitationService({ db, auth, send, clock = Date.now }) {
  async function actor(uid, tx) {
    const get = (ref) => (tx ? tx.get(ref) : ref.get());
    const profile = await get(db.doc(`users/${uid}`));
    const familyId = profile.data()?.activeFamilyId;
    if (
      typeof familyId !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(familyId)
    )
      throw new ReceiptError(403, "Choose an active family first.");
    const [family, membership] = await Promise.all([
      get(db.doc(`families/${familyId}`)),
      get(db.doc(`familyMembers/${familyId}_${uid}`)),
    ]);
    if (
      !family.exists ||
      family.data().status === "deleted" ||
      membership.data()?.role !== "admin" ||
      membership.data()?.status !== "active"
    )
      throw new ReceiptError(
        403,
        "Only a current family administrator can email invitations.",
      );
    return { familyId, familyName: family.data().name || "Family" };
  }
  async function verifiedSender(uid) {
    const user = await auth.getUser(uid);
    if (user.disabled) throw new ReceiptError(403, "Please sign in again.");
    if (!user.emailVerified)
      throw new ReceiptError(
        403,
        "Verify your own email before sending invitations.",
        "verify-email",
      );
  }
  async function result(ref) {
    const job = (await ref.get()).data();
    const invite = (await db.doc(`invites/${ref.id}`).get()).data();
    if (
      !invite ||
      invite.status !== "pending" ||
      millis(invite.expiresAt) <= clock()
    )
      return {
        status: invite?.status === "accepted" ? "used" : "expired",
        code: null,
        joinUrl: null,
      };
    return {
      status:
        job.state === "sending" && clock() - millis(job.createdAt) > 60000
          ? "unknown"
          : job.state,
      code: invite.code,
      email: invite.email,
      expiresAt: millis(invite.expiresAt),
      joinUrl: invitationLink(invite.code),
      ...(job.failure ? { failure: job.failure } : {}),
    };
  }
  async function create(uid, input = {}) {
    if (!send)
      throw new ReceiptError(
        503,
        "Automatic invitation email is not set up yet. You can create a share link instead.",
        "email-not-configured",
      );
    const { email, role, requestId } = inputValues(input);
    await verifiedSender(uid);
    const ref = db.doc(`invitationDeliveries/${hash(`${uid}:${requestId}`)}`);
    const now = clock();
    let claim;
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = String(randomInt(100000000)).padStart(8, "0");
      claim = await db.runTransaction(async (tx) => {
        const family = await actor(uid, tx);
        const requestHash = hash(
          JSON.stringify({ familyId: family.familyId, email, role }),
        );
        const existing = await tx.get(ref);
        if (existing.exists) {
          if (existing.data().requestHash !== requestHash)
            throw new ReceiptError(
              409,
              "This request belongs to another invitation. Start a new invitation.",
            );
          return { send: false };
        }
        const limits = [
          {
            ref: db.doc(`invitationMailLimits/global_${Math.floor(now / DAY)}`),
            max: 100,
          },
          {
            ref: db.doc(
              `invitationMailLimits/sender_${hash(uid)}_${Math.floor(now / HOUR)}`,
            ),
            max: 10,
          },
          {
            ref: db.doc(
              `invitationMailLimits/family_${hash(family.familyId)}_${Math.floor(now / HOUR)}`,
            ),
            max: 20,
          },
        ];
        const recipientRef = db.doc(
          `invitationMailLimits/recipient_${hash(`${family.familyId}:${email}`)}`,
        );
        const [counts, recipient, collisions] = await Promise.all([
          Promise.all(limits.map((limit) => tx.get(limit.ref))),
          tx.get(recipientRef),
          tx.get(
            db
              .collection("invites")
              .where("email", "==", email)
              .where("code", "==", code)
              .where("status", "==", "pending"),
          ),
        ]);
        if (!collisions.empty) return { collision: true };
        if (
          counts.some(
            (count, index) => (count.data()?.count || 0) >= limits[index].max,
          )
        )
          throw new ReceiptError(
            429,
            "The invitation email limit has been reached. Try later or share a code instead.",
          );
        if (recipient.exists && now - millis(recipient.data().sentAt) < 60000)
          throw new ReceiptError(
            429,
            "Wait one minute before emailing this person again.",
          );
        tx.create(db.doc(`invites/${ref.id}`), {
          email,
          role,
          familyId: family.familyId,
          createdBy: uid,
          code,
          status: "pending",
          createdAt: stamp(now),
          expiresAt: stamp(now + 10 * 60000),
        });
        tx.create(ref, {
          familyId: family.familyId,
          requestHash,
          state: "sending",
          createdAt: stamp(now),
          expiresAt: stamp(now + 7 * DAY),
        });
        limits.forEach((limit, index) =>
          tx.set(limit.ref, {
            count: (counts[index].data()?.count || 0) + 1,
            expiresAt: stamp(now + 7 * DAY),
          }),
        );
        tx.set(recipientRef, {
          sentAt: stamp(now),
          expiresAt: stamp(now + 7 * DAY),
        });
        return { send: true, ...family, code, expiresAt: now + 10 * 60000 };
      });
      if (!claim.collision) break;
    }
    if (claim.collision)
      throw new ReceiptError(503, "Could not create a unique code. Try again.");
    if (!claim.send) return result(ref);
    try {
      // Recheck live authority and the invitation immediately before SMTP.
      const family = await actor(uid);
      await verifiedSender(uid);
      const invite = (await db.doc(`invites/${ref.id}`).get()).data();
      if (
        family.familyId !== claim.familyId ||
        invite?.status !== "pending" ||
        invite.familyId !== claim.familyId ||
        invite.createdBy !== uid ||
        millis(invite.expiresAt) !== claim.expiresAt ||
        invite.code !== claim.code ||
        invite.email !== email ||
        invite.role !== role ||
        millis(invite.expiresAt) <= clock()
      )
        throw new ReceiptError(
          409,
          "The invitation changed or expired. Create a new invitation.",
        );
      const accepted = await send(
        invitationEmail(
          email,
          claim.familyName,
          role,
          claim.code,
          claim.expiresAt,
        ),
      );
      if (
        !accepted?.accepted?.some(
          (address) => String(address).toLowerCase() === email,
        )
      )
        throw Object.assign(new Error("Recipient rejected"), {
          code: "EENVELOPE",
        });
      await ref.update({ state: "accepted", updatedAt: stamp(clock()) });
    } catch (error) {
      const failure =
        error instanceof ReceiptError
          ? "invitation-changed"
          : error.code === "EAUTH"
            ? "email-setup"
            : error.code === "EENVELOPE"
              ? "address-rejected"
              : "delivery-unknown";
      await ref.update({
        state: failure === "delivery-unknown" ? "unknown" : "failed",
        failure,
        updatedAt: stamp(clock()),
      });
      if (error instanceof ReceiptError) throw error;
      // Never expose SMTP messages, credentials or arbitrary provider metadata.
    }
    return result(ref);
  }
  async function cleanup() {
    let removed = 0;
    for (const collection of ["invitationDeliveries", "invitationMailLimits"]) {
      const expired = await db
        .collection(collection)
        .where("expiresAt", "<=", stamp(clock()))
        .limit(400)
        .get();
      if (!expired.empty) {
        const batch = db.batch();
        expired.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        removed += expired.size;
      }
    }
    return removed;
  }
  return { create, cleanup };
}
