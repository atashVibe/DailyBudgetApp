# DailyBudget Next-Session Prompt

## Milestone 2 release preparation — November 21, 2026

The owner approved releasing the current web/source checkpoint as Milestone 2 after shrinking the receipt information button to match Budget Overview. Both now use `components/InfoButton.tsx`: a fixed 20px outline glyph in the approved muted color, with a larger invisible tap area and accessible expanded state. The component deliberately has no size/color override props; the shared standard is documented at the top of the roadmap for future screens. Targeted Chromium and iPhone-configured WebKit checks pass: both controls have the same 20px bounds/glyph/color, explanations toggle with accessible expanded state, and inline layout/Edit behavior is preserved. TypeScript, lint and production web export pass.

Follow the existing Milestone 1 `v0.1` GitHub release convention with `v0.2`, titled "Milestone 2 - Family Receipts and Mobile Stability". Publish only after checks and Pages succeed, and tag the exact deployed main commit. This is a website/source checkpoint; no new native binary, payment integration or Apple sign-in is introduced. No Firebase/Cloud Shell deployment is needed. Record the actual published tag/URL in the PR/release notes after creation.

Roadmap review: recommend a two-person iPhone/Android family rehearsal first (login/reopen, invitations, synchronized entries/shared originals and removed-member denial), then recovery/deletion including attribution in former families, then verified alerts/backup-restore/storage cleanup before a wider beta. Existing emulator evidence does not complete the live-device checks. Apple remains deferred; reports and payment integration remain later. Do not begin the next task until the owner chooses it.

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
