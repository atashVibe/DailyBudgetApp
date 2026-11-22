// Read-only owner-console report. Uses GET requests to fixed Google APIs only;
// never logs the access token or changes billing, backups, IAM or user data.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const projectId = "dailybudget-35c26";
const projectNumber = "420817333542";
const bucketName = "dailybudget-35c26.firebasestorage.app";
const databasePath = `projects/${projectId}/databases/(default)`;
const hosts = new Set([
  "firestore.googleapis.com",
  "storage.googleapis.com",
  "cloudbilling.googleapis.com",
  "billingbudgets.googleapis.com",
  "cloudscheduler.googleapis.com",
  "cloudfunctions.googleapis.com",
  "identitytoolkit.googleapis.com",
]);

export function createGoogleReader(accessToken, fetchImpl = fetch) {
  return async (url) => {
    const target = new URL(url);
    if (target.protocol !== "https:" || !hosts.has(target.hostname))
      throw new Error("Only the fixed Google admin APIs are allowed.");
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw Object.assign(
        new Error(
          response.status === 401 || response.status === 403
            ? "Owner permission is required for this check."
            : "This read-only check did not complete.",
        ),
        { status: response.status },
      );
    return response.json();
  };
}
export async function collectCloudReadiness(read) {
  const capture = async (work) => {
    try {
      return { status: "checked", details: await work() };
    } catch (error) {
      return {
        status:
          error.status === 401 || error.status === 403
            ? "blocked"
            : "unavailable",
        httpStatus: error.status || null,
        message: error.message,
      };
    }
  };
  const pages = async (url, key) => {
    const items = [];
    let next = "";
    do {
      const target = new URL(url);
      if (next) target.searchParams.set("pageToken", next);
      const data = await read(target.href);
      items.push(...(data[key] || []));
      next = data.nextPageToken || "";
    } while (next);
    return items;
  };
  const [database, bucket, billing] = await Promise.all([
    capture(async () => {
      const d = await read(
        `https://firestore.googleapis.com/v1/${databasePath}`,
      );
      return {
        location: d.locationId,
        pointInTimeRecovery: d.pointInTimeRecoveryEnablement,
        versionRetentionPeriod: d.versionRetentionPeriod,
      };
    }),
    capture(async () => {
      const b = await read(
        `https://storage.googleapis.com/storage/v1/b/${bucketName}`,
      );
      return {
        location: b.location,
        storageClass: b.storageClass,
        publicAccessPrevention: b.iamConfiguration?.publicAccessPrevention,
        uniformBucketAccess:
          b.iamConfiguration?.uniformBucketLevelAccess?.enabled,
        versioning: b.versioning?.enabled || false,
        softDeleteSeconds: b.softDeletePolicy?.retentionDurationSeconds || "0",
        retentionSeconds: b.retentionPolicy?.retentionPeriod || "0",
      };
    }),
    capture(() =>
      read(
        `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`,
      ),
    ),
  ]);
  const [
    backupSchedules,
    backups,
    billingAlerts,
    storageIam,
    receiptFunction,
    receiptScheduler,
    authPrivacy,
  ] = await Promise.all([
    capture(async () =>
      (
        await pages(
          `https://firestore.googleapis.com/v1/${databasePath}/backupSchedules`,
          "backupSchedules",
        )
      ).map((s) => ({
        retention: s.retention,
        daily: s.dailyRecurrence !== undefined,
        weekly: s.weeklyRecurrence,
      })),
    ),
    capture(async () => {
      if (!database.details?.location)
        throw new Error("The database location could not be read.");
      return (
        await pages(
          `https://firestore.googleapis.com/v1/projects/${projectId}/locations/${database.details.location}/backups`,
          "backups",
        )
      ).map((b) => ({
        name: b.name,
        database: b.database,
        state: b.state,
        snapshotTime: b.snapshotTime,
        expireTime: b.expireTime,
      }));
    }),
    capture(async () => {
      const account = billing.details?.billingAccountName;
      if (!account)
        throw new Error("The project's billing account could not be read.");
      return (
        await pages(
          `https://billingbudgets.googleapis.com/v1/${account}/budgets`,
          "budgets",
        )
      )
        .filter(
          (b) =>
            !b.budgetFilter?.projects?.length ||
            b.budgetFilter.projects.some(
              (p) =>
                p === `projects/${projectId}` ||
                p === `projects/${projectNumber}`,
            ),
        )
        .map((b) => ({
          name: b.displayName,
          amount: b.amount,
          thresholds: b.thresholdRules,
          defaultIamRecipientsDisabled:
            b.allUpdatesRule?.disableDefaultIamRecipients || false,
          notificationChannelCount:
            b.allUpdatesRule?.monitoringNotificationChannels?.length || 0,
        }));
    }),
    capture(async () => {
      const policy = await read(
        `https://storage.googleapis.com/storage/v1/b/${bucketName}/iam`,
      );
      return (policy.bindings || []).map((b) => ({
        role: b.role,
        memberCount: b.members?.length || 0,
        publicPrincipals: (b.members || []).filter(
          (m) => m === "allUsers" || m === "allAuthenticatedUsers",
        ),
        serviceAccounts: (b.members || []).filter((m) =>
          m.startsWith("serviceAccount:"),
        ),
      }));
    }),
    capture(async () => {
      const f = await read(
        `https://cloudfunctions.googleapis.com/v2/projects/${projectId}/locations/us-west1/functions/receiptsApi`,
      );
      return {
        state: f.state,
        serviceAccount: f.serviceConfig?.serviceAccountEmail,
      };
    }),
    capture(async () =>
      (
        await pages(
          `https://cloudscheduler.googleapis.com/v1/projects/${projectId}/locations/us-west1/jobs`,
          "jobs",
        )
      )
        .filter((j) => /receipt/i.test(j.name))
        .map((j) => ({
          name: j.name,
          schedule: j.schedule,
          timeZone: j.timeZone,
          state: j.state,
          lastAttempt: j.lastAttemptTime,
          lastStatusCode: j.status ? (j.status.code ?? 0) : null,
        })),
    ),
    capture(async () => {
      const config = await read(
        `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config`,
      );
      return {
        emailEnumerationProtection:
          config.emailPrivacyConfig?.enableImprovedEmailPrivacy ?? null,
      };
    }),
  ]);
  return {
    projectId,
    checkedAt: new Date().toISOString(),
    checks: {
      database,
      bucket,
      billingEnabled:
        billing.status === "checked"
          ? { status: "checked", enabled: billing.details.billingEnabled }
          : billing,
      backupSchedules,
      backups,
      billingAlerts,
      storageIam,
      receiptFunction,
      receiptScheduler,
      authPrivacy,
    },
    stillNeedsVerification: [
      "A successful restore into a separate test destination, including original receipt files.",
      "Delivery of a real budget-alert test notification; a configured budget alone is not proof of delivery.",
      "Inherited project/service-account permissions; bucket IAM alone is not an effective-permissions audit.",
      "Actual receipt cleanup and retained-copy expiry; scheduler status alone is not a completed deletion audit.",
    ],
  };
}

const cli =
  !process.argv[1] ||
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (cli) {
  try {
    let token;
    try {
      token = execFileSync(
        "gcloud",
        ["auth", "print-access-token", "--quiet"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ).trim();
    } catch {
      throw new Error(
        "Run this read-only report in Google Cloud Shell while signed in as the DailyBudget owner. Do not paste an access token into chat.",
      );
    }
    if (!token) throw new Error("No owner access token was available.");
    console.log(
      JSON.stringify(
        await collectCloudReadiness(createGoogleReader(token)),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
