import express from "express";
import { Zip, ZipPassThrough, strToU8 } from "fflate";
import { ReceiptError, identifier } from "./policy.mjs";

export function createReceiptApi(service, auth, subscriptions, families) {
  const app = express();
  app.disable("x-powered-by");
  app.use(async (req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    try {
      const match = /^Bearer (\S+)$/.exec(req.get("Authorization") || "");
      if (!match) throw new ReceiptError(401, "Please sign in again.");
      try {
        req.receiptUid = (await auth.verifyIdToken(match[1], true)).uid;
      } catch {
        throw new ReceiptError(
          401,
          "Your sign-in has expired. Please sign in again.",
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  });
  app.use(express.json({ limit: "16kb" }));
  app.use(express.raw({ type: "application/octet-stream", limit: "26mb" }));
  const route = (handler) => async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
  if (families) {
    app.get(
      "/family/leave",
      route(async (req, res) =>
        res.json(await families.prepare(req.receiptUid)),
      ),
    );
    app.post(
      "/family/leave",
      route(async (req, res) =>
        res.json(await families.leave(req.receiptUid, req.body)),
      ),
    );
  }
  if (subscriptions) {
    app.get(
      "/subscription",
      route(async (req, res) =>
        res.json(await subscriptions.overview(req.receiptUid)),
      ),
    );
    app.post(
      "/subscription/prepare",
      route(async (req, res) =>
        res.json(await subscriptions.prepare(req.receiptUid, req.body.store)),
      ),
    );
    app.post(
      "/subscription/refresh",
      route(async (req, res) =>
        res.json(await subscriptions.refresh(req.receiptUid)),
      ),
    );
    app.post(
      "/subscription/verify",
      route(async (req, res) =>
        res.json(await subscriptions.verify(req.body, req.receiptUid)),
      ),
    );
  }
  app.post(
    "/subscription/cleanup-review",
    route(async (req, res) =>
      res.json(
        await service.downgradeReview(req.receiptUid, req.body.preference),
      ),
    ),
  );
  app.post(
    "/subscription/cleanup-remove",
    route(async (req, res) =>
      res.json(await service.removeDowngradeExtras(req.receiptUid, req.body)),
    ),
  );
  app.get(
    "/access",
    route(async (req, res) => {
      res.json({
        ...(await service.getAccess(req.receiptUid)),
        usage: await service.getUsage(req.receiptUid),
      });
    }),
  );
  app.get(
    "/receipts",
    route(async (req, res) => {
      const transactionId = req.query.transactionId
        ? identifier(req.query.transactionId)
        : undefined;
      res.json(await service.list(req.receiptUid, transactionId));
    }),
  );
  app.post(
    "/categories/receipt-requirement",
    route(async (req, res) =>
      res.json(await service.setCategoryRequirement(req.receiptUid, req.body)),
    ),
  );
  app.post(
    "/entry-drafts",
    route(async (req, res) =>
      res.json(await service.startDraft(req.receiptUid, req.body || {})),
    ),
  );
  app.post(
    "/entry-drafts/commit",
    route(async (req, res) =>
      res.json(await service.finalizeDraft(req.receiptUid, req.body || {})),
    ),
  );
  app.post(
    "/upload",
    route(async (req, res) => {
      let name;
      try {
        name = decodeURIComponent(req.get("X-Receipt-Filename") || "receipt");
      } catch {
        throw new ReceiptError(400, "Invalid filename.");
      }
      res.json(
        await service.upload(req.receiptUid, {
          transactionId: req.get("X-Receipt-Transaction"),
          requestId: req.get("X-Receipt-Request"),
          replaceId: req.get("X-Receipt-Replace") || null,
          originalFilename: name,
          mimeType: req.get("X-Receipt-Mime"),
          bytes: req.rawBody || req.body,
        }),
      );
    }),
  );
  app.delete(
    "/receipts/:id",
    route(async (req, res) =>
      res.json(await service.deleteReceipt(req.receiptUid, req.params.id)),
    ),
  );
  app.post(
    "/delete-account-receipts",
    route(async (req, res) =>
      res.json(await service.purgeAccount(req.receiptUid)),
    ),
  );
  app.get(
    "/file/:id",
    route(async (req, res) => {
      const { record, file } = await service.readFile(
        req.receiptUid,
        req.params.id,
      );
      res.set("Content-Type", record.mimeType);
      res.set(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(record.originalFilename)}`,
      );
      const stream = file.createReadStream();
      stream.on("error", () => {
        if (res.headersSent) res.destroy();
        else
          res.status(503).json({
            message: "The original receipt is unavailable. Please retry.",
            code: "download-failed",
          });
      });
      res.on("close", () => {
        if (!res.writableFinished) stream.destroy();
      });
      stream.pipe(res);
    }),
  );
  app.get(
    "/export",
    route(async (req, res) => {
      let items = await service.exportReceipts(req.receiptUid);
      if (req.query.keep) {
        const review = await service.downgradeReview(
          req.receiptUid,
          req.query.keep,
        );
        if (review.fingerprint !== req.query.review)
          throw new ReceiptError(
            409,
            "Your receipts changed. Review the extras again.",
          );
        const part = Number(req.query.part);
        if (
          !Number.isSafeInteger(part) ||
          part < 0 ||
          part >= review.exportParts.length
        )
          throw new ReceiptError(400, "Choose a valid extra-receipt ZIP part.");
        const ids = new Set(review.exportParts[part]);
        items = items.filter((item) => ids.has(item.record.receiptId));
      }
      res.set("Content-Type", "application/zip");
      res.set(
        "Content-Disposition",
        "attachment; filename=dailybudget-receipts.zip",
      );
      let currentStream,
        waiting = false;
      const archive = new Zip((error, data, final) => {
        if (error) {
          res.destroy(error);
          return;
        }
        waiting = !res.write(Buffer.from(data));
        if (final) res.end();
      });
      res.on("close", () => {
        if (!res.writableFinished) {
          currentStream?.destroy();
          archive.terminate();
        }
      });
      const push = async (entry, data, final) => {
        if (res.destroyed) throw new Error("Export connection closed");
        entry.push(data, final);
        if (waiting && !res.destroyed)
          await new Promise((resolve, reject) => {
            const cleanup = () => {
              res.off("drain", drained);
              res.off("close", closed);
            };
            const drained = () => {
              cleanup();
              resolve();
            };
            const closed = () => {
              cleanup();
              reject(new Error("Export connection closed"));
            };
            res.once("drain", drained);
            res.once("close", closed);
          });
      };
      const manifest = [];
      try {
        for (const { record, file, path } of items) {
          const entry = new ZipPassThrough(path);
          archive.add(entry);
          currentStream = file.createReadStream();
          for await (const chunk of currentStream)
            await push(entry, new Uint8Array(chunk), false);
          await push(entry, new Uint8Array(), true);
          manifest.push({
            receiptId: record.receiptId,
            transactionId: record.transactionId,
            familyId: record.familyId,
            uploadedBy: record.userId,
            updatedBy: record.updatedBy,
            transactionDate: record.transactionDate,
            merchant: record.merchant,
            originalFilename: record.originalFilename,
            mimeType: record.mimeType,
            fileSize: record.fileSize,
            sha256: record.sha256,
            archivePath: path,
          });
        }
        const manifestEntry = new ZipPassThrough("manifest.json");
        archive.add(manifestEntry);
        await push(
          manifestEntry,
          strToU8(
            JSON.stringify({ formatVersion: 1, receipts: manifest }, null, 2),
          ),
          true,
        );
        const readme = new ZipPassThrough("README.txt");
        archive.add(readme);
        await push(
          readme,
          strToU8(
            "Originals are organized by transaction year. Verify SHA-256 hashes against manifest.json. Preserve this ZIP independently of DailyBudget. Original files remain readable without a subscription or application access.\n",
          ),
          true,
        );
        archive.end();
      } catch (error) {
        archive.terminate();
        res.destroy(error);
      }
    }),
  );
  app.get(
    "/admin",
    route(async (req, res) =>
      res.json(await service.adminStats(req.receiptUid)),
    ),
  );
  app.post(
    "/admin/access",
    route(async (req, res) =>
      res.json(
        await service.setAccess(
          req.receiptUid,
          ["grant-admin", "revoke-admin"].includes(req.body.action)
            ? req.body.userId
            : req.body.familyId,
          req.body.action,
          req.body,
        ),
      ),
    ),
  );
  app.use((req, res) =>
    res.status(404).json({ message: "Receipt action not found." }),
  );
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.status || (error.type === "entity.too.large" ? 413 : 503);
    res.status(status).json({
      message:
        status < 500
          ? error.message
          : "Receipt storage is unavailable. Your budget entry is safe. Please retry.",
      code: error.code || "receipt-service-unavailable",
    });
  });
  return app;
}
