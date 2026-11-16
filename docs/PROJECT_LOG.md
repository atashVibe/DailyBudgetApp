# DailyBudget Project Log

## Required category receipts follow-up — November 16, 2026

The owner confirmed the receipt feature from merged PR #5/main `7885ff8` works, then requested family-admin category requirements and attachments on the entry form with gray Save until a required receipt is selected. Prepared on `codex/required-category-receipts`: per-category boolean, form attachment selection/removal/progress, backend-only drafts with atomic final financial entry creation, server/Firestore enforcement and all-category-type attachments. Existing receipts satisfy edits; abandoned 24-hour drafts use the existing cleanup worker. Read `docs/CATEGORY_RECEIPTS.md` for tests and deployment commands. This follow-up is not yet deployed or published. The owner's existing role, active Blaze setup, current bucket and cost approval persist. Deploy backend/rules/indexes through the owner's authenticated Cloud Shell before merging/publishing the follow-up frontend. Do not repeat the original owner-role setup or request cost approval again.

## Receipt website connection — November 16, 2026

The owner confirmed seven-day build-image cleanup succeeded and the trusted administrator script granted receipt-administrator access to their verified existing account, without assigning Premium. The backend and rules/indexes are deployed in the existing Firebase project. The Pages workflow now defaults to the public receipt API URL (`https://us-west1-dailybudget-35c26.cloudfunctions.net/receiptsApi`), with an optional repository variable override; no manual Actions-variable permission is needed. Next: publish PR #5, verify Pages and have the owner test a signed-in upload/download/export. Authenticated production family operations, actual scheduled cleanup and native rebuilt-device checks remain unverified.

## Deployed backend checkpoint — November 16, 2026

The owner's Cloud Shell deployment output confirms receipt API and hourly maintenance Functions were created successfully in us-west1 with Node 24; Storage/Firestore rules were released and indexes deployed. API URL: `https://us-west1-dailybudget-35c26.cloudfunctions.net/receiptsApi`. A direct unauthenticated GET `/access` from this workspace returned HTTP 401 with the expected sign-in error, confirming the deployed gateway responds and rejects anonymous access. Authenticated family operations and scheduled production cleanup remain unverified.

The CLI ended with an unexpected error at the post-deployment Artifact Registry cleanup-days prompt, after the successful service creation messages. Do not repeat deployment solely for that prompt. Next: set the functions build-image cleanup policy separately for us-west1 (seven days), verify it, assign the owner's verified existing UID through trusted Cloud Shell, configure the GitHub API URL, publish the reviewed frontend and test actual family receipts. Build-image cleanup does not delete receipt originals.

## Latest Cloud Shell checkpoint — November 16, 2026

Owner reports Blaze enabled; Storage exists and its visible file list is empty, US-WEST1/REGIONAL with seven-day soft deletion. Public access prevention update completed successfully. Firestore is us-west2. Owner’s own Cloud Shell can list Firebase projects. Receipt service defaults to us-west1. Backend runtime/CI updated to Node 24 to satisfy locked Firebase Admin transitive dependencies requiring >=24.12.0. Deployment and trusted owner-UID assignment still remain; no production receipt service deployment has been confirmed.

## 2026-11-16 — Cloud activation approved; Google sign-in required

The owner approved proceeding with the documented Firebase cloud setup and usage-based charges. PR #5 checks passed on GitHub. Read-only access checks found no Firebase CLI session or Google Application Default Credentials in the workspace. GitHub repository Actions secrets/variables operations return HTTP 403; the browser reports `Browser runtime unavailable` and the desktop viewer cannot attach. No production settings were changed. Asked the owner to open their existing Firebase project and identify Spark/Blaze as the first guided setup step. Approval persists; do not request it again.

## 2026-11-16 — Family receipts prepared for review

Prepared shared family receipts, Firebase gateway/retention, original-file ZIP export and separate global administrator setup on `codex/firebase-receipts`, preserving main `55a9f6f`. Every current member can replace/delete. Verified 30 receipt integration, 11 rules, 6 policy and 14 finance tests, browser workflow, types, lint and web export. No production backend/rules/billing deployment. Cost approval was subsequently received (see the latest entry); live/device verification remains pending. See `RECEIPTS_REPORT.md` and `RECEIPTS_SETUP.md`.

This file records verified milestones, release decisions, and current blockers. `ROADMAP.md` remains the authoritative checklist.

## Documentation Rules

- Mark work complete only after it has been verified.
- Record the date, outcome, and supporting commit or build identifier when available.
- Never place passwords, verification codes, private keys, or private-key contents in this repository.
- Keep the roadmap, this log, and the next-session prompt synchronized at stable checkpoints.

## Project Identity

- Product name: **DailyBudget**
- Domain: `dailybudgethub.com`
- Public beta/support/feedback email: `dailybudgethub@gmail.com`
- Apple bundle identifier: `com.atashvibe.dailybudget`
- Android package: `com.atashvibe.dailybudget`
- Firebase project domain: `dailybudget-35c26.firebaseapp.com`
- Expo owner/project: `@atashvibe/DailyBudgetApp`

