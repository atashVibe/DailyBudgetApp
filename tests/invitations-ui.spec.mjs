import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const backend = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = backend("firebase-admin/app");
const { getAuth } = backend("firebase-admin/auth");
const { getFirestore } = backend("firebase-admin/firestore");
let app, auth, db;
const run = Date.now().toString(36);
test.beforeAll(() => {
  if (
    process.env.GCLOUD_PROJECT !== "demo-dailybudget-receipts" ||
    process.env.FIRESTORE_EMULATOR_HOST !== "localhost:8080" ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== "localhost:9099"
  )
    throw new Error(
      "Invitation browser tests require the isolated local demo emulators.",
    );
  app = initializeApp(
    { projectId: "demo-dailybudget-receipts" },
    `invitation-ui-${run}`,
  );
  auth = getAuth(app);
  db = getFirestore(app);
});
test.afterAll(async () => {
  if (app) await deleteApp(app);
});
test.beforeEach(({ baseURL }) => expect(baseURL).toBe("http://localhost:8093"));
async function seed(tag, withFamily = true) {
  const uid = `invui-${run}-${tag}`,
    email = `${uid}@example.test`,
    password = "EmulatorOnly123!",
    familyId = `${uid}-family`;
  await auth.createUser({ uid, email, password, emailVerified: true });
  if (withFamily) {
    const batch = db.batch();
    batch.set(db.doc(`families/${familyId}`), {
      name: `Invitation ${tag}`,
      status: "active",
      dailyBudget: 30,
      createdBy: uid,
    });
    batch.set(db.doc(`users/${uid}`), {
      activeFamilyId: familyId,
      email,
      role: "admin",
    });
    batch.set(db.doc(`familyMembers/${familyId}_${uid}`), {
      familyId,
      userId: uid,
      email,
      role: "admin",
      status: "active",
    });
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
    await batch.commit();
  }
  return { uid, email, password, familyId };
}
async function login(page, account, inviteCode) {
  await page.goto(inviteCode ? `/login?inviteCode=${inviteCode}` : "/login", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page
    .getByPlaceholder("Enter your email", { exact: true })
    .fill(account.email);
  await page
    .getByPlaceholder("Enter your password", { exact: true })
    .fill(account.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByText(inviteCode ? "Join a family" : "Budget Overview", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 30000 });
}
async function emailInvitation(page, owner, recipient) {
  await login(page, owner);
  await page.goto("/invite-family", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Invitation email", { exact: true }).fill(recipient);
  const sent = page.waitForResponse(
    (response) =>
      response.url() === "http://localhost:8791/invitations" &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Send invitation email", exact: true })
    .click();
  const response = await sent;
  expect(response.status()).toBe(200);
  const invitation = await response.json();
  expect(invitation.status).toBe("accepted");
  await expect(page.getByText(invitation.code, { exact: true })).toBeVisible();
  const mailbox = await db
    .collection("invitationTestMail")
    .where("to", "==", recipient)
    .get();
  expect(mailbox.size).toBe(1);
  expect(mailbox.docs[0].data().text).toContain(invitation.code);
  expect(mailbox.docs[0].data().text).toContain(invitation.joinUrl);
  return invitation;
}
test("free-family receipt viewers expose Premium details without enabling checkout or changing entitlement", async ({
  page,
}) => {
  const owner = await seed("premium");
  await login(page, owner);
  await page.goto("/receipts", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Upgrade family to Premium", exact: true })
    .click();
  await expect(
    page.getByText("Family Premium", { exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Purchases coming soon", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/30-day grace period/)).toBeVisible();
  await expect(page.getByText(/Budget entries remain/)).toBeVisible();
  const plan =
    (await db.doc(`receiptFamilyAccess/${owner.familyId}`).get()).data() || {};
  expect(plan.plan || "free").toBe("free");
  expect(plan.subscriptionStatus).not.toBe("active");
  expect(
    (await db.doc(`receiptAccess/${owner.uid}`).get()).data()?.administrator,
  ).not.toBe(true);
  await page
    .getByRole("button", { name: "Back to family receipts", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Upgrade family to Premium",
      exact: true,
    }),
  ).toBeVisible();
});
test("emailed code and link survive Google sign-in; joining is explicit and email-bound", async ({
  page,
  browser,
}) => {
  const owner = await seed("google-link"),
    recipient = `invitee-google-${run}@example.test`;
  const invitation = await emailInvitation(page, owner, recipient);
  // Retrying the same UI request does not email another code.
  await page
    .getByRole("button", { name: "Send invitation email", exact: true })
    .click();
  await expect(page.getByText(invitation.code, { exact: true })).toBeVisible();
  expect(
    (
      await db
        .collection("invitationTestMail")
        .where("to", "==", recipient)
        .get()
    ).size,
  ).toBe(1);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const invited = await context.newPage();
  try {
    await invited.goto(`/join-invitation?code=${invitation.code}`, {
      waitUntil: "domcontentloaded",
    });
    await invited
      .getByRole("button", { name: "Sign in to join", exact: true })
      .click();
    const google = invited.getByRole("button", {
      name: "Continue with Google",
      exact: true,
    });
    await expect(google).toBeEnabled({ timeout: 30000 });
    const opened = invited.waitForEvent("popup");
    await google.click();
    const popup = await opened;
    await expect(popup).toHaveURL(
      /^http:\/\/localhost:9099\/emulator\/auth\/handler/,
    );
    await popup.waitForLoadState("domcontentloaded");
    await popup.getByText("Add new account", { exact: true }).click();
    await popup.locator("#email-input").fill(recipient);
    await popup.locator("#display-name-input").fill("Invited Google User");
    await popup.getByRole("button", { name: /Sign in with/ }).click();
    await expect(
      invited
        .getByText(`Invitation code: ${invitation.code}`, { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    const user = await auth.getUserByEmail(recipient);
    expect((await db.doc(`users/${user.uid}`).get()).exists).toBe(false);
    await invited
      .getByRole("button", { name: "Join this family", exact: true })
      .click();
    await expect(
      invited.getByText("Budget Overview", { exact: true }),
    ).toBeVisible();
    const profile = (await db.doc(`users/${user.uid}`).get()).data();
    expect(profile.activeFamilyId).toBe(owner.familyId);
    expect(profile.role).toBe("member");
    const member = (
      await db.doc(`familyMembers/${owner.familyId}_${user.uid}`).get()
    ).data();
    expect(member.status).toBe("active");
  } finally {
    await context.close();
  }
});
test("password signup from an invitation grants no family access until email is verified", async ({
  page,
  browser,
}) => {
  const owner = await seed("password-link"),
    recipient = `invitee-password-${run}@example.test`;
  const invitation = await emailInvitation(page, owner, recipient);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const invited = await context.newPage();
  try {
    await invited.goto(`/join-invitation?code=${invitation.code}`, {
      waitUntil: "domcontentloaded",
    });
    await invited
      .getByRole("button", { name: "Create an account to join", exact: true })
      .click();
    await expect(
      invited.getByPlaceholder("Enter 8-digit invitation code"),
    ).toHaveValue(invitation.code);
    await invited
      .getByPlaceholder("Enter your email", { exact: true })
      .fill(recipient);
    await invited
      .getByPlaceholder("Create a password", { exact: true })
      .fill("EmulatorOnly123!");
    await invited
      .getByPlaceholder("Confirm your password", { exact: true })
      .fill("EmulatorOnly123!");
    await invited
      .getByRole("button", { name: "Create Account", exact: true })
      .click();
    await expect(
      invited.getByRole("button", {
        name: "Email me a verification link",
        exact: true,
      }),
    ).toBeVisible();
    const user = await auth.getUserByEmail(recipient);
    expect(user.emailVerified).toBe(false);
    expect((await db.doc(`users/${user.uid}`).get()).exists).toBe(false);
    await expect(
      invited.getByRole("button", { name: "Join this family", exact: true }),
    ).toBeDisabled();
    await invited
      .getByRole("button", {
        name: "Email me a verification link",
        exact: true,
      })
      .click();
    await expect(invited.getByText(/Verification email sent/)).toBeVisible();
    const response = await fetch(
      "http://localhost:9099/emulator/v1/projects/demo-dailybudget-receipts/oobCodes",
    );
    const oob = (await response.json()).oobCodes.find(
      (item) => item.email === recipient && item.requestType === "VERIFY_EMAIL",
    );
    expect(oob).toBeTruthy();
    const applied = await fetch(
      "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-only-key",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oobCode: oob.oobCode }),
      },
    );
    expect(applied.ok).toBe(true);
    await invited
      .getByRole("button", { name: "I verified my email", exact: true })
      .click();
    await expect(
      invited.getByRole("button", { name: "Join this family", exact: true }),
    ).toBeEnabled();
    await invited
      .getByRole("button", { name: "Join this family", exact: true })
      .click();
    await expect(
      invited.getByText("Budget Overview", { exact: true }),
    ).toBeVisible();
    expect(
      (await db.doc(`users/${user.uid}`).get()).data().activeFamilyId,
    ).toBe(owner.familyId);
  } finally {
    await context.close();
  }
});
test("another verified account cannot use an invitation meant for someone else", async ({
  page,
}) => {
  const owner = await seed("wrong-owner"),
    wrong = await seed("wrong-recipient", false);
  const invitation = await emailInvitation(
    page,
    owner,
    `someone-else-${run}@example.test`,
  );
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await login(page, wrong, invitation.code);
  await page
    .getByRole("button", { name: "Join this family", exact: true })
    .click();
  await expect(
    page.getByText(/invalid or has already been used/),
  ).toBeVisible();
  expect((await db.doc(`users/${wrong.uid}`).get()).exists).toBe(false);
});
test("new-family creation is atomic and a failed signup cannot delete an existing signed-in account", async ({
  page,
  browser,
}) => {
  const owner = await seed("signup-protection");
  await login(page, owner);
  await page.goto("/signup", { waitUntil: "load" });
  await page.getByText("Start Family", { exact: true }).click();
  await page
    .getByPlaceholder("Example: Smith Family")
    .fill("Must not be created");
  await page
    .getByPlaceholder("Enter your email", { exact: true })
    .fill(owner.email);
  await page
    .getByPlaceholder("Create a password", { exact: true })
    .fill(owner.password);
  await page
    .getByPlaceholder("Confirm your password", { exact: true })
    .fill(owner.password);
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(
    page.getByText(/already.*use|already.*registered/i),
  ).toBeVisible();
  expect((await auth.getUser(owner.uid)).email).toBe(owner.email);
  expect((await db.doc(`families/${owner.familyId}`).get()).exists).toBe(true);
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const fresh = await context.newPage();
  try {
    const recipient = `new-family-${run}@example.test`;
    await fresh.goto("/signup", { waitUntil: "load" });
    await fresh.getByText("Start Family", { exact: true }).click();
    await fresh
      .getByPlaceholder("Example: Smith Family")
      .fill("Atomic signup family");
    await fresh
      .getByPlaceholder("Enter your email", { exact: true })
      .fill(recipient);
    await fresh
      .getByPlaceholder("Create a password", { exact: true })
      .fill(owner.password);
    await fresh
      .getByPlaceholder("Confirm your password", { exact: true })
      .fill(owner.password);
    await fresh
      .getByRole("button", { name: "Create Account", exact: true })
      .click();
    await expect(
      fresh.getByText("Budget Overview", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const user = await auth.getUserByEmail(recipient);
    const profile = (await db.doc(`users/${user.uid}`).get()).data();
    expect(
      (await db.doc(`families/${profile.activeFamilyId}`).get()).data()
        .createdBy,
    ).toBe(user.uid);
    expect(
      (
        await db
          .doc(`familyMembers/${profile.activeFamilyId}_${user.uid}`)
          .get()
      ).data().role,
    ).toBe("admin");
  } finally {
    await context.close();
  }
});

test("a signed-in account without a profile can create its initial family atomically", async ({
  page,
}) => {
  const account = await seed("family-setup", false);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page
    .getByPlaceholder("Enter your email", { exact: true })
    .fill(account.email);
  await page
    .getByPlaceholder("Enter your password", { exact: true })
    .fill(account.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByText("Family Setup", { exact: true })).toBeVisible();
  await page.getByText("Start Family", { exact: true }).click();
  await page
    .getByPlaceholder("Example: Smith Family")
    .fill("Atomic setup family");
  await page
    .getByRole("button", { name: "Create Family", exact: true })
    .click();
  await expect(
    page.getByText("Budget Overview", { exact: true }),
  ).toBeVisible();
  const profile = (await db.doc(`users/${account.uid}`).get()).data();
  expect(
    (await db.doc(`families/${profile.activeFamilyId}`).get()).data().createdBy,
  ).toBe(account.uid);
  expect(
    (
      await db
        .collection("families")
        .where("createdBy", "==", account.uid)
        .get()
    ).size,
  ).toBe(1);
});
