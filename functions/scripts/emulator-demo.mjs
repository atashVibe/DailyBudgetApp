// Isolated UI demo. This script refuses to provision an account outside emulators.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import express from "express";
import { createSubscriptionService } from "../src/subscriptions.mjs";
import { createInvitationService } from "../src/invitations.mjs";
import { createInvitationsApi } from "../src/invitations-api.mjs";
import { createReceiptService } from "../src/service.mjs";
import { createReceiptApi } from "../src/api.mjs";
import { createFamilyMembershipService } from "../src/family-membership.mjs";

const projectId = "demo-dailybudget-receipts";
if (
  !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.STORAGE_EMULATOR_HOST ||
  process.env.GCLOUD_PROJECT !== projectId
) {
  throw new Error(
    "This demo requires all three emulators and the demo project. It must never run against real Firebase.",
  );
}
initializeApp({ projectId, storageBucket: `${projectId}.appspot.com` });
const auth = getAuth(),
  db = getFirestore(),
  bucket = getStorage().bucket();
const uid = "receipt-demo-owner",
  email = "receipts@example.test";
try {
  await auth.getUser(uid);
} catch {
  await auth.createUser({
    uid,
    email,
    password: "EmulatorOnly123!",
    emailVerified: true,
  });
}
await db.doc(`receiptAccess/${uid}`).set({ administrator: true });
await db
  .doc(`users/${uid}`)
  .set({ activeFamilyId: "demo-family", role: "admin", email });
await db.doc("families/demo-family").set({
  name: "Receipt Demo",
  createdBy: uid,
  dailyBudget: 30,
  status: "active",
});
await db.doc(`familyMembers/demo-family_${uid}`).set({
  familyId: "demo-family",
  userId: uid,
  role: "admin",
  status: "active",
  email,
});
await db.doc("budgetAreas/demo-area").set({
  name: "Daily Life",
  familyId: "demo-family",
  isDefault: true,
  isArchived: false,
});
await db.doc("categories/demo-category").set({
  name: "Groceries",
  familyId: "demo-family",
  budgetAreaId: "demo-area",
  type: "expense",
  isDefault: true,
  isArchived: false,
});
const app = express();
app.use(
  "/invitations",
  createInvitationsApi(
    createInvitationService({
      db,
      auth,
      send: async (message) => {
        if (!message.to.endsWith("@example.test"))
          throw new Error("Only emulator test recipients are allowed.");
        if (message.to.startsWith("smtp-auth-failure-"))
          throw Object.assign(
            new Error("Emulator-only SMTP authentication failure"),
            { code: "EAUTH" },
          );
        await db.collection("invitationTestMail").add(message);
        return { accepted: [message.to] };
      },
    }),
    auth,
  ),
);
const receipts = createReceiptService({ db, auth, bucket });
app.use(
  createReceiptApi(
    receipts,
    auth,
    createSubscriptionService({ db, receipts, verifier: {} }),
    createFamilyMembershipService({ db, auth }),
  ),
);
const { createServer } = await import("node:http");
createServer((req, res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.RECEIPTS_DEMO_WEB_ORIGIN || "http://localhost:8091",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization,Content-Type,X-Receipt-Mime,X-Receipt-Filename,X-Receipt-Transaction,X-Receipt-Request,X-Receipt-Replace",
  );
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  app(req, res);
}).listen(Number(process.env.RECEIPTS_DEMO_PORT || 8787), "127.0.0.1", () =>
  console.log(
    "Isolated receipt UI demo ready. Login: receipts@example.test / EmulatorOnly123! (emulator only).",
  ),
);
