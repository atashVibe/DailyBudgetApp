import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const backend = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const sharp = backend("sharp");
const { PDFDocument } = backend("pdf-lib");
const { unzipSync } = backend("fflate");

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
  await page.getByText("Forgot Password?", { exact: true }).click();
  await page.getByText("Back to Sign In", { exact: true }).click();
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
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
  await page.goto("/login");
  await expect(
    page.getByText("Budget Overview", { exact: true }),
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
  await expect(
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("0.00").fill("12.50");
  await page.getByText("Save Entry", { exact: true }).click();
  await expect(page.getByLabel(/\$12\.50 - Groceries/).first()).toBeVisible();
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
  await waitForLoginHandlers(page);
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
  await expect(
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
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
  await expect(
    page.getByText("Budget Overview", { exact: true }),
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
    page.getByRole("button", { name: "Save Entry", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/free-family-receipt-info.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page
    .getByRole("button", { name: "Family Settings", exact: true })
    .click();
  await expect(page.getByText("Categories", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("switch", {
      name: "Require receipt for Groceries",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("switch", {
      name: "Require receipt for new category",
      exact: true,
    }),
  ).toBeDisabled();
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
  await expect(
    page.getByText("Budget Overview", { exact: true }),
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
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
  // Back from Settings returns normally, without signing out or showing this dialog.
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page
    .getByRole("button", { name: "Family Settings", exact: true })
    .click();
  await expect(page.getByText("Categories", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sign out of DailyBudget?", { exact: true }),
  ).toHaveCount(0);
  await page.goForward();
  await expect(page.getByText("Categories", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sign out of DailyBudget?", { exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.locator('input[placeholder="Enter your email"]:visible'),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('input[placeholder="Enter your email"]:visible'),
  ).toBeVisible();
});

test("compact paperclip opens one system picker for photos and PDFs, cancels safely and saves an original PDF", async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/localhost:809[134]$/);
  await page.goto("/login");
  await waitForLoginHandlers(page);
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
  await expect(
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("0.00").fill("6.00");
  const clip = page.getByRole("button", {
    name: "Attach receipt",
    exact: true,
  });
  await expect(clip).toBeEnabled();
  const bounds = await clip.boundingBox();
  expect(bounds.width).toBeLessThanOrEqual(48);
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
  await page.getByRole("button", { name: "Save Entry", exact: true }).click();
  await expect(page.getByLabel(/\$6\.00 - Groceries/)).toHaveCount(1);
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
  await page.getByText("Forgot Password?", { exact: true }).click();
  await page.getByText("Back to Sign In", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
  expect(
    (await page.getByPlaceholder("0.00").boundingBox()).height,
  ).toBeGreaterThanOrEqual(60);
  await page.getByRole("button", { name: "Budget period" }).click();
  await page.getByRole("button", { name: "This Year", exact: true }).click();
  await expect(
    page.getByText("Whole year budget", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Budget period" }).click();
  await page.getByRole("button", { name: "This Month", exact: true }).click();
  await page.getByRole("button", { name: "Toggle entry form" }).click();
  await expect(page.getByPlaceholder("0.00")).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle entry form" }).click();
  await expect(page.getByPlaceholder("0.00")).toBeVisible();
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page
    .getByRole("button", { name: "Family Settings", exact: true })
    .click();
  await page.getByText("Choose icon", { exact: true }).first().click();
  await page.getByLabel("Search category icons").fill("cart");
  await page
    .getByRole("button", { name: "Choose cart-outline", exact: true })
    .click();
  await expect(
    page.getByText("Choose a category icon", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/login"); // A saved Android home-screen link must restore, not demand another password.
  await expect(page.getByText("Budget Overview", { exact: true })).toBeVisible({
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
  await expect(page.getByText("Budget Overview", { exact: true })).toBeVisible({
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
  await page.getByText("Forgot Password?", { exact: true }).click();
  await page.getByText("Back to Sign In", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
  const date = page.getByLabel("Entry date", { exact: true });
  const amount = page.getByPlaceholder("0.00");
  await expect(date).toBeVisible();
  const dateBox = await date.boundingBox(),
    amountBox = await amount.boundingBox();
  expect(Math.abs(dateBox.height - 60)).toBeLessThanOrEqual(1);
  expect(Math.abs(dateBox.height - amountBox.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(dateBox.y - amountBox.y)).toBeLessThanOrEqual(1);
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
  await assertSameLine(
    page.getByText("Receipt (optional)", { exact: true }),
    info,
  );
  await info.click();
  await expect(
    page.getByText("To attach a receipt, upgrade your family to Premium.", {
      exact: true,
    }),
  ).toBeVisible();
  await info.click();
  await expect(info).toHaveAttribute("aria-expanded", "false");
  const monthRow = page.getByTestId("month-progress-row");
  await assertSameLine(
    monthRow.getByText("Month Progress", { exact: true }),
    monthRow.getByText(/\d+ of \d+ days/),
  );
  const yearRow = page.getByTestId("yearly-spending-row");
  await assertSameLine(
    yearRow.getByText("Yearly Spending", { exact: true }),
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
  await page.getByRole("button", { name: "Save Entry", exact: true }).click();
  // Collapse first: Edit must both expand the card and scroll the actual page.
  await page.getByRole("button", { name: "Toggle entry form" }).click();
  const entry = page.getByLabel(/\$7\.45 -/).first();
  await entry.scrollIntoViewIfNeeded();
  await entry
    .getByRole("button", { name: "Edit this entry", exact: true })
    .click();
  await expect(page.getByText("Edit Entry", { exact: true })).toBeVisible();
  await expect(amount).toHaveValue("7.45");
  await expect
    .poll(
      async () =>
        (await page.getByText("Edit Entry", { exact: true }).boundingBox()).y,
    )
    .toBeLessThan(160);
  await page.getByText("Cancel Edit", { exact: true }).click();
  premium = true;
  await page.reload();
  const attach = page.getByRole("button", {
    name: "Attach receipt",
    exact: true,
  });
  await expect(attach).toBeVisible();
  await assertSameLine(
    page.getByText("Receipt (optional)", { exact: true }),
    attach,
  );
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
  await page.getByText("Forgot Password?", { exact: true }).click();
  await page.getByText("Back to Sign In", { exact: true }).click();
  await page
    .locator('input[placeholder="Enter your email"]:visible')
    .fill("receipts@example.test");
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("EmulatorOnly123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByText("Budget Overview", { exact: true }),
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
      page.getByText("Budget Overview", { exact: true }),
    ).toBeVisible({ timeout: 40000 });
    expect(await page.evaluate(() => window.connectionErrorShown)).toBe(false);
    await expect(
      page.locator('input[placeholder="Enter your email"]:visible'),
    ).toHaveCount(0);
  } finally {
    clearTimeout(reconnect);
  }
});
