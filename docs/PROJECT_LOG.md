# DailyBudget Project Log

## Roadmap execution and family Premium purchase request — November 21, 2026

The owner authorized the next roadmap work after Milestone 2 (`v0.2`, exact source tag `d56ff46`) and explicitly requested a future family-admin Premium purchase flow. The roadmap now specifies one verified purchase for one family, upload access for all current members, backend-only payment verification, admin-only checkout, cancellation/restore/refund handling, payer-role changes and sandbox/store-rule checks. Pricing/provider decisions and checkout implementation remain pending; no payment UI, charge or paid entitlement was created.

Google deletion confirmation now prepares a temporary in-memory Auth user before the tap, uses public Firebase reauthentication for the same UID, and refreshes the durable app user's credential without signing another user into the main session. The dialog preflights server ownership, supports retry, and blocks duplicate taps. Destructive cleanup rechecks current server membership/ownership after authentication, binds receipt cleanup to the expected UID and guards later cleanup stages against account changes. A cancelled/wrong-account confirmation performs no cleanup. Shared family history/originals remain for other members; sole-family cleanup remains explicit. Former-family personal-attribution cleanup still needs trusted backend work; Apple remains deferred.

Five account browser flows pass in Chromium and in iPhone-configured WebKit; all nine prior receipt/sign-in/layout/network flows also pass through the guarded demo-only runner. TypeScript, lint, production web export and the Android JavaScript export pass; this is not a native binary or a physical-device test. The new CI steps run both suites in the correct fresh-fixture order. They use only local Auth/Firestore/Storage emulators and disposable identities. Shared-data tests verify a second signed-in identity downloads the original bytes after the first identity is deleted, and a recreated Google account gets a different UID with no old membership. No production account deletion was attempted.

Live administration is currently blocked: `firebase login:list` reports no authorized accounts, gcloud is unavailable in this workspace, and the shared browser reports `Browser runtime unavailable`. A dependency-free, GET-only `functions/scripts/cloud-readiness-audit.mjs` is ready for the owner's Cloud Shell. Two unit tests verify host/method restrictions, project-budget filtering, secret filtering and blocked-permission handling. The report reads backup/storage/billing/job/Auth configuration; it does not perform a restore, deliver alert notifications, inspect inherited effective IAM or prove actual cleanup expiry. Do not mark those live checks complete without owner evidence. An asynchronous question asks whether the owner can open Cloud Shell; lack of a response is not authorization or evidence.

Next: finish the required GitHub checks and publish the frontend while keeping the Milestone 2 tag unchanged. No receipt Functions/rules deployment is needed for this confirmation fix. Continue the spare-account two-phone rehearsal and owner cloud report when available, then scope the remaining deletion/production tasks from the actual results.

## Milestone 2 release preparation — November 21, 2026

The owner approved releasing the current web/source checkpoint as Milestone 2 after shrinking the receipt information button to match Budget Overview. Both now use `components/InfoButton.tsx`: a fixed 20px outline glyph in the approved muted color, with a larger invisible tap area and accessible expanded state. The component deliberately has no size/color override props; the shared standard is documented at the top of the roadmap for future screens. Targeted Chromium and iPhone-configured WebKit checks pass: both controls have the same 20px bounds/glyph/color, explanations toggle with accessible expanded state, and inline layout/Edit behavior is preserved. TypeScript, lint and production web export pass.

Follow the existing Milestone 1 `v0.1` GitHub release convention with `v0.2`, titled "Milestone 2 - Family Receipts and Mobile Stability". Publish only after checks and Pages succeed, and tag the exact deployed main commit. This is a website/source checkpoint; no new native binary, payment integration or Apple sign-in is introduced. No Firebase/Cloud Shell deployment is needed. Record the actual published tag/URL in the PR/release notes after creation.

Roadmap review found a concrete follow-up: `services/accountDeletion.ts` calls web `reauthenticateWithPopup` without a resolver, but the main Auth initialization has no default resolver. Google sign-in was updated separately; deletion confirmation was not. Recommend fixing/testing same-user Google deletion confirmation and wrong-user rejection first, then remaining recovery/deletion checks, a two-person iPhone/Android family rehearsal and verified alerts/backup-restore/storage cleanup before a wider beta. This is a code-review finding, not a production deletion attempt; no account was deleted or modified during this review. Existing emulator evidence does not complete the live-device checks. Apple remains deferred; reports and payment integration remain later. Do not begin the next task until the owner chooses it.

## iPhone sign-in, Edit and compact layout — November 21, 2026

The owner tested the live website on iPhone 17 and supplied screenshots of a Google popup-blocked warning, a dashboard connection error, an oversized date control, Edit failing to reveal the form, and avoidable receipt/progress lines. Prepared on `codex/iphone-entry-and-session-fixes` from published PR #9/main `54ed8b6`.

The entry date has explicit browser appearance, width and height bounds with no vertical native padding; pickers have matching text/width. The requested 60px fields and existing teal stay. Receipt label and free-family information/Premium paperclip now share one row. Month/year progress labels share a header with their figures, with bars beneath; shortened currency formatting retains cents when present and full accessible amounts. Edit waits for the form to expand, then scrolls the actual browser ancestors into view; native AppScreen now forwards its ScrollView ref. Later form edits do not trigger repeated scroll jumps.

