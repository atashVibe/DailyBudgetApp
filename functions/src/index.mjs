import nodemailer from "nodemailer";
import {
  defineSecret,
  defineString,
  defineInt,
} from "firebase-functions/params";
import { createInvitationService } from "./invitations.mjs";
import { createInvitationsApi } from "./invitations-api.mjs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { createReceiptService } from "./service.mjs";
import { createReceiptApi } from "./api.mjs";
import { createSubscriptionService } from "./subscriptions.mjs";
import { createStoreVerifier } from "./store-verification.mjs";
import { createStoreNotifications } from "./store-notifications.mjs";
import { createFamilyMembershipService } from "./family-membership.mjs";
import { GoogleAuth } from "google-auth-library";

initializeApp();
const region = process.env.RECEIPT_REGION || "us-west1";
const service = createReceiptService({
  db: getFirestore(),
  auth: getAuth(),
  bucket: getStorage().bucket(),
});
const storeVerifier = createStoreVerifier({
  getConfig: async () =>
    (await getFirestore().doc("receiptConfig/subscriptions").get()).data() ||
    {},
  // Read only this named secret, only when Apple verification is configured.
  // Grant this runtime service account Secret Accessor on this secret only.
  loadAppleKey: async () => {
    const project =
      process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    if (!/^[a-z][a-z0-9-]+$/.test(project || ""))
      throw new Error("Missing project");
    const client = await new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    }).getClient();
    const { data } = await client.request({
      url: `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/APPLE_IAP_PRIVATE_KEY/versions/latest:access`,
      method: "GET",
      timeout: 10000,
      retry: false,
    });
    return Buffer.from(data.payload.data, "base64").toString("utf8");
  },
});
const subscriptions = createSubscriptionService({
  db: getFirestore(),
  receipts: service,
  verifier: storeVerifier,
});
export const receiptsApi = onRequest(
  {
    region,
    // Browser requests reach our Firebase authentication checks. Explicit on
    // updates too, so a retry can repair an interrupted initial IAM setup.
    invoker: "public",
    memory: "512MiB",
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 2,
    concurrency: 1,
    cors: ["https://atashvibe.github.io", /^http:\/\/localhost(:\d+)?$/],
  },
  createReceiptApi(
    service,
    getAuth(),
    subscriptions,
    createFamilyMembershipService({ db: getFirestore(), auth: getAuth() }),
  ),
);
export const storeNotifications = onRequest(
  {
    region,
    // Apple/Google callbacks authenticate inside the notification handler.
    invoker: "public",
    memory: "256MiB",
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 2,
    concurrency: 1,
  },
  createStoreNotifications(subscriptions, storeVerifier),
);

export const receiptMaintenance = onSchedule(
  {
    schedule: "every 60 minutes",
    region,
    memory: "512MiB",
    timeoutSeconds: 540,
    maxInstances: 1,
    concurrency: 1,
    retryCount: 3,
  },
  async () => {
    await subscriptions.reconcileDue();
    await service.maintain();
    await createInvitationService({
      db: getFirestore(),
      auth: getAuth(),
    }).cleanup();
  },
);

// A separate endpoint keeps invitation SMTP credentials out of the receipt API.
const invitationPassword = defineSecret("INVITATION_SMTP_PASSWORD");
const invitationUser = defineString("INVITATION_SMTP_USER", {
  default: "dailybudgethub@gmail.com",
});
const invitationHost = defineString("INVITATION_SMTP_HOST", {
  default: "smtp.gmail.com",
});
const invitationPort = defineInt("INVITATION_SMTP_PORT", { default: 465 });
let invitationsApp;
export const familyInvitationsApi = onRequest(
  {
    region,
    invoker: "public",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 2,
    concurrency: 1,
    secrets: [invitationPassword],
    cors: ["https://atashvibe.github.io", /^http:\/\/localhost(:\d+)?$/],
  },
  (req, res) => {
    if (!invitationsApp) {
      const transport = nodemailer.createTransport({
        host: invitationHost.value(),
        port: invitationPort.value(),
        secure: invitationPort.value() === 465,
        requireTLS: invitationPort.value() !== 465,
        auth: {
          user: invitationUser.value(),
          pass: invitationPassword.value(),
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        logger: false,
        debug: false,
      });
      invitationsApp = createInvitationsApi(
        createInvitationService({
          db: getFirestore(),
          auth: getAuth(),
          send: (message) =>
            transport.sendMail({
              from: { name: "DailyBudget", address: invitationUser.value() },
              ...message,
              disableFileAccess: true,
              disableUrlAccess: true,
            }),
        }),
        getAuth(),
      );
    }
    return invitationsApp(req, res);
  },
);
