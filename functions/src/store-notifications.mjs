import express from "express";
import { ReceiptError } from "./policy.mjs";
import { BUNDLE_ID, verifyGooglePush } from "./store-verification.mjs";
export function createStoreNotifications(
  subscriptions,
  verifier,
  authenticateGoogle = verifyGooglePush,
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "128kb" }));
  app.post("/google", async (req, res, next) => {
    try {
      const config = await subscriptions.config();
      await authenticateGoogle(req.get("Authorization"), config);
      let data;
      try {
        data = JSON.parse(
          Buffer.from(req.body.message?.data || "", "base64").toString("utf8"),
        );
      } catch {
        throw new ReceiptError(400, "Invalid Google notification.");
      }
      if (data.testNotification) {
        res.sendStatus(200);
        return;
      }
      if (
        data.packageName !== BUNDLE_ID ||
        !data.subscriptionNotification?.purchaseToken
      )
        throw new ReceiptError(400, "Invalid Google notification.");
      await subscriptions.verify({
        store: "google",
        token: data.subscriptionNotification.purchaseToken,
      });
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });
  app.post("/apple", async (req, res, next) => {
    try {
      const event = await verifier.appleNotification(req.body.signedPayload);
      if (event) await subscriptions.verify({ store: "apple", ...event });
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res
      .status(error instanceof ReceiptError ? error.status : 503)
      .json({
        message:
          error instanceof ReceiptError
            ? error.message
            : "Store notification verification failed.",
        code: error instanceof ReceiptError ? error.code : "store-unavailable",
      });
  });
  return app;
}
