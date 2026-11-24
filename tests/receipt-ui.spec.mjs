import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const backend = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const sharp = backend("sharp");
const { PDFDocument } = backend("pdf-lib");
const { unzipSync } = backend("fflate");

async function openFirstEntryActions(page) {
  const toggle = page
    .getByRole("button", { name: "Entry actions", exact: true })
    .first();
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click();
}

async function waitForLoginHandlers(page) {
  // Google is enabled by a client effect, so it also proves SSR hydration has
  // attached the navigation handlers before a fast automated tap.
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
}

test("Google popup sign-in can be cancelled, retried and restored without entering credentials again", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/);
  // Wait for the app's explicit ready signal below rather than allowing an
  // unrelated third-party resource to keep the first cold-page load pending.
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  // Navigate once so React has hydrated before invoking the click handler.
  await waitForLoginHandlers(page);
  await page.getByText("Forgot password?", { exact: true }).click();
  await page.getByText("Back to sign in", { exact: true }).click();
  const google = page.getByRole("button", {
    name: "Continue with Google",
    exact: true,
  });
  const openGoogle = async () => {
    const opened = page.waitForEvent("popup", { timeout: 25000 });
    await google.click();
    const popup = await opened;
    // Never supply credentials to a real Google service from this test.
    await expect(popup).toHaveURL(
      /^http:\/\/localhost:9099\/emulator\/auth\/handler\?.*providerId=google\.com/,
    );
    await popup.waitForLoadState("domcontentloaded");
    return popup;
  };

  const cancelled = await openGoogle();
  await cancelled.close();
  await expect(google).toBeEnabled({ timeout: 15000 });
  await expect(page.getByText(/Google sign-in failed/)).toHaveCount(0);

  const popup = await openGoogle();
  await popup.getByText("Add new account", { exact: true }).click();
  await popup.locator("#email-input").fill("receipts@example.test");
  await popup.locator("#display-name-input").fill("Demo Google User");
  await popup.getByRole("button", { name: "Sign in with Google.com" }).click();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  await page.goto("/login");
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Enter your email")).toHaveCount(0);
});

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
  await waitForLoginHandlers(page);
  await page.getByText("Forgot password?", { exact: true }).click();
  await expect(
    page.getByText("Reset your password", { exact: true }),
  ).toBeVisible();
  await page.getByText("Back to sign in", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page
    .getByText("Sign in", { exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("0.00").fill("12.50");
  await page.getByText("Add entry", { exact: true }).click();
  await expect(page.getByLabel(/\$12\.50 - Groceries/).first()).toBeVisible();
  await openFirstEntryActions(page);
  await page
    .getByLabel("Manage family receipts for this entry")
    .first()
    .click();
  await expect(
    page.getByText("Receipt uploads are included for your family.", {
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
    page.getByText("Family receipts", { exact: true }).last(),
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
  await waitForLoginHandlers(page);
  await page.getByText("Forgot password?", { exact: true }).click();
  await expect(
    page.getByText("Reset your password", { exact: true }),
  ).toBeVisible();
  await page.getByText("Back to sign in", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page
    .getByText("Sign in", { exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  await page.goto("/settings");
  const requirement = page.getByRole("switch", {
    name: "Require receipt for Groceries",
    exact: true,
  });
  await expect(requirement).toBeVisible();
  if (await requirement.isChecked()) {
    await requirement.uncheck();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  }
  await requirement.check();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByText("This category requires a receipt before you can save.", {
      exact: true,
    }),
  ).toBeVisible();
  const save = page.getByRole("button", { name: "Add entry", exact: true });
  await page.getByPlaceholder("0.00").fill("7.25");
  await expect(save).toBeDisabled();
  await expect(save).toHaveCSS("background-color", "rgb(229, 231, 235)");
  await page.screenshot({
    path: "test-results/required-receipt-disabled.png",
    fullPage: true,
  });
  const attach = async () => {
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Attach receipt", exact: true })
      .click();
    await (
      await chooser
    ).setFiles({
      name: "required-groceries.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(
      page.getByLabel("required-groceries.png", { exact: true }),
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
  await expect(page.getByLabel(/\$7\.25 - Groceries/)).toHaveCount(0);
  await expect(
    page.getByLabel("required-groceries.png", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/upload");
  await save.click();
  await expect(page.getByLabel(/\$7\.25 - Groceries/)).toHaveCount(1);
  await expect(save).toBeDisabled(); // Next required entry starts with no file.
  await openFirstEntryActions(page);
  await page
    .getByLabel("Manage family receipts for this entry")
    .first()
    .click();
  await expect(
    page.getByText("required-groceries.png", { exact: true }),
  ).toBeVisible();
  await page.getByText("Close receipts", { exact: true }).click();
  const requiredRow = page.getByLabel(/\$7\.25 - Groceries/);
  await requiredRow
    .getByRole("button", { name: "Edit this entry", exact: true })
    .click();
  await expect(
    page.getByText("A receipt is already attached to this entry.", {
      exact: true,
    }),
  ).toBeVisible();
  const update = page.getByRole("button", {
    name: "Update entry",
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

test("free families see Premium information while ordinary Premium-family members see Attach receipt", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/);
  let premiumFamily = false;
  await page.route("**/access", async (route) => {
    const response = await route.fetch();
    const access = await response.json();
    await route.fulfill({
      response,
      json: {
        ...access,
        administrator: false,
        administratorFamily: false,
        plan: premiumFamily ? "premium" : "free",
        tier: premiumFamily ? "premium" : "free",
        canUpload: premiumFamily,
        canReplace: premiumFamily,
      },
    });
  });
  await page.goto("/login");
  await waitForLoginHandlers(page);
  await page.getByText("Forgot password?", { exact: true }).click();
  await expect(
    page.getByText("Reset your password", { exact: true }),
  ).toBeVisible();
  await page.getByText("Back to sign in", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page
    .getByText("Sign in", { exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  const info = page.getByRole("button", {
    name: "About Premium receipt attachments",
    exact: true,
  });
  await expect(info).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Attach receipt", exact: true }),
  ).toHaveCount(0);
  await info.click();
  await expect(
    page.getByText("To attach a receipt, upgrade your family to Premium.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add entry", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/free-family-receipt-info.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page
    .getByRole("button", { name: "Family settings", exact: true })
    .click();
  await expect(page.getByText("Budget areas", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("switch", {
      name: "Require receipt for Groceries",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Add category to / }).click();
  await expect(
    page.getByRole("switch", { name: "Require a receipt", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Cancel", exact: true })
    .last()
    .click();
  premiumFamily = true;
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Attach receipt", exact: true }),
  ).toBeVisible();
  await expect(info).toHaveCount(0);
  await expect(
    page.getByText("To attach a receipt, upgrade your family to Premium.", {
      exact: true,
    }),
  ).toHaveCount(0);
});

test("long receipt filenames keep Remove inside a narrow form and dashboard Back confirms sign-out without losing a cancelled draft", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/);
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/login");
  await waitForLoginHandlers(page);
  await page.getByText("Forgot password?", { exact: true }).click();
  await expect(
    page.getByText("Reset your password", { exact: true }),
  ).toBeVisible();
  await page.getByText("Back to sign in", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page
    .getByText("Sign in", { exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("0.00").fill("8.50");
  await page.getByPlaceholder("Optional note").fill("Keep this unsaved entry");
  const name = "17948713060775953945449668494971" + "9".repeat(100) + ".jpg";
  const jpeg = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "blue" },
  })
    .jpeg()
    .toBuffer();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Attach receipt", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({ name, mimeType: "image/jpeg", buffer: jpeg });
  const remove = page.getByRole("button", {
    name: `Remove selected receipt ${name}`,
    exact: true,
  });
  await expect(remove).toBeVisible();
  const bounds = await remove.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: "test-results/long-filename-remove.png",
    fullPage: true,
  });
  await page.goBack();
  await expect(
    page.getByText("Sign out of DailyBudget?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Stay signed in", exact: true })
    .click();
  await expect(page.getByPlaceholder("0.00")).toHaveValue("8.50");
  await expect(page.getByPlaceholder("Optional note")).toHaveValue(
    "Keep this unsaved entry",
  );
  await expect(remove).toBeVisible();
  // Reload also preserves the authenticated session.
  await page.reload();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  // Back from Settings returns normally, without signing out or showing this dialog.
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page
    .getByRole("button", { name: "Family settings", exact: true })
    .click();
  await expect(page.getByText("Budget areas", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sign out of DailyBudget?", { exact: true }),
  ).toHaveCount(0);
  await page.goForward();
  await expect(page.getByText("Budget areas", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sign out of DailyBudget?", { exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  const signOutDialog = page.getByRole("dialog", {
    name: "Sign out confirmation",
    exact: true,
  });
  await expect(signOutDialog).toBeVisible();
  await signOutDialog
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(
    page.locator('input[placeholder="Enter your email"]:visible'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('input[placeholder="Enter your email"]:visible'),
  ).toBeVisible();
});

test("receipt attachment field opens one system picker for photos and PDFs, cancels safely and saves an original PDF", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/);
  await page.goto("/login");
  await waitForLoginHandlers(page);
  await page.getByText("Forgot password?", { exact: true }).click();
  await expect(
    page.getByText("Reset your password", { exact: true }),
  ).toBeVisible();
  await page.getByText("Back to sign in", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page
    .getByText("Sign in", { exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("0.00").fill("6.00");
  const clip = page.getByRole("button", {
    name: "Attach receipt",
    exact: true,
  });
  await expect(clip).toBeEnabled();
  const bounds = await clip.boundingBox();
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize().width,
  );
  expect(bounds.height).toBeLessThanOrEqual(48);
  await expect(
    page.getByRole("button", { name: "Choose a receipt photo", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Choose a receipt PDF", exact: true }),
  ).toHaveCount(0);
  const cancelled = page.waitForEvent("filechooser");
  await clip.click();
  const firstPicker = await cancelled;
  const accept = await firstPicker.element().getAttribute("accept");
  expect(accept).toContain("image/jpeg");
  expect(accept).toContain("image/png");
  expect(accept).toContain("application/pdf");
  expect(await firstPicker.element().getAttribute("capture")).toBeNull();
  await firstPicker.setFiles([]);
  await expect(clip).toBeEnabled();
  await expect(page.getByText("Ready to save", { exact: true })).toHaveCount(0);
  const document = await PDFDocument.create();
  document.addPage();
  const pdf = Buffer.from(await document.save());
  const picked = page.waitForEvent("filechooser");
  await clip.click();
  await (
    await picked
  ).setFiles({
    name: "paperclip-original.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(
    page.getByLabel("paperclip-original.pdf", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/compact-paperclip.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  await expect(page.getByLabel(/\$6\.00 - Groceries/)).toHaveCount(1);
  await openFirstEntryActions(page);
  await page
    .getByLabel("Manage family receipts for this entry")
    .first()
    .click();
  const card = page
    .getByText("paperclip-original.pdf", { exact: true })
    .locator("..");
  const download = page.waitForEvent("download");
  await card.getByText("Download original", { exact: true }).click();
  expect(await readFile(await (await download).path())).toEqual(pdf);
});

test("reference dashboard has tall fields, editable category icons and restores an existing session from the login link", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/);
  await page.goto("/login");
  await waitForLoginHandlers(page);
  await page.getByText("Forgot password?", { exact: true }).click();
  await page.getByText("Back to sign in", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  expect(
    (await page.getByPlaceholder("0.00").boundingBox()).height,
  ).toBeGreaterThanOrEqual(48);
  await page.getByRole("button", { name: "Budget period" }).click();
  await page.getByRole("button", { name: "This year", exact: true }).click();
  await expect(
    page
      .getByRole("progressbar", { name: "Yearly budget used", exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Budget period" }).click();
  await page.getByRole("button", { name: "This month", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Toggle entry form" }),
  ).toHaveCount(0);
  await expect(page.getByPlaceholder("0.00")).toBeVisible();
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page
    .getByRole("button", { name: "Family settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Change icon for / })
    .first()
    .click();
  await page.getByLabel("Search category icons").fill("cart");
  await page
    .getByRole("button", { name: "Choose cart-outline", exact: true })
    .click();
  await expect(
    page.getByText("Choose a category icon", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/login"); // A saved Android home-screen link must restore, not demand another password.
  await expect(page.getByText("Budget overview", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(
    page.locator('input[placeholder="Enter your email"]:visible'),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/reference-dashboard.png",
    fullPage: true,
  });
  // A stalled profile request must offer recovery instead of spinning forever.
  await page.route("**/google.firestore.v1.Firestore/**", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry loading account", exact: true }),
  ).toBeVisible({ timeout: 40000 });
  await expect(
    page.locator('input[placeholder="Enter your email"]:visible'),
  ).toHaveCount(0);
  await page.unroute("**/google.firestore.v1.Firestore/**");
  await page
    .getByRole("button", { name: "Retry loading account", exact: true })
    .click();
  await expect(page.getByText("Budget overview", { exact: true })).toBeVisible({
    timeout: 22000,
  });
});

test("phone controls stay aligned and Edit reveals the expanded form", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/);
  await page.setViewportSize({ width: 393, height: 852 });
  let premium = false;
  await page.route("**/access", async (route) => {
    const response = await route.fetch();
    const access = await response.json();
    await route.fulfill({
      response,
      json: {
        ...access,
        canUpload: premium,
        plan: premium ? "premium" : "free",
      },
    });
  });
  await page.goto("/login");
  await waitForLoginHandlers(page);
  await page.getByText("Forgot password?", { exact: true }).click();
  await page.getByText("Back to sign in", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  const date = page.getByLabel("Entry date", { exact: true });
  const amount = page.getByPlaceholder("0.00");
  await expect(date).toBeVisible();
  const dateBox = await date.boundingBox(),
    amountBox = await amount.boundingBox();
  expect(Math.abs(dateBox.height - 48)).toBeLessThanOrEqual(1);
  expect(amountBox.y).toBeLessThan(dateBox.y);
  expect(amountBox.height).toBeGreaterThanOrEqual(48);
  const assertSameLine = async (left, right) => {
    const a = await left.boundingBox(),
      b = await right.boundingBox();
    expect(
      Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)),
    ).toBeLessThanOrEqual(3);
  };
  const info = page.getByRole("button", {
    name: "About Premium receipt attachments",
  });
  await expect(info).toBeVisible();
  const budgetInfo = page.getByRole("button", {
    name: "Spending calculation",
    exact: true,
  });
  const budgetInfoBox = await budgetInfo.boundingBox();
  const receiptInfoBox = await info.boundingBox();
  expect(receiptInfoBox.width).toBe(20);
  expect(receiptInfoBox.height).toBe(20);
  expect(receiptInfoBox.width).toBe(budgetInfoBox.width);
  expect(receiptInfoBox.height).toBe(budgetInfoBox.height);
  const glyphStyle = (button) =>
    button
      .locator('[dir="auto"]')
      .first()
      .evaluate((icon) => {
        const style = getComputedStyle(icon);
        return {
          text: icon.textContent,
          size: style.fontSize,
          color: style.color,
        };
      });
  expect(await glyphStyle(info)).toEqual(await glyphStyle(budgetInfo));
  await expect(info).toHaveAttribute("aria-expanded", "false");
  await budgetInfo.click();
  await expect(budgetInfo).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("Monthly allowance is earned through today", {
      exact: false,
    }),
  ).toBeVisible();
  await budgetInfo.click();
  await expect(budgetInfo).toHaveAttribute("aria-expanded", "false");
  await assertSameLine(page.getByText("Receipt", { exact: true }), info);
  await info.click();
  await expect(
    page.getByText("To attach a receipt, upgrade your family to Premium.", {
      exact: true,
    }),
  ).toBeVisible();
  await info.click();
  await expect(info).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("month-progress-row")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Budget details", exact: true })
    .click();
  const monthRow = page.getByTestId("month-progress-row");
  await assertSameLine(
    monthRow.getByText("Month progress", { exact: true }),
    monthRow.getByText(/\d+ of \d+ days/),
  );
  const yearRow = page.getByTestId("yearly-spending-row");
  await assertSameLine(
    yearRow.getByText("Yearly spending", { exact: true }),
    yearRow.getByText(/\$/),
  );
  const view = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    overflowing: [
      ...document.querySelectorAll("input[type=date], select"),
    ].some((el) => el.getBoundingClientRect().right > innerWidth),
  }));
  expect(view.content).toBeLessThanOrEqual(view.width);
  expect(view.overflowing).toBe(false);
  await amount.fill("7.45");
  await page.getByPlaceholder("Optional note").fill("Phone edit regression");
  await page.getByRole("button", { name: "Add entry", exact: true }).click();
  // Edit must reveal the always-visible form without changing the entry defaults.
  const entry = page.getByLabel(/\$7\.45 -/).first();
  await entry.scrollIntoViewIfNeeded();
  await entry
    .getByRole("button", { name: "Entry actions", exact: true })
    .click();
  await entry
    .getByRole("button", { name: "Edit this entry", exact: true })
    .click();
  await expect(page.getByText("Edit entry", { exact: true })).toBeVisible();
  await expect(amount).toHaveValue("7.45");
  await expect
    .poll(
      async () =>
        (await page.getByText("Edit entry", { exact: true }).boundingBox()).y,
    )
    .toBeLessThan(160);
  await page.getByText("Cancel edit", { exact: true }).click();
  premium = true;
  await page.reload();
  const attach = page.getByRole("button", {
    name: "Attach receipt",
    exact: true,
  });
  await expect(attach).toBeVisible();
  await assertSameLine(page.getByLabel("Entry date", { exact: true }), attach);
  await page.screenshot({
    path: "test-results/phone-entry-layout.png",
    fullPage: true,
  });
});

test("a brief mobile cloud interruption recovers without reporting a sign-in failure", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/);
  await page.goto("/login");
  await waitForLoginHandlers(page);
  await page.getByText("Forgot password?", { exact: true }).click();
  await page.getByText("Back to sign in", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Budget overview", { exact: true }),
  ).toBeVisible();
  await page.route("**/google.firestore.v1.Firestore/**", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await page.evaluate(() => {
    window.connectionErrorShown = false;
    const check = () => {
      if (
        /Retry loading account|Retry dashboard|Google sign-in failed/.test(
          document.body.innerText,
        )
      )
        window.connectionErrorShown = true;
    };
    new MutationObserver(check).observe(document.body, {
      childList: true,
      subtree: true,
    });
    check();
  });
  const reconnect = setTimeout(() => {
    void page.unroute("**/google.firestore.v1.Firestore/**");
  }, 12000);
  try {
    await expect(
      page.getByText("Budget overview", { exact: true }),
    ).toBeVisible({ timeout: 40000 });
    expect(await page.evaluate(() => window.connectionErrorShown)).toBe(false);
    await expect(
      page.locator('input[placeholder="Enter your email"]:visible'),
    ).toHaveCount(0);
  } finally {
    clearTimeout(reconnect);
  }
});

test("dashboard polish keeps earned allowance, whole-period spending and every entry type intact at 360px", async ({
  page,
}) => {
  expect(process.env.GCLOUD_PROJECT).toBe("demo-dailybudget-receipts");
  const { initializeApp, deleteApp } = backend("firebase-admin/app");
  const { getAuth } = backend("firebase-admin/auth");
  const { getFirestore, Timestamp } = backend("firebase-admin/firestore");
  const fixture = initializeApp(
    { projectId: "demo-dailybudget-receipts" },
    `polish-${Date.now()}`,
  );
  const admin = getAuth(fixture),
    db = getFirestore(fixture);
  const uid = `polish-${Date.now()}`,
    familyId = `${uid}-family`,
    email = `${uid}@example.test`;
  try {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.clock.setFixedTime(new Date("2026-11-15T12:00:00"));
    await admin.createUser({
      uid,
      email,
      password: "EmulatorOnly123!",
      emailVerified: true,
    });
    const batch = db.batch();
    batch.set(db.doc(`users/${uid}`), {
      email,
      activeFamilyId: familyId,
      role: "admin",
    });
    batch.set(db.doc(`families/${familyId}`), {
      name: "Polish family",
      dailyBudget: 30,
      createdBy: uid,
      status: "active",
    });
    batch.set(db.doc(`familyMembers/${familyId}_${uid}`), {
      familyId,
      userId: uid,
      email,
      role: "admin",
      status: "active",
    });
    batch.set(db.doc(`budgetAreas/${uid}-area`), {
      familyId,
      name: "مصروف المنزل",
      isDefault: true,
      isArchived: false,
    });
    for (const [index, type, amount, date] of [
      [1, "expense", 300, "2026-11-15"],
      [2, "income", 100, "2026-11-14"],
      [3, "refund", 40, "2026-11-11"],
      [4, "cashback", 10, "2026-11-15"],
    ]) {
      batch.set(db.doc(`categories/${uid}-${type}`), {
        familyId,
        budgetAreaId: `${uid}-area`,
        name: type === "expense" ? "Groceries" : type,
        type,
        isDefault: type === "expense",
        isArchived: false,
      });
      batch.set(db.doc(`entries/${uid}-${type}`), {
        familyId,
        userId: uid,
        amount,
        type,
        categoryId: `${uid}-${type}`,
        budgetAreaId: `${uid}-area`,
        date,
        note: "Preserved note",
        createdAt: Timestamp.fromMillis(Date.now() + index),
      });
    }
    await batch.commit();
    await page.goto("/login");
    await waitForLoginHandlers(page);
    await page
      .getByPlaceholder("Enter your email", { exact: true })
      .fill(email);
    await page
      .getByPlaceholder("Enter your password", { exact: true })
      .fill("EmulatorOnly123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const overview = page.getByTestId("budget-overview-card");
    await expect(overview.getByText("$190.00", { exact: true })).toBeVisible();
    await expect(
      overview.getByText("$11.88 a day", { exact: true }),
    ).toBeVisible();
    await expect(
      overview.getByText("$260.00 spent (29%)", { exact: true }),
    ).toBeVisible();
    await expect(
      overview.getByText("On track, $190.00 under pace", { exact: true }),
    ).toBeVisible();
    await expect(overview.getByRole("progressbar")).toHaveCount(1);
    const progress = overview.getByRole("progressbar", {
      name: "Monthly budget used",
      exact: true,
    });
    expect(Number(await progress.getAttribute("aria-valuenow"))).toBeCloseTo(
      (260 / 900) * 100,
      5,
    );
    await expect(page.getByTestId("month-progress-row")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Toggle entry form" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Budget area", { exact: true })).toHaveValue(
      `${uid}-area`,
    );
    await expect(
      page.getByLabel("Entry category", { exact: true }),
    ).toHaveValue(`${uid}-expense`);
    await expect(
      page
        .getByLabel("Entry category", { exact: true })
        .locator("option")
        .filter({ hasText: "+ Income" }),
    ).toHaveCount(1);
    await expect(
      page
        .getByLabel("Entry category", { exact: true })
        .locator("option")
        .filter({ hasText: "+ Refund" }),
    ).toHaveCount(1);
    await expect(
      page
        .getByLabel("Entry category", { exact: true })
        .locator("option")
        .filter({ hasText: "+ Cashback" }),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: "View all recent entries", exact: true })
      .click();
    await expect(page.getByText("-$300.00", { exact: true })).toBeVisible();
    for (const amount of ["+$100.00", "+$40.00", "+$10.00"])
      await expect(page.getByText(amount, { exact: true })).toBeVisible();
    await expect(page.getByText("Today", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Yesterday", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add entry", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("greater than zero");
    await page.getByPlaceholder("0.00").fill("0");
    await page.getByRole("button", { name: "Add entry", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("greater than zero");
    expect(
      (await db.collection("entries").where("familyId", "==", familyId).get())
        .size,
    ).toBe(4);
    await page.getByPlaceholder("0.00").fill("12.50");
    await page
      .getByLabel("Entry category", { exact: true })
      .selectOption(`${uid}-income`);
    await expect(
      page.getByRole("button", { name: "Add entry", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add entry", exact: true }).click();
    await expect(page.getByText("Entry added", { exact: true })).toBeVisible();
    await expect(page.getByText("+$12.50", { exact: true })).toBeVisible();
    await expect(
      overview.getByText("$260.00 spent (29%)", { exact: true }),
    ).toBeVisible();
    await page.getByTestId("budget-overview-card").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath("dashboard-overview-360.png"),
      fullPage: true,
    });
    await page
      .getByTestId("new-entry-card")
      .screenshot({ path: test.info().outputPath("dashboard-entry-360.png") });
    await page
      .getByTestId("recent-entries-card")
      .screenshot({ path: test.info().outputPath("dashboard-recent-360.png") });
    const screen = await page.evaluate(() => ({
      width: innerWidth,
      content: document.documentElement.scrollWidth,
      focus: document.activeElement?.getAttribute("aria-label"),
    }));
    expect(screen.content).toBeLessThanOrEqual(screen.width);
    await page.screenshot({
      path: test.info().outputPath("dashboard-polish-360.png"),
      fullPage: true,
    });
    await db.doc(`entries/${uid}-expense`).update({ amount: 600 });
    await page.reload();
    await expect(
      page.getByText("Spending ahead of pace", { exact: true }),
    ).toBeVisible();
    await db.doc(`entries/${uid}-expense`).update({ amount: 1000 });
    await page.reload();
    await expect(page.getByText("Over budget", { exact: true })).toBeVisible();
    await db.doc(`entries/${uid}-expense`).update({ amount: 10 });
    await page.reload();
    await expect(
      page.getByRole("progressbar", {
        name: "Monthly budget used",
        exact: true,
      }),
    ).toHaveAttribute("aria-valuenow", "0");
    await expect(
      page.getByText("-$30.00 spent (-3%)", { exact: true }),
    ).toBeVisible();
  } finally {
    await deleteApp(fixture);
  }
});
