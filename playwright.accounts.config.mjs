import config from "./playwright.receipts.config.mjs";
export default {
  ...config,
  testMatch: "account-deletion-ui.spec.mjs",
  use: { ...config.use, baseURL: "http://localhost:8093" },
};
