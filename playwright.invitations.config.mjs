import config from "./playwright.receipts.config.mjs";
export default {
  ...config,
  testMatch: "invitations-ui.spec.mjs",
  use: { ...config.use, baseURL: "http://localhost:8093" },
};
