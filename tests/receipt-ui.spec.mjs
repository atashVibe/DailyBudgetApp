import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const backend = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const sharp = backend("sharp");
const { PDFDocument } = backend("pdf-lib");
const { unzipSync } = backend("fflate");

test("shared family receipts work through the real web interface against isolated emulators", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[13]$/); // Never run this against a real account.
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
  const jpeg = await sharp(png).jpeg().toBuffer();
  const doc = await PDFDocument.create();
  doc.addPage();
  const pdf = Buffer.from(await doc.save());
  await page.goto("/login");
  // Confirm client-side navigation is hydrated before filling controlled fields.
  await page.getByText("Forgot Password?", { exact: true }).click();
  await expect(
    page.getByText("Reset your password", { exact: true }),
  ).toBeVisible();
  await page.getByText("Back to Sign In", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page
    .getByText("Sign In", { exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByText("Budget Summary", { exact: true })).toBeVisible();
  await page.getByPlaceholder("0.00").fill("12.50");
  await page.getByText("Save Entry", { exact: true }).click();
  await expect(page.getByText(/\$12\.50 - Groceries/).first()).toBeVisible();
  await page
    .getByLabel("Manage family receipts for this entry")
    .first()
    .click();
  await expect(
    page.getByText("Receipt administrator — family access included", {
      exact: false,
    }),
  ).toBeVisible();
  const choose = async (label, name, mimeType, buffer) => {
    const chooser = page.waitForEvent("filechooser");
    await page.getByText(label, { exact: true }).click();
    await (await chooser).setFiles({ name, mimeType, buffer });
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(
      page.getByText("Original receipt saved.", { exact: true }),
    ).toBeVisible();
  };
  await choose("Choose a photo", "test-original.png", "image/png", png);
  const card = page
    .getByText("test-original.png", { exact: true })
    .locator("..");
  const downloaded = page.waitForEvent("download");
  await card.getByText("Download original", { exact: true }).click();
  expect(await readFile(await (await downloaded).path())).toEqual(png);
  const popup = page.waitForEvent("popup");
  await card.getByText("View original", { exact: true }).click();
  const viewer = await popup;
  await viewer.waitForURL((url) => url.protocol === "blob:");
  await viewer.close();
  await choose("Choose a PDF", "test-original.pdf", "application/pdf", pdf);
  // The server remains authoritative even when an extra upload is attempted.
  const blocked = page.waitForEvent("filechooser");
  await page.getByText("Choose a photo", { exact: true }).click();
  await (
    await blocked
  ).setFiles({ name: "extra.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await expect(
    page.getByText("This transaction has reached its receipt limit.", {
      exact: true,
    }),
  ).toBeVisible();
  const replacement = page.waitForEvent("filechooser");
  await card.getByText("Replace with photo", { exact: true }).click();
  await (
    await replacement
  ).setFiles({ name: "replacement.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await expect(
    page.getByText("replacement.jpg", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("test-original.png", { exact: true }),
  ).toHaveCount(0);
  const replacedCard = page
    .getByText("replacement.jpg", { exact: true })
    .locator("..");
  page.once("dialog", (dialog) => dialog.accept());
  await replacedCard.getByText("Delete receipt", { exact: true }).click();
  await expect(page.getByText("replacement.jpg", { exact: true })).toHaveCount(
    0,
  );
  // Camera file-input simulation; actual camera hardware remains a device check.
  await choose("Photograph a receipt", "camera.jpg", "image/jpeg", jpeg);
  const exported = page.waitForEvent("download");
  await page.getByText("Export family receipts (ZIP)", { exact: true }).click();
  const zip = unzipSync(
    new Uint8Array(await readFile(await (await exported).path())),
  );
  const manifest = JSON.parse(Buffer.from(zip["manifest.json"]).toString());
  expect(manifest.receipts).toHaveLength(2);
  for (const receipt of manifest.receipts) {
    expect(Buffer.from(zip[receipt.archivePath])).toEqual(
      receipt.mimeType === "application/pdf" ? pdf : jpeg,
    );
  }
  await page.getByText("Close receipts", { exact: true }).click();
  await page.goto("/receipts");
  await expect(
    page.getByText("Family Receipts", { exact: true }).last(),
  ).toBeVisible();
  await page.getByText("Refresh storage overview", { exact: true }).click();
  await expect(
    page.getByText("Receipt records: 2", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/receipt-screen.png",
    fullPage: true,
  });
});
