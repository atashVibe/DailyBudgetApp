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
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/); // Never run this against a real account.
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

test("family admins require category receipts and entry-form attachments gate saving with safe upload retries", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/);
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  await page.goto("/login");
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
  await page.goto("/settings");
  const requirement = page.getByRole("switch", {
    name: "Require receipt for Groceries",
    exact: true,
  });
  await expect(requirement).toBeVisible();
  if (await requirement.isChecked()) {
    await requirement.uncheck();
    await expect(
      page.getByText("Receipt requirement updated.", { exact: true }),
    ).toBeVisible();
  }
  await requirement.check();
  await expect(
    page.getByText("Receipt requirement updated.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByText("This category requires a receipt before you can save.", {
      exact: true,
    }),
  ).toBeVisible();
  const save = page.getByRole("button", { name: "Save Entry", exact: true });
  await page.getByPlaceholder("0.00").fill("7.25");
  await expect(save).toBeDisabled();
  await expect(save).toHaveCSS("background-color", "rgb(156, 163, 175)");
  await page.screenshot({
    path: "test-results/required-receipt-disabled.png",
    fullPage: true,
  });
  const attach = async () => {
    await page
      .getByRole("button", { name: "Attach receipt", exact: true })
      .click();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Choose a receipt photo", exact: true })
      .click();
    await (
      await chooser
    ).setFiles({
      name: "required-groceries.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(
      page.getByText("required-groceries.png — ready to save", { exact: true }),
    ).toBeVisible();
  };
  await attach();
  await expect(save).toBeEnabled();
  await page
    .getByRole("button", {
      name: "Remove selected receipt required-groceries.png",
    })
    .click();
  await expect(save).toBeDisabled();
  await attach();
  await page.route("**/upload", async (route) =>
    route.fulfill({
      status: 503,
      headers: { "Access-Control-Allow-Origin": baseURL },
      contentType: "application/json",
      body: JSON.stringify({ message: "Test upload failure. Please retry." }),
    }),
  );
  await save.click();
  await expect(
    page.getByText("Test upload failure. Please retry.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/\$7\.25 - Groceries/)).toHaveCount(0);
  await expect(
    page.getByText("required-groceries.png — ready to save", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/upload");
  await save.click();
  await expect(page.getByText(/\$7\.25 - Groceries/)).toHaveCount(1);
  await expect(save).toBeDisabled(); // Next required entry starts with no file.
  await page
    .getByLabel("Manage family receipts for this entry")
    .first()
    .click();
  await expect(
    page.getByText("required-groceries.png", { exact: true }),
  ).toBeVisible();
  await page.getByText("Close receipts", { exact: true }).click();
  const requiredRow = page
    .getByText(/\$7\.25 - Groceries/)
    .locator("..")
    .locator("..");
  await requiredRow
    .getByRole("button", { name: "Edit this entry", exact: true })
    .click();
  await expect(
    page.getByText("A receipt is already attached to this entry.", {
      exact: true,
    }),
  ).toBeVisible();
  const update = page.getByRole("button", {
    name: "Update Entry",
    exact: true,
  });
  await expect(update).toBeEnabled();
  await page
    .getByPlaceholder("Optional note")
    .fill("Edited with existing receipt");
  await update.click();
  await expect(page.getByText(/Edited with existing receipt/)).toBeVisible();
  // A category change in another tab updates the still-open form without refreshing.
  const settings = await page.context().newPage();
  await settings.goto("/settings");
  await settings
    .getByRole("switch", { name: "Require receipt for Groceries", exact: true })
    .uncheck();
  await expect(
    page.getByText("This category requires a receipt before you can save.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(save).toBeEnabled();
  await settings.close();
  await page.screenshot({
    path: "test-results/required-receipt-form.png",
    fullPage: true,
  });
});
