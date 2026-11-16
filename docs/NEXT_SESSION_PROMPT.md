# DailyBudget Next-Session Prompt

## Deployed backend checkpoint — November 16, 2026

The owner's Cloud Shell deployment output confirms receipt API and hourly maintenance Functions were created successfully in us-west1 with Node 24; Storage/Firestore rules were released and indexes deployed. API URL: `https://us-west1-dailybudget-35c26.cloudfunctions.net/receiptsApi`. A direct unauthenticated GET `/access` from this workspace returned HTTP 401 with the expected sign-in error, confirming the deployed gateway responds and rejects anonymous access. Authenticated family operations and scheduled production cleanup remain unverified.

The CLI ended with an unexpected error at the post-deployment Artifact Registry cleanup-days prompt, after the successful service creation messages. Do not repeat deployment solely for that prompt. Next: set the functions build-image cleanup policy separately for us-west1 (seven days), verify it, assign the owner's verified existing UID through trusted Cloud Shell, configure the GitHub API URL, publish the reviewed frontend and test actual family receipts. Build-image cleanup does not delete receipt originals.

## Latest Cloud Shell checkpoint — November 16, 2026

Owner reports Blaze enabled; Storage exists and its visible file list is empty, US-WEST1/REGIONAL with seven-day soft deletion. Public access prevention update completed successfully. Firestore is us-west2. Owner’s own Cloud Shell can list Firebase projects. Receipt service defaults to us-west1. Backend runtime/CI updated to Node 24 to satisfy locked Firebase Admin transitive dependencies requiring >=24.12.0. Deployment and trusted owner-UID assignment still remain; no production receipt service deployment has been confirmed.

## Latest priority — November 16, 2026

Family receipts are prepared on `codex/firebase-receipts` from main `55a9f6f`. Read `docs/RECEIPTS_REPORT.md`, `docs/RECEIPTS_SETUP.md`, branch status and any linked PR first. Premium is per family; every current member can view/download/export/replace/delete. Former members and other families are denied. The latest compact summary/navigation changes are preserved. No production receipt backend/rules deployment or billing change has occurred. The owner approved the documented Firebase cloud setup and possible usage charges on November 16, 2026; do not ask again. The workspace has no Firebase/Google login, the shared browser is unavailable, and GitHub Actions variables access returns 403. The latest PR #5 GitHub checks passed. Next steps are owner Google sign-in through their trusted Firebase/Cloud Shell session, actual Firebase project inspection, reviewed deployment, trusted existing-UID administrator setup, frontend API configuration and live/phone testing. The older checkpoint descriptions below are historical.

Continue helping me prepare DailyBudget for a safe beta release as quickly as practical.

Repository:

`C:\Users\alita\OneDrive\Documents\GitHub\DailyBudgetApp`

Start by reading the repository, `docs/ROADMAP.md`, Git status, and recent commits. Do not guess the implementation.

## Current state

- The latest security and mobile-beta checkpoint was committed and pushed to `main` as `164c28a`.
- Firestore rules and indexes were tested and deployed.
- Account deletion, secure invitations, admin-name handling, Apple web login, mobile configuration, and several dashboard improvements are implemented.
- TypeScript, lint, Expo dependency checks, Firestore rule tests, and the production web export passed at the checkpoint.
- An Android internal-preview APK was successfully built, installed, and opened on a real Android phone.
- The public beta, support, and feedback email is `dailybudgethub@gmail.com`.
- Apple login is intentionally unavailable in the native Android app.
- Apple Developer identifiers, Firebase configuration, and Sign in with Apple are configured.
- The iOS preview build is waiting until I have access to the trusted device needed for Apple two-factor authentication.
- The Apple private `.p8` key is stored outside the repository in Personal Vault. Never display it, move it into the project, or commit it.

## Highest-priority work