## Verified Milestones

### 2026-08-04 — Apple and Firebase authentication foundation

- Sign in with Apple was configured for the web and prepared for native iOS.
- The Apple App ID, Services ID, Firebase callback, and Apple authentication key were configured.
- Apple web login was tested successfully.
- Evidence: commit `7933588` (`Complete secure Apple sign-in`).

### 2026-08-04 — Initial beta roadmap and account deletion

- The release roadmap was added.
- Account-deletion behavior and related release requirements were implemented and documented.
- Evidence: commit `aa30f63` (`Add release roadmap and account deletion`).

### 2026-08-04 — Security and mobile-beta checkpoint

- Firestore rules and indexes were added, tested, and deployed.
- Secure invitations, admin-role handling, personal-data cleanup, and mobile configuration were completed.
- Dashboard layout, Apple relay-email display, amount formatting, administrator-name display, and loading performance were improved.
- TypeScript, lint, Expo dependency validation, Firestore security tests, and production web export passed.
- Firebase iOS configuration was added for `com.atashvibe.dailybudget`.
- Evidence: commit `164c28a` (`Secure family data and prepare mobile beta`).

### 2026-08-04 — Android real-device preview

- EAS Android preview build `ec5e23ee-272b-4be0-8dc1-31ca3a1c1a9a` completed successfully from commit `164c28a`.
- The APK was downloaded, installed, opened, and confirmed running on a real Android phone.
- Apple login is intentionally unavailable in the native Android app.

### 2026-08-04 — Account portability and reporting roadmap

- Forgot-password recovery was added as a beta-release requirement.
- Apple-created accounts gaining Android access through a linked provider was added as a beta-release requirement.
- Reports and graphs were documented as a Version 2 candidate so they do not delay the safe beta.
- Evidence: commit `9848119` (`Document account recovery and reporting roadmap`).

### 2026-08-04 — Public beta contact

- Selected `dailybudgethub@gmail.com` for beta feedback and initial public support.
- The roadmap, project log, and next-session prompt were synchronized.

### 2026-11-13 — Password-reset request flow

- Added a Forgot Password action and an accessible, scrollable reset-request screen.
- Firebase sends the reset email; unknown/disabled accounts receive the same app
  confirmation as successful requests. Network, rate-limit, and validation errors
  allow retry, and a synchronous guard prevents concurrent submissions.
- Added provider-recovery guidance and a manual verification checklist in
  `docs/ACCOUNT_RECOVERY_TESTING.md`.
- Verification: `npx tsc --noEmit`, `npm run lint` (with Expo telemetry disabled
  for this workspace), and `git diff --check` passed.
- Production web export was attempted but failed with `auth/invalid-api-key`:
  this fresh workspace has no `EXPO_PUBLIC_FIREBASE_*` configuration. No live
  authentication requests, email delivery, or device tests were performed.
- Owner direction: defer Apple-specific work for now; preserve existing Apple
  sign-in and leave unfinished Apple requirements unchecked.

### 2026-11-13 — Firebase-backed cloud workspace

- Corrected the missing-environment blocker: `firebaseConfig.ts` defaults to
  public client settings from the existing tracked Android configuration.
  Environment overrides remain supported. No Android app ID is used for web.
- Verified the client key against Firebase Auth's public project configuration;
  the project authorizes `localhost` for web sign-in.
- TypeScript, lint, production web export, and whitespace checks passed.
- Started Expo web on port 8083 and verified the login screen in shared cloud
  Chrome. Synthetic invalid credentials received the expected "Incorrect email
  or password" response. Verified recovery navigation, empty-email validation,
  and navigation back to sign-in.
- Authenticated budget workflows and reset-email delivery remain unverified.
  No rules, users, or financial data were changed.
- Owner selected cloud workspace only; no public web deployment was performed.
- GitHub read access works. Push dry-run failed because this workspace lacks
  GitHub credentials. The suggested GitHub connection is not yet confirmed.

### 2026-11-14 — GitHub connection and saved cloud checkpoint

- GitHub connection confirmed working with repository push permission.
- Pushed checkpoint `9f910e2` to `codex/cloud-workspace-password-recovery`.
- The earlier GitHub authentication blocker is resolved. Main remains unchanged.

## Current Blockers and Next Priorities

### 2026-11-14 — Agreed budget calculation corrections

- Owner confirmed monthly allowance resets, while yearly spending retains all
  months, and authorized implementing the reviewed rules.
- Excluded income/cashback from monthly/yearly budget spending. Refunds still
  reverse spending in their own entry period. Monthly status remains based on
  the full month; yearly status now uses the full 365/366-day calendar year.
- Bounded monthly/yearly bars to 0–100% and used whole-cent arithmetic to avoid
  false negative-zero balances and recovery days. Added clear summary guidance.
