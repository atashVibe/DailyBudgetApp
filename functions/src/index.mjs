import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { createReceiptService } from "./service.mjs";
import { createReceiptApi } from "./api.mjs";

initializeApp();
const region = process.env.RECEIPT_REGION || "us-central1";
const service = createReceiptService({
  db: getFirestore(),
  auth: getAuth(),
  bucket: getStorage().bucket(),
});
export const receiptsApi = onRequest(
  {
    region,
    memory: "512MiB",
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 2,
    concurrency: 1,
    cors: ["https://atashvibe.github.io", /^http:\/\/localhost(:\d+)?$/],
  },
  createReceiptApi(service, getAuth()),
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
  () => service.maintain(),
);