Immediate priority (2026-11-14): the owner reported accounting errors and asked
for a full review before proceeding. Read `docs/ACCOUNTING_REVIEW.md` on main.
The owner confirmed both income and cashback must leave
allowance, status, and spending bars unchanged. Negative net expenses must show
an empty spending bar.
Audit checks reproduced the aggregation, negative-width, cent-rounding, timestamp,
date-display, and daylight-saving problems. The report lists other code-confirmed
risks and product rules needing agreement. The owner confirmed monthly status
and the spending bar must use
the whole month's budget, not elapsed-days allowance. Preserve that rule; negative
allowance alongside “On track” is expected on this basis. The owner also confirmed
yearly status/bar must compare with the whole calendar year's budget so lower
spending in later months can compensate for an expensive month. Use 365/366 days
with the single daily budget. Monthly and annual status are independent. Owner
confirmed each month starts fresh, with the annual total retaining past months.
The owner then said “Let's fix it”, authorizing the agreed corrections and phone
testing. PR #3 merged as `584450f` and Pages run `43585618133` published the fixes.
All 14 calculation tests (`npm run test:finance`) passed locally and on GitHub,
including cent rounding and bounded bars. Verified the actual rendered component
HTML with synthetic totals: negative totals yield two 0% spending bars, while
monthly over-budget and annual on-track statuses can coexist. The live login page
returns HTTP 200 and its bundle contains the updated summary. Ask the owner to
test the corrected dashboard on their phone. Other audit findings remain
follow-up work, including date handling, duplicate-save prevention, validation,
and preserving historical types during edits. Keep explanations plain.

Current owner direction (2026-11-13): skip Apple-specific work for now and follow
the remaining roadmap. Keep existing Apple sign-in and leave its unverified
requirements open.

1. The owner reported that **Forgot Password** works on their phone. Keep that
   result recorded; do not ask them to repeat the normal test without a reason.
   Remaining recovery checks are enumeration protection and expired/invalid links.
   The login screen now links to `/forgot-password`, which sends Firebase reset
   emails, uses a generic confirmation for unknown/disabled accounts, and handles
   validation, network, and rate-limit errors. Firebase's default hosted email
   action page completes the reset. Verify invalid, expired, and reused links
   separately and ensure Firebase email enumeration protection is enabled.
   TypeScript, lint, and production web export pass. `firebaseConfig.ts` now
   defaults to the public Firebase client configuration already tracked in
   `google-services.json`. A fresh cloud checkout runs without a `.env` file.
   Expo web is running in cloud Chrome at `http://localhost:8083/login` while the
   development server stays running. Synthetic invalid credentials received the
   expected Firebase rejection. Recovery navigation and empty-email validation
   were verified. Core budget workflows still need signed-in testing. Owner wants
   updates published to the existing GitHub
   Pages app at `https://atashvibe.github.io/DailyBudgetApp/` for phone testing.
   Keep that existing hosting setup rather than creating a new hosting service.
   Use plain, nontechnical explanations with the owner. GitHub access now works:
   checkpoint `9f910e2` was pushed to `codex/cloud-workspace-password-recovery`.
   PR #1 was merged as `652d036` and published successfully by Pages run
   `43581058924`. Live login and recovery routes returned HTTP 200. In Chrome,
   verified recovery navigation, refresh, and empty-email validation. Ask the
   owner only for the remaining recovery checks; their normal phone test passed.
   The earlier GitHub authentication blocker is resolved.
2. Deferred for now: prevent Apple-only users from being locked out after moving to Android:
   - Let a signed-in Apple user link an Android-compatible login method, such as Google and/or email/password.
   - Preserve the same Firebase UID, family membership, roles, and budget data.
   - Warn Apple-only users to add another method.
   - Prevent Hide My Email users from accidentally creating a second account.
   - Test the complete iPhone-to-Android account-access path when an iPhone build is available.
3. Public Privacy Policy, account-deletion, support/contact, and Terms pages are
   published with `dailybudgethub@gmail.com`. PR #2 merged as `0696e7e`; Pages
   run `43582463506` succeeded. All four live routes returned HTTP 200 with the
   expected content and navigation links; signed-out Chrome showed Support.
   Login, sign-up, Settings, and the deletion dialog contain links. Signed-in
   Settings/dialog navigation still needs device verification. Domain connection
   for `dailybudgethub.com` remains pending; inspect the existing setup first.
4. Continue the beta-readiness and real-device checklist in `docs/ROADMAP.md`.

Reports and graphs are important, but they are planned as a later Version 2 candidate. The roadmap includes category, budget-area, trend, comparison, filter, accessibility, and export ideas. Do not let reporting delay the first safe beta.

Implement safe repository changes directly, run checks appropriate to the changes, preserve unrelated work, and commit/push only after reviewing the diff. Explain unfamiliar Firebase, Apple, or store-console actions clearly without making the steps excessively small.