- `npm run test:finance` passed all 14 tests; TypeScript and lint passed. Tests
  include unchanged summaries after income/cashback, excess refunds, independent
  monthly/yearly status, fresh monthly allowance, annual compensation, leap years,
  status thresholds, period boundaries, cents, and zero budgets.
- Added the finance checks to the Pages workflow before build/deployment.
- Production Pages-path export passed. PR #3 merged as `584450f` and Pages run
  `43585618133` successfully ran finance tests, built, and deployed the update.
- Verified the live login HTTP 200 response and updated JavaScript summary text.
  Rendered the actual summary component with synthetic data through React Native
  Web: both negative-total spending bars had width 0%, and monthly over-budget
  could coexist with annual on-track status. Authenticated phone verification is
  still pending. No stored records changed; other audit findings remain open.

### 2026-11-14 — Accounting review requested by owner

- Owner specified that income must not change allowance/status, cashback must not
  change allowance, and negative net expenses must display an empty spending bar.
- Inspected reporting, summary formulas, dashboard loading, entry creation/editing,
  categories/areas, amount/date input, daily-budget settings, rules, and CSV export.
- Ran the actual reporting and summary functions with synthetic records. Reproduced
  income/cashback offsets, negative progress widths, on-track status with negative
  allowance, future-entry inclusion, timestamp omission, floating-point false
  recovery, a daylight-saving day-count error, and the date-only display shift.
- Saved a full plain-language review in `docs/ACCOUNTING_REVIEW.md` on branch
  `codex/accounting-review`. No live data or application calculations were changed.
- Next: review entry impacts, status denominator, refunds, and period rules with
  the owner before implementing and publishing accounting corrections.
- Owner subsequently confirmed monthly “On track / Over budget” must compare
  spending with the whole month's budget. Preserve that monthly basis; negative
  allowance alongside “On track” is expected.
- Owner also confirmed cashback must leave allowance, status, and the spending
  bar unchanged, just like income.
- Owner confirmed yearly status must use the whole calendar-year budget, allowing
  a high-spending month to be offset by lower spending later in the year. Monthly
  and yearly status are independent. Monthly allowance carry-forward and remaining
  refund/period rules are still under review; no application changes were made.

### 2026-11-14 — Owner password-reset test and public information pages

- Owner reported the normal phone Forgot Password test works. This is an
  owner-reported result, not an independently observed email/reset session.
- Added Privacy Policy, Terms of Use, Support, and Account & Data Deletion routes
  outside the authenticated drawer. Contact email confirmed by the owner as
  `dailybudgethub@gmail.com`.
- Added links on login, sign-up, Settings, and the account-deletion confirmation.
  Policy text reflects the current Firebase, family-sharing, deletion, and
  attribution-cleanup behavior without promising immediate universal erasure.
- TypeScript, lint, whitespace checks, and production Pages-path export passed.
  Parsed exported HTML to verify all four public pages and their navigation links,
  including the links rendered on login and sign-up.
- PR #2 merged as `0696e7e`; Pages run `43582463506` successfully published all
  four pages. Each live route returned HTTP 200 with expected content, contact,
  and navigation links. Inspected the live Support page in signed-out Chrome.
- Signed-in Settings/deletion-dialog link checks on devices and custom-domain
  configuration for `dailybudgethub.com` remain pending. Next priority is core
  budget workflow and calculation testing, with Apple work still deferred.

### 2026-11-14 — GitHub Pages release preparation

- Owner requested publication to the existing Pages URL for phone testing.
- Verified TypeScript, lint, whitespace, and a production export with the real
  `/DailyBudgetApp` base path. Removed an Android app-ID override from the web
  deployment workflow; Auth and Firestore use the existing public project settings.
- PR #1 merged as `652d036`; GitHub Pages workflow run `43581058924` succeeded.
- Live login and recovery routes returned HTTP 200 with the expected new content.
  In shared Chrome, verified recovery navigation from the published login page,
  recovery-page refresh, and empty-email validation.
- Ready for owner phone testing at `https://atashvibe.github.io/DailyBudgetApp/`.
  Actual email delivery, reset completion, and authenticated budget workflows
  remain unverified. No reset messages were sent during this deployment check.

1. Use a dedicated test account to verify authenticated cloud workflows and
   password recovery using `docs/ACCOUNT_RECOVERY_TESTING.md`.
2. Deferred at the owner's request: provider linking so Apple-only users can
   retain the same account and data on Android.
3. Publish the Privacy Policy, deletion information, support page, and Terms using `dailybudgethub.com`.
4. Test the core workflows and account deletion on real devices.
5. Continue iPhone registration and the iOS preview build when the trusted Apple two-factor device is available.
6. Prepare Google Play internal testing and TestFlight after the mandatory beta-readiness gates pass.

## Later Product Work

- Reporting and graphs are planned for the end phases or Version 2.
- Candidate reports include category and budget-area totals, trends, budget comparisons, filters, accessible charts, and possible exports.
- Beta feedback should determine the first reports and whether any advanced reports belong in a paid plan.
