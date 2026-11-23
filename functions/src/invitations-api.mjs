import express from "express";
import { ReceiptError } from "./policy.mjs";

export function createInvitationsApi(service, auth) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(express.json({ limit: "4kb" }));
  app.post("/", async (req, res, next) => {
    try {
      const match = /^Bearer (\S+)$/.exec(req.get("Authorization") || "");
      if (!match) throw new ReceiptError(401, "Please sign in again.");
      let uid;
      try {
        uid = (await auth.verifyIdToken(match[1], true)).uid;
      } catch {
        throw new ReceiptError(401, "Please sign in again.");
      }
      res.json(await service.create(uid, req.body || {}));
    } catch (error) {
      next(error);
    }
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const known = error instanceof ReceiptError;
    const status = known
      ? error.status
      : error.status === 413
        ? 413
        : error.type === "entity.parse.failed"
          ? 400
          : 503;
    res.status(status).json({
      message: known
        ? error.message
        : "Invitation email is unavailable. You can create a share link instead.",
      code: known ? error.code : "invitation-unavailable",
    });
  });
  return app;
}
