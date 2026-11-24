import { Timestamp } from "firebase-admin/firestore";
import { identifier, ReceiptError } from "./policy.mjs";

// Leave only the authenticated caller's current membership. Shared records and
// billing bindings are intentionally retained, just as when switching families.
export function createFamilyMembershipService({ db, auth, clock = Date.now }) {
  const revision = (snapshot) =>
    `${snapshot.updateTime.seconds}:${snapshot.updateTime.nanoseconds}`;

  async function inspect(tx, uid, familyId) {
    const [family, membership, members, subscription] = await Promise.all([
      tx.get(db.doc(`families/${familyId}`)),
      tx.get(db.doc(`familyMembers/${familyId}_${uid}`)),
      tx.get(db.collection("familyMembers").where("familyId", "==", familyId)),
      tx.get(db.doc(`familySubscriptions/${familyId}`)),
    ]);
    if (
      !family.exists ||
      family.data().status === "deleted" ||
      !membership.exists ||
      membership.data().status !== "active" ||
      membership.data().userId !== uid
    )
      throw new ReceiptError(
        403,
        "You are not a current member of this family.",
      );

    let canLeave = true;
    if (membership.data().role === "admin") {
      const otherAdmins = [
        ...new Set(
          members.docs
            .map((item) => item.data())
            .filter(
              (item) =>
                item.status === "active" &&
                item.role === "admin" &&
                item.userId !== uid &&
                typeof item.userId === "string",
            )
            .map((item) => item.userId),
        ),
      ];
      let liveAdmins = 0;
      for (let offset = 0; offset < otherAdmins.length; offset += 100) {
        const result = await auth.getUsers(
          otherAdmins.slice(offset, offset + 100).map((id) => ({ uid: id })),
        );
        liveAdmins += result.users.filter((user) => !user.disabled).length;
      }
      canLeave = liveAdmins > 0;
    }
    return {
      familyId,
      familyName: String(family.data().name || "your family"),
      revision: revision(membership),
      canLeave,
      reason: canLeave
        ? null
        : "You are the only administrator. Invite another administrator before leaving this family.",
      isStorePayer:
        subscription.data()?.payerUid === uid &&
        ["google", "apple"].includes(subscription.data()?.store),
    };
  }

  async function prepare(uid) {
    identifier(uid);
    return db.runTransaction(async (tx) => {
      const profile = await tx.get(db.doc(`users/${uid}`));
      const familyId = profile.data()?.activeFamilyId;
      if (!familyId)
        throw new ReceiptError(404, "You are not currently in a family.");
      identifier(familyId);
      return inspect(tx, uid, familyId);
    });
  }

  async function leave(uid, input = {}) {
    identifier(uid);
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ReceiptError(
        400,
        "Reopen the leave-family confirmation and try again.",
      );
    const familyId = identifier(input.familyId);
    if (
      typeof input.revision !== "string" ||
      !/^\d+:\d+$/.test(input.revision) ||
      input.revision.length > 64
    )
      throw new ReceiptError(
        400,
        "Reopen the leave-family confirmation and try again.",
      );
    return db.runTransaction(async (tx) => {
      const userRef = db.doc(`users/${uid}`);
      const memberRef = db.doc(`familyMembers/${familyId}_${uid}`);
      const [profile, ownMember] = await Promise.all([
        tx.get(userRef),
        tx.get(memberRef),
      ]);
      if (
        profile.exists &&
        profile.data().activeFamilyId == null &&
        ownMember.data()?.status === "inactive"
      )
        return { left: true };
      if (profile.data()?.activeFamilyId !== familyId)
        throw new ReceiptError(
          409,
          "Your current family changed. Reopen the confirmation before leaving.",
          "FAMILY_CHANGED",
        );
      const current = await inspect(tx, uid, familyId);
      if (!current.canLeave)
        throw new ReceiptError(409, current.reason, "LAST_ADMIN");
      if (current.revision !== input.revision)
        throw new ReceiptError(
          409,
          "Your membership changed. Reopen the confirmation before leaving.",
          "FAMILY_CHANGED",
        );
      tx.update(memberRef, {
        status: "inactive",
        leftAt: Timestamp.fromMillis(clock()),
      });
      tx.update(userRef, { activeFamilyId: null, role: null });
      return { left: true };
    });
  }
  return { prepare, leave };
}
