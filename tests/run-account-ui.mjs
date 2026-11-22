// Run only inside Firebase's demo emulators. The exported app never uses these
// environment overrides, and the tests refuse production URLs or projects.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const projectId = "demo-dailybudget-receipts";
const local = (value, port) =>
  [`localhost:${port}`, `127.0.0.1:${port}`].includes(value);
if (
  process.env.GCLOUD_PROJECT !== projectId ||
  !local(process.env.FIREBASE_AUTH_EMULATOR_HOST, 9099) ||
  !local(process.env.FIRESTORE_EMULATOR_HOST, 8080) ||
  !local(process.env.STORAGE_EMULATOR_HOST?.replace(/^http:\/\//, ""), 9199)
)
  throw new Error(
    "Run account UI checks inside the local demo Auth/Firestore/Storage emulators.",
  );

const cwd = fileURLToPath(new URL("../", import.meta.url));
const env = {
  ...process.env,
  GCLOUD_PROJECT: projectId,
  FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
  FIRESTORE_EMULATOR_HOST: "localhost:8080",
  STORAGE_EMULATOR_HOST: "http://localhost:9199",
  FIREBASE_STORAGE_EMULATOR_HOST: "localhost:9199",
  RECEIPTS_UI_URL: "http://localhost:8093",
  RECEIPTS_DEMO_PORT: "8791",
  RECEIPTS_DEMO_WEB_ORIGIN: "http://localhost:8093",
  EXPO_NO_TELEMETRY: "1",
  EXPO_PUBLIC_FIREBASE_EMULATORS: "1",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost",
  EXPO_PUBLIC_FIREBASE_API_KEY: "demo-only-key",
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
  EXPO_PUBLIC_RECEIPTS_API_URL: "http://localhost:8791",
  EXPO_PUBLIC_INVITATIONS_API_URL: "http://localhost:8791/invitations",
};
delete env.EXPO_PUBLIC_BASE_URL;
const children = [];
function start(args) {
  const child = spawn(process.execPath, args, {
    cwd,
    env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  children.push(child);
  return child;
}
function stop() {
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    try {
      if (process.platform === "win32") child.kill("SIGTERM");
      else process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    stop();
    process.exit(1);
  });
async function ready(url, status, child) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(`Test service exited before ${url} was ready.`);
    try {
      if (
        (await fetch(url, { signal: AbortSignal.timeout(20000) })).status ===
        status
      )
        return;
    } catch {
      /* The process may still be starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}
try {
  const gateway = start(["functions/scripts/emulator-demo.mjs"]);
  const web = start([
    "node_modules/expo/bin/cli",
    "start",
    "--web",
    "--port",
    "8093",
  ]);
  await Promise.all([
    ready("http://localhost:8791/access", 401, gateway),
    ready("http://localhost:8093/login", 200, web),
  ]);
  // Global receipt-stat assertions need the fresh demo before account fixtures
  // create other families. Separate invocations keep that ordering explicit.
  const requested = process.argv.slice(2);
  const configs = requested.length
    ? requested
    : [
        process.env.RECEIPTS_UI_CONFIG || "playwright.receipts.config.mjs",
        process.env.INVITATIONS_UI_CONFIG ||
          "playwright.invitations.config.mjs",
        process.env.ACCOUNTS_UI_CONFIG || "playwright.accounts.config.mjs",
      ];
  for (const config of configs) {
    const runner = start([
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config",
      config,
    ]);
    const [code] = await once(runner, "exit");
    if (code !== 0)
      throw new Error(`Browser checks failed for ${config} (${code}).`);
  }
} finally {
  stop();
}
