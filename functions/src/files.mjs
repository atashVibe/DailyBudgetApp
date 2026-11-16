import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { ReceiptError } from "./policy.mjs";

export async function validateOriginal(bytes, claimedMime, maxBytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0)
    throw new ReceiptError(400, "The file is empty.");
  if (bytes.length > maxBytes)
    throw new ReceiptError(413, "This file exceeds the receipt size limit.");
  const detected = await fileTypeFromBuffer(bytes);
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (
    !detected ||
    !allowed.includes(detected.mime) ||
    detected.mime !== claimedMime
  ) {
    throw new ReceiptError(
      415,
      "Choose an original JPG, JPEG, PNG, or PDF with matching file content.",
    );
  }
  try {
    if (detected.mime === "application/pdf") {
      const pdf = await PDFDocument.load(bytes, {
        ignoreEncryption: false,
        updateMetadata: false,
      });
      if (pdf.getPageCount() > 1000) throw new Error("Too many pages");
    } else {
      // Decode to validate content, but never store this decoded/re-encoded output.
      await sharp(bytes, {
        limitInputPixels: 40_000_000,
        failOn: "warning",
      }).stats();
    }
  } catch {
    throw new ReceiptError(
      415,
      "The file is damaged, encrypted, or too complex to accept safely.",
    );
  }
  return detected.mime;
}
