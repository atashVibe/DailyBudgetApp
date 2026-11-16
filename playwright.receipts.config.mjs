import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "receipt-ui.spec.mjs",
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: process.env.RECEIPTS_UI_URL || "http://localhost:8091",
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
    viewport: { width: 430, height: 932 },
  },
});
