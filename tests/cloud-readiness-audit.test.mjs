import test from "node:test";
import assert from "node:assert/strict";
import {
  collectCloudReadiness,
  collectInvitationMailAudit,
  createGoogleReader,
} from "../functions/scripts/cloud-readiness-audit.mjs";

test("mail diagnostics project only delivery outcomes and never reveal sender values, recipients, codes or tokens", async () => {
  const hidden = "PRIVATE_VALUE_MUST_NOT_APPEAR";
  const calls = [];
  const report = await collectInvitationMailAudit(
    createGoogleReader(hidden, async (url, options) => {
      calls.push(url);
      assert.equal(options.method, "GET");
      assert.equal(options.headers["x-goog-user-project"], "dailybudget-35c26");
      assert.equal(options.headers.Authorization, `Bearer ${hidden}`);
      if (url.includes("cloudfunctions.googleapis.com")) {
        return Response.json({
          serviceConfig: {
            environmentVariables: {
              INVITATION_SMTP_USER: hidden,
              INVITATION_SMTP_HOST: "smtp.gmail.com",
              INVITATION_SMTP_PORT: "465",
              INVITATION_SMTP_PASSWORD: hidden,
            },
            secretEnvironmentVariables: [
              {
                key: "INVITATION_SMTP_PASSWORD",
                secret: "INVITATION_SMTP_PASSWORD",
                version: hidden,
              },
            ],
          },
        });
      }
      const query = new URL(url);
      assert.ok(query.pathname.endsWith("/documents/invitationDeliveries"));
      assert.equal(query.searchParams.get("pageSize"), "5");
      assert.equal(query.searchParams.get("orderBy"), "createdAt desc");
      assert.deepEqual(query.searchParams.getAll("mask.fieldPaths"), [
        "state",
        "failure",
        "createdAt",
      ]);
      return Response.json({
        documents: [
          {
            name: hidden,
            fields: {
              state: { stringValue: "failed" },
              failure: { stringValue: "email-setup" },
              email: { stringValue: hidden },
              code: { stringValue: hidden },
              createdAt: { timestampValue: "2026-11-23T21:00:00Z" },
            },
          },
          {
            name: hidden,
            fields: {
              state: { stringValue: "accepted" },
              secret: { stringValue: hidden },
            },
          },
          {
            name: hidden,
            fields: {
              state: { stringValue: hidden },
              failure: { stringValue: hidden },
              createdAt: { timestampValue: hidden },
            },
          },
        ],
      });
    }),
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(report.senderSetup.details, {
    senderMatches: false,
    hostMatches: true,
    portMatches: true,
    passwordSecretAttached: true,
  });
  assert.deepEqual(report.recentAttempts.details, [
    {
      state: "failed",
      failure: "email-setup",
      createdAt: "2026-11-23T21:00:00.000Z",
    },
    { state: "accepted" },
    { state: "unknown" },
  ]);
  assert.ok(!JSON.stringify(report).includes(hidden));
});

test("mail audit distinguishes blocked reads from an actually empty automatic delivery history", async () => {
  const blocked = await collectInvitationMailAudit(
    createGoogleReader("TOKEN", async () =>
      Response.json(
        { error: { message: "SECRET_PROVIDER_TEXT" } },
        { status: 403 },
      ),
    ),
  );
  assert.equal(blocked.senderSetup.status, "blocked");
  assert.equal(blocked.recentAttempts.status, "blocked");
  assert.ok(!JSON.stringify(blocked).includes("SECRET_PROVIDER_TEXT"));
  const empty = await collectInvitationMailAudit(
    createGoogleReader("TOKEN", async () => Response.json({})),
  );
  assert.equal(empty.recentAttempts.status, "checked");
  assert.deepEqual(empty.recentAttempts.details, []);
  assert.equal(empty.senderSetup.details.passwordSecretAttached, false);
});

test("cloud report sends GET only to Google, excludes unrelated budgets and never prints credentials or function secrets", async () => {
  const calls = [];
  const secret = "FAKE_OWNER_TOKEN_DO_NOT_PRINT";
  const fetchMock = async (url, options) => {
    calls.push({ url, method: options.method });
    assert.equal(options.headers.Authorization, `Bearer ${secret}`);
    assert.equal(options.method, "GET");
    assert.equal(options.headers["x-goog-user-project"], "dailybudget-35c26");
    let data = {};
    if (url.endsWith("/databases/(default)"))
      data = {
        locationId: "us-west2",
        pointInTimeRecoveryEnablement: "DISABLED",
      };
    else if (url.endsWith("/billingInfo"))
      data = {
        billingEnabled: true,
        billingAccountName: "billingAccounts/owner",
      };
    else if (url.includes("/budgets"))
      data = {
        budgets: [
          {
            displayName: "DailyBudget",
            budgetFilter: { projects: ["projects/420817333542"] },
            amount: { specifiedAmount: { units: "10", currencyCode: "USD" } },
          },
          {
            displayName: "Unrelated",
            budgetFilter: { projects: ["projects/other"] },
          },
        ],
      };
    else if (url.endsWith("/receiptsApi"))
      data = {
        state: "ACTIVE",
        serviceConfig: {
          serviceAccountEmail: "runtime@example.test",
          environmentVariables: { secret },
        },
      };
    return new Response(JSON.stringify(data), { status: 200 });
  };
  const report = await collectCloudReadiness(
    createGoogleReader(secret, fetchMock),
  );
  assert.equal(report.checks.database.details.location, "us-west2");
  assert.equal(report.checks.backupSchedules.status, "checked");
  assert.equal(report.checks.billingAlerts.details.length, 1);
  assert.equal(report.checks.billingAlerts.details[0].name, "DailyBudget");
  assert.ok(!JSON.stringify(report).includes(secret));
  assert.ok(!JSON.stringify(report).includes("Unrelated"));
  assert.ok(!JSON.stringify(report).includes("environmentVariables"));
  assert.ok(report.stillNeedsVerification.some((s) => s.includes("restore")));
  assert.ok(calls.length >= 9);
  await assert.rejects(
    createGoogleReader(secret, fetchMock)("https://example.com/steal"),
    /fixed Google admin APIs/,
  );
});

test("missing cloud permissions stay blocked rather than being reported as empty or verified", async () => {
  const read = createGoogleReader(
    "FAKE",
    async (url) =>
      new Response(
        url.includes("billingInfo") ? "do not echo this body" : "denied",
        { status: 403 },
      ),
  );
  const report = await collectCloudReadiness(read);
  assert.equal(report.checks.database.status, "blocked");
  assert.equal(report.checks.bucket.status, "blocked");
  assert.equal(report.checks.backupSchedules.status, "blocked");
  assert.equal(report.checks.billingEnabled.status, "blocked");
  assert.ok(!JSON.stringify(report).includes("do not echo"));
});

test("denied checks expose only known Google reason codes and service names", async () => {
  const secret = "FAKE_OWNER_TOKEN_DO_NOT_PRINT";
  const read = createGoogleReader(
    secret,
    async () =>
      new Response(
        JSON.stringify({
          error: {
            message: secret,
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                reason: "SERVICE_DISABLED",
                metadata: {
                  service: "billingbudgets.googleapis.com",
                  consumer: secret,
                  activationUrl: `https://example.test/${secret}`,
                },
              },
              {
                "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
                metadata: { service: secret },
              },
              {
                "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                reason: secret,
              },
              {
                "@type": "type.googleapis.com/google.rpc.DebugInfo",
                detail: secret,
              },
            ],
          },
        }),
        { status: 403 },
      ),
  );
  const report = await collectCloudReadiness(read);
  assert.deepEqual(report.checks.authPrivacy.diagnostics, [
    { reason: "SERVICE_DISABLED", service: "billingbudgets.googleapis.com" },
    { reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" },
  ]);
  assert.equal(report.checks.authPrivacy.status, "blocked");
  assert.ok(!JSON.stringify(report).includes(secret));
  assert.ok(!JSON.stringify(report).includes("activationUrl"));
});

test("consumer diagnostics compare the DailyBudget project without exposing other project IDs", async () => {
  for (const [consumer, expected] of [
    ["projects/dailybudget-35c26", true],
    ["projects/420817333542", true],
    ["projects/123456789", false],
    ["projects/unrelated-project", false],
    ["FAKE_OWNER_TOKEN_DO_NOT_PRINT", undefined],
  ]) {
    const read = createGoogleReader(
      "FAKE",
      async () =>
        new Response(
          JSON.stringify({
            error: {
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                  reason: "SERVICE_DISABLED",
                  metadata: { consumer },
                },
              ],
            },
          }),
          { status: 403 },
        ),
    );
    const report = await collectCloudReadiness(read);
    const diagnostic = report.checks.authPrivacy.diagnostics[0];
    assert.equal(diagnostic.consumerProjectMatchesDailyBudget, expected);
    assert.equal(report.checks.authPrivacy.status, "blocked");
    assert.ok(!JSON.stringify(report).includes(consumer));
  }
});
