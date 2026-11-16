// Run ONLY in a trusted environment with Application Default Credentials.
// Never put a service-account key in the app, repository, or EXPO_PUBLIC_*.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { identifier, millis } from "../src/policy.mjs";

const [projectId, uid, action] = process.argv.slice(2);
if (!projectId || !uid || !["grant", "revoke"].includes(action)) {
  throw new Error(
    "Usage: node scripts/receipt-admin.mjs PROJECT_ID EXISTING_FIREBASE_UID grant|revoke",
  );
}
identifier(uid);
initializeApp({ projectId });
const user = await getAuth().getUser(uid);
if (user.disabled) throw new Error("This account is disabled.");
const db = getFirestore();
const memberships = await db
  .collection("familyMembers")
  .where("userId", "==", uid)
  .get();
const families = [
  ...new Set(memberships.docs.map((d) => identifier(d.data().familyId))),
];
await db.runTransaction(async (tx) => {
  for (const familyId of families) {
    const activeLock = await tx.get(db.doc(`receiptLocks/${familyId}`));
    if (millis(activeLock.data()?.until) > Date.now())
      throw new Error("A family receipt operation is running. Retry later.");
  }
  tx.set(
    db.doc(`receiptAccess/${uid}`),
    { administrator: action === "grant", updatedAt: Timestamp.now() },
    { merge: true },
  );
  tx.create(db.collection("receiptAudit").doc(), {
    userId: uid,
    action: `${action}_admin_trusted_setup`,
    createdAt: Timestamp.now(),
    result: "access_updated",
  });
});
console.log(
  `Receipt administrator access ${action === "grant" ? "granted" : "revoked"} for the verified existing Firebase UID. No subscription was assigned.`,
);