Google's browser popup setup is prepared before enabling the button, in a separate in-memory Firebase Auth instance so its Safari/mobile iframe cannot block restoring the main durable session. Successful Google credentials sign into the existing app Auth instance; the temporary OAuth session is signed out. No new identity provider/backend/service was added. Login observes completed authentication, prevents duplicate requests and uses one bounded profile-routing path, avoiding profile-load failures reported as failed Google sign-in. Missing signed-in profiles go to family setup. Apple stays disabled.

Transient cloud reads retry with 2/4/8-second backoff within a 30-second budget. Only reads are replayed, permission errors are not retried, network restarts are coalesced, authentication/drafts/writes are retained, and cached missing profiles/families do not cause setup redirects. Dashboard spending reads have explicit errors/retry and do not display invented zero totals when the first read fails. The owner's screenshots establish the symptoms, not a proven iPhone OS defect; no production account/device logs or credentials were accessed. Physical iPhone 17 and Google account selection remain owner checks. No Firebase configuration or Cloud Shell deployment is required; publish the website after validation.

## Google popup regression — November 17, 2026

PR #8/main `7b5a127` is published. The owner immediately reported Google sign-in failure. Reproduced on the live website before changes: `auth/argument-error` from Firebase's missing popup resolver. The explicit `initializeAuth` session-persistence change retained local storage but removed `getAuth`'s default OAuth resolver. Supply `browserPopupRedirectResolver` directly to web `signInWithPopup` calls, so Google can open on demand without proactively starting an OAuth iframe during saved-session restoration. Apple remains disabled. Add actionable Google errors and treat user cancellation quietly. A new emulator-backed browser flow covers popup opening, cancellation/retry, successful fake Google sign-in to an existing family and session restoration from `/login`. Keep existing saved-session/network-recovery behavior. No Firebase configuration, backend/rules deployment or user data changes are required. All seven emulator-backed browser flows pass, including the new Google flow and existing receipt/layout/session-recovery checks; TypeScript, lint and production web export pass. Publish the hotfix and verify the live Google popup without entering production credentials. Actual S22 account selection remains the owner's device check.

## Reference dashboard and session fixes — November 17, 2026

PR #7/main `e8d884a` is live with compact paperclip, receipt gating/layout and Back confirmation. The owner requested the supplied dashboard layout, fields 20% taller, existing teal, an admin category icon library, and S22 repeat-login/spinner troubleshooting. Prepared on `codex/dashboard-reference-layout`; read `docs/DASHBOARD_LAYOUT_SESSION_FIXES.md`. Six browser flows and accounting checks pass, including saved-login restoration and a deliberately stalled profile request with Retry/recovery. No backend deployment is needed. Browser storage changed from IndexedDB preference to durable local storage, so one fresh sign-in may be needed. Actual S22 browser/APK context was asked asynchronously and remains unanswered; hardware/native APK verification is not claimed. Publish website after checks; APK delivery needs a native rebuild if that is what the owner uses.

## Backend deployed and compact paperclip prepared — November 16, 2026

The owner deployed `55c40ae` successfully through Cloud Shell (rules and both receipt Functions). They then requested a small icon-only paperclip opening the native/device chooser instead of expanding three similar form buttons. Implemented direct web image/PDF selection and a native camera/files choice; five browser flows, types, lint and production export pass. Backend/rules are unchanged from the deployed commit, so do not request another Cloud Shell deployment. Next: finish PR #7 checks, merge/publish its website and verify the served bundle. User account grants and cost approval persist. Exact phone chooser appearance/camera availability remains a device check.

## Receipt settings and navigation fixes — November 16, 2026

PR #6/main `fba9a89` is deployed and the owner tested it. New reported bugs: free-family admins can enable required receipts, long filenames push Remove outside the form, and Dashboard Back looks like sign-out. Prepared fixes on `codex/receipt-settings-navigation-fixes`: entitlement-checked category API/rules, disabled enable switches without upload access (clearing stays available), bounded filename/Remove layout and explicit Back sign-out confirmation preserving cancelled drafts. Cold authentication startup and login history are corrected. Read `docs/RECEIPT_NAVIGATION_FIXES.md` for tests and Cloud Shell commands. This follow-up requires backend/rules deployment before frontend publication; no new billing setup, owner-role assignment or cost approval is needed.

## Premium attachment visibility and Cloud Shell session — November 16, 2026

The owner added: Premium families see Attach receipt; free families see an information icon explaining that receipt attachments require upgrading the family to Premium. Implemented using server `canUpload`, preserving administrator-sponsored and ordinary Premium-family member access. Three browser flows, types, lint and production export pass. The owner’s fresh Cloud Shell started in `~` without Node 24; `nvm install 24` succeeded, but `git fetch` failed because they were outside the repository. Instructed `cd ~/DailyBudgetApp-receipts` before fetching. PR #6 remains pending backend deployment, then frontend publication. Existing cost approval and administrator grant persist.

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
