import test from "node:test";
import assert from "node:assert/strict";
import {
  collectCloudReadiness,
  createGoogleReader,
} from "../functions/scripts/cloud-readiness-audit.mjs";

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
