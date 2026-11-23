import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const backend = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = backend("firebase-admin/app");
const { getAuth } = backend("firebase-admin/auth");
const { getFirestore } = backend("firebase-admin/firestore");
const sharp = backend("sharp");
const projectId = "demo-dailybudget-receipts";
let app, adminAuth, db;
const run = Date.now().toString(36);

test.beforeAll(() => {
  if (
    process.env.GCLOUD_PROJECT !== projectId ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "localhost:9099" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "localhost:8080"
  )
    throw new Error(
      "Account deletion tests require the isolated demo project and local Auth/Firestore emulators.",
    );
  app = initializeApp({ projectId }, `account-ui-${run}`);
  adminAuth = getAuth(app);
  db = getFirestore(app);
});
test.afterAll(async () => {
  if (app) await deleteApp(app);
});
test.beforeEach(({ baseURL }) => {
  expect(baseURL).toBe("http://localhost:8093");
});

async function seed(
  tag,
  { google = true, shared = false, otherAdmin = true } = {},
) {
  const uid = `account-${run}-${tag}`,
    familyId = `${uid}-family`;
  const email = `${uid}@example.test`,
    password = "EmulatorOnly123!";
  await adminAuth.createUser({
    uid,
    email,
    emailVerified: true,
    ...(google ? {} : { password }),
  });
  if (google)
    await adminAuth.updateUser(uid, {
      providerToLink: {
        providerId: "google.com",
        uid: `google-${uid}`,
        email,
        displayName: tag,
      },
    });
  const otherUid = `${uid}-other`,
    otherEmail = `${otherUid}@example.test`;
  if (shared)
    await adminAuth.createUser({
      uid: otherUid,
      email: otherEmail,
      emailVerified: true,
      password,
    });
  const data = {
    familyId,
    userId: uid,
    role: "admin",
    status: "active",
    email,
  };
  const batch = db.batch();
  batch.set(db.doc(`families/${familyId}`), {
    name: `Test ${tag}`,
    createdBy: uid,
    dailyBudget: 30,
    status: "active",
  });
  batch.set(db.doc(`users/${uid}`), {
    activeFamilyId: familyId,
    role: "admin",
    email,
  });
  batch.set(db.doc(`familyMembers/${familyId}_${uid}`), data);
  batch.set(db.doc(`budgetAreas/${familyId}-area`), {
    familyId,
    name: "Daily Life",
    isDefault: true,
    isArchived: false,
    createdBy: uid,
  });
  batch.set(db.doc(`categories/${familyId}-category`), {
    familyId,
    budgetAreaId: `${familyId}-area`,
    name: "Grocery",
    type: "expense",
    isDefault: true,
    isArchived: false,
    createdBy: uid,
  });
  batch.set(db.doc(`entries/${familyId}-entry`), {
    familyId,
    userId: uid,
    budgetAreaId: `${familyId}-area`,
    categoryId: `${familyId}-category`,
    type: "expense",
    amount: 12.5,
    date: "2026-11-21",
    note: "Shared history remains",
    createdAt: new Date(),
  });
  batch.set(db.doc(`receiptFamilyAccess/${familyId}`), {
    plan: "premium",
    subscriptionStatus: "active",
  });
  if (shared) {
    batch.set(db.doc(`familyMembers/${familyId}_${otherUid}`), {
      familyId,
      userId: otherUid,
      role: otherAdmin ? "admin" : "member",
      status: "active",
      email: otherEmail,
    });
    batch.set(db.doc(`users/${otherUid}`), {
      activeFamilyId: familyId,
      role: otherAdmin ? "admin" : "member",
      email: otherEmail,
    });
  }
  await batch.commit();
  return { uid, email, password, familyId, otherUid, otherEmail };
}
async function googlePopup(page, click) {
  const opened = page.waitForEvent("popup", { timeout: 25000 });
  await click();
  const popup = await opened;
  await expect(popup).toHaveURL(
    /^http:\/\/localhost:9099\/emulator\/auth\/handler\?.*providerId=google\.com/,
  );
  await popup.waitForLoadState("domcontentloaded");
  return popup;
}
async function chooseGoogle(popup, email) {
  const existing = popup.getByRole("listitem").filter({ hasText: email });
  await popup.getByText("Add new account", { exact: true }).waitFor();
  if (await existing.isVisible()) {
    await existing.click();
    return;
  }
  await popup.getByText("Add new account", { exact: true }).click();
  await popup.locator("#email-input").fill(email);
  await popup.locator("#display-name-input").fill("Disposable Google User");
  await popup.getByRole("button", { name: /Sign in with/ }).click();
}
async function login(page, account, google = true) {
  await page.goto("/login");
  const button = page.getByRole("button", {
    name: "Continue with Google",
    exact: true,
  });
  await expect(button).toBeEnabled({ timeout: 30000 });
  if (google)
    await chooseGoogle(
      await googlePopup(page, () => button.click()),
      account.email,
    );
  else {
    await page
      .locator('input[placeholder="Enter your email"]:visible')
      .fill(account.email);
    await page
      .locator('input[placeholder="Enter your password"]:visible')
      .fill(account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  }
  await expect(page.getByText("Budget overview", { exact: true })).toBeVisible({
    timeout: 20000,
  });
}
async function openDelete(page) {
  await page.getByRole("button", { name: "Show navigation menu" }).click();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  const button = page.getByRole("button", {
    name: "Delete account permanently",
    exact: true,
  });
  await expect(button).toBeDisabled();
  await page.getByPlaceholder("DELETE", { exact: true }).fill("DELETE");
  return button;
}
async function assertUntouched(a) {
  expect((await db.doc(`users/${a.uid}`).get()).exists).toBe(true);
  expect(
    (await db.doc(`familyMembers/${a.familyId}_${a.uid}`).get()).exists,
  ).toBe(true);
  expect(
    (await db.doc(`entries/${a.familyId}-entry`).get()).data().userId,
  ).toBe(a.uid);
  expect((await adminAuth.getUser(a.uid)).uid).toBe(a.uid);
}

// All accounts and all destructive operations in this file are emulator-only.
test("wrong Google identity and cancellation keep the original account and data", async ({
  page,
}) => {
  const a = await seed("reject", { shared: true });
  await login(page, a);
  let deletes = 0;
  await page.route("**/delete-account-receipts", (route) => {
    deletes++;
    return route.continue();
  });
  const button = await openDelete(page);
  await expect(button).toBeEnabled({ timeout: 30000 });
  const wrongEmail = a.otherEmail;
  await adminAuth.updateUser(a.otherUid, {
    providerToLink: {
      providerId: "google.com",
      uid: `google-${a.otherUid}`,
      email: wrongEmail,
    },
  });
  await chooseGoogle(await googlePopup(page, () => button.click()), wrongEmail);
  await expect(
    page.getByText(
      "Choose the same Google account you use for DailyBudget. Nothing was deleted.",
      { exact: true },
    ),
  ).toBeVisible();
  await assertUntouched(a);
  expect((await adminAuth.getUserByEmail(wrongEmail)).uid).toBe(a.otherUid);
  expect(deletes).toBe(0);
  await expect(button).toBeEnabled({ timeout: 30000 });
  const cancelled = await googlePopup(page, () => button.click());
  await cancelled.close();
  await expect(
    page.getByText("Sign-in confirmation was cancelled. Nothing was deleted.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });
  await assertUntouched(a);
  expect(deletes).toBe(0);
  await page.getByRole("button", { name: "Cancel account deletion" }).click();
  await page.goto("/");
  await expect(page.getByText(a.email, { exact: true })).toBeVisible();
});

test("same Google user can delete their profile while another family member keeps history and originals", async ({
  page,
  browser,
  baseURL,
}) => {
  const a = await seed("shared", { shared: true });
  await login(page, a);
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  await page
    .getByRole("button", { name: "Manage family receipts for this entry" })
    .first()
    .click();
  const picked = page.waitForEvent("filechooser");
  await page.getByText("Choose a photo", { exact: true }).click();
  await (
    await picked
  ).setFiles({
    name: "shared-original.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(
    page.getByText("Original receipt saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close receipts", exact: true })
    .click();
  const receipt = (
    await db.collection("receipts").where("familyId", "==", a.familyId).get()
  ).docs[0];
  const button = await openDelete(page);
  await expect(button).toBeEnabled({ timeout: 30000 });
  await chooseGoogle(await googlePopup(page, () => button.click()), a.email);
  await expect(page.getByPlaceholder("Enter your email")).toBeVisible({
    timeout: 30000,
  });
  await expect(adminAuth.getUser(a.uid)).rejects.toMatchObject({
    code: "auth/user-not-found",
  });
  expect((await db.doc(`users/${a.uid}`).get()).exists).toBe(false);
  expect(
    (await db.doc(`familyMembers/${a.familyId}_${a.uid}`).get()).exists,
  ).toBe(false);
  const entry = (await db.doc(`entries/${a.familyId}-entry`).get()).data();
  expect(entry.amount).toBe(12.5);
  expect(entry.userId).toBeUndefined();
  expect((await db.doc(`families/${a.familyId}`).get()).exists).toBe(true);
  expect((await receipt.ref.get()).data().status).toBe("ready");
  expect((await receipt.ref.get()).data().userId).toBeNull();
  const peer = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: test.info().project.use.ignoreHTTPSErrors === true,
  });
  try {
    const member = await peer.newPage();
    await login(member, { email: a.otherEmail, password: a.password }, false);
    await expect(member.getByLabel(/\$12\.50 -/).first()).toBeVisible();
    await member
      .getByRole("button", { name: "Manage family receipts for this entry" })
      .first()
      .click();
    const download = member.waitForEvent("download");
    await member.getByText("Download original", { exact: true }).click();
    expect(await readFile(await (await download).path())).toEqual(png);
  } finally {
    await peer.close();
  }
  const google = page.getByRole("button", {
    name: "Continue with Google",
    exact: true,
  });
  await expect(google).toBeEnabled({ timeout: 30000 });
  await chooseGoogle(await googlePopup(page, () => google.click()), a.email);
  await expect(page.getByText("Family setup", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  const recreated = await adminAuth.getUserByEmail(a.email);
  expect(recreated.uid).not.toBe(a.uid);
  expect(
    (await db.doc(`familyMembers/${a.familyId}_${recreated.uid}`).get()).exists,
  ).toBe(false);
});

test("password confirmation rejects a wrong password and removes a sole-member family only after confirmation", async ({
  page,
}) => {
  const a = await seed("password", { google: false });
  await login(page, a, false);
  let deletes = 0;
  await page.route("**/delete-account-receipts", (route) => {
    deletes++;
    return route.continue();
  });
  const button = await openDelete(page);
  await expect(button).toBeDisabled();
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill("WrongPassword123!");
  await expect(button).toBeEnabled({ timeout: 30000 });
  await button.click();
  await expect(
    page.getByText("That password is incorrect. Please try again.", {
      exact: true,
    }),
  ).toBeVisible();
  await assertUntouched(a);
  expect(deletes).toBe(0);
  await page
    .locator('input[placeholder="Enter your password"]:visible')
    .fill(a.password);
  await button.click();
  await expect(page.getByPlaceholder("Enter your email")).toBeVisible({
    timeout: 30000,
  });
  expect(deletes).toBe(1);
  for (const path of [
    `users/${a.uid}`,
    `families/${a.familyId}`,
    `familyMembers/${a.familyId}_${a.uid}`,
    `entries/${a.familyId}-entry`,
    `budgetAreas/${a.familyId}-area`,
    `categories/${a.familyId}-category`,
  ])
    expect((await db.doc(path).get()).exists).toBe(false);
  await expect(adminAuth.getUser(a.uid)).rejects.toMatchObject({
    code: "auth/user-not-found",
  });
});

test("the only admin of a shared family is blocked before a Google confirmation window", async ({
  page,
}) => {
  const a = await seed("last-admin", { shared: true, otherAdmin: false });
  await login(page, a);
  let popups = 0;
  page.on("popup", () => popups++);
  const button = await openDelete(page);
  await expect(
    page.getByText("You are the only administrator", { exact: false }),
  ).toBeVisible({ timeout: 30000 });
  await expect(button).toBeDisabled();
  expect(popups).toBe(0);
  await assertUntouched(a);
});

test("ownership is checked again after Google confirmation before any cleanup", async ({
  page,
}) => {
  const a = await seed("ownership-change", { shared: true });
  await login(page, a);
  let deletes = 0;
  await page.route("**/delete-account-receipts", (route) => {
    deletes++;
    return route.continue();
  });
  const button = await openDelete(page);
  await expect(button).toBeEnabled({ timeout: 30000 });
  const popup = await googlePopup(page, () => button.click());
  await db
    .doc(`familyMembers/${a.familyId}_${a.otherUid}`)
    .update({ role: "member" });
  await chooseGoogle(popup, a.email);
  await expect(
    page.getByText("You are the only administrator", { exact: false }),
  ).toBeVisible();
  expect(deletes).toBe(0);
  await assertUntouched(a);
});
