import { Timestamp } from "firebase-admin/firestore";
import { DAY, ReceiptError, identifier, permissions } from "./policy.mjs";

// Read inside the caller's transaction when authorizing a commit/deletion.
// Membership and global receipt roles are authoritative backend reads.
export function createFamilyContext(db, auth, clock) {
  return async function context(familyId, uid, tx) {
    identifier(familyId);
    const get = (ref) => (tx ? tx.get(ref) : ref.get());
    const [family, accessDoc, config, catalog, membership] = await Promise.all([
      get(db.doc(`families/${familyId}`)),
      get(db.doc(`receiptFamilyAccess/${familyId}`)),
      get(db.doc("receiptConfig/global")),
      get(db.doc("receiptConfig/subscriptions")),
      get(
        db
          .collection("familyMembers")
          .where("familyId", "==", familyId)
          .where("status", "==", "active"),
      ),
    ]);
    const ids = [
      ...new Set(
        membership.docs
          .map((d) => d.data().userId)
          .filter((id) => typeof id === "string"),
      ),
    ];
    const present = new Set();
    for (let index = 0; index < ids.length; index += 100) {
      const result = await auth.getUsers(
        ids.slice(index, index + 100).map((id) => ({ uid: id })),
      );
      result.users
        .filter((u) => !u.disabled)
        .forEach((u) => present.add(u.uid));
    }
    const roles = new Map();
    for (const id of present)
      roles.set(
        id,
        (await get(db.doc(`receiptAccess/${identifier(id)}`))).data()
          ?.administrator === true,
      );
    const closed = !family.exists || family.data().status === "deleted";
    if (uid && (closed || !present.has(uid)))
      throw new ReceiptError(
        403,
        "You are not a current member of this family.",
      );
    const sponsored = [...roles.values()].some(Boolean);
    const current = accessDoc.data() || {};
    const state = { ...current };
    const effective = permissions(
      { ...state, administrator: sponsored },
      clock(),
      config.data()?.plans,
      catalog.data(),
    );
    // A family that loses administrator sponsorship gets a fresh grace period,
    // rather than keeping unpaid storage forever or deleting files immediately.
    if (
      !closed &&
      !sponsored &&
      state.hasStorage &&
      !effective.active &&
      (state.administratorSponsored === true || !effective.deletionScheduledAt)
    ) {
      state.graceUntil = Timestamp.fromMillis(clock() + 30 * DAY);
    }
    if (
      !closed &&
      (state.administratorSponsored !== sponsored ||
        state.graceUntil !== current.graceUntil)
    ) {
      state.administratorSponsored = sponsored;
      const update = {
        administratorSponsored: sponsored,
        updatedAt: Timestamp.fromMillis(clock()),
      };
      if (state.graceUntil) update.graceUntil = state.graceUntil;
      // All reads have completed before this write; callers must do their other
      // transaction reads before invoking context().
      if (tx)
        tx.set(db.doc(`receiptFamilyAccess/${familyId}`), update, {
          merge: true,
        });
      else
        await db
          .doc(`receiptFamilyAccess/${familyId}`)
          .set(update, { merge: true });
    }
    const result = permissions(
      { ...state, administrator: sponsored },
      clock(),
      config.data()?.plans,
      catalog.data(),
    );
    return {
      ...result,
      familyId,
      familyName: family.data()?.name || "Family",
      administrator: uid ? roles.get(uid) === true : sponsored,
      administratorFamily: sponsored,
      memberCount: present.size,
      closed,
    };
  };
}
