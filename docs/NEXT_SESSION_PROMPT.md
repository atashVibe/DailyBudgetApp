# DailyBudget Next-Session Prompt

## Confirmed invitation sender authentication failure — November 23, 2026

The owner's mail audit at `2026-11-23T22:30:34.420Z` shows all sender/host/port checks true and the password secret attached. All three automatic attempts (22:03:25, 22:05:13, 22:06:49 UTC) are `failed` / `email-setup`, which the backend assigns to SMTP `EAUTH`. These messages were not accepted by Gmail; this is not evidence of inbox/spam delivery failure. The owner has been asked to create an App Password while signed in as dailybudgethub@gmail.com, enter its 16 characters into the masked Secret Manager CLI prompt, and accept the CLI's update of the function's secret binding. Confirmation/retest is pending; never ask for the password in chat. Firebase CLI 15.36.0 can update the bound secret version directly when Yes is selected, so do not require another whole-codebase deploy if it reports the function updated successfully.

Prepared a UI-only error fix: definite failed email reports Email was not sent with an accessible red alert; EAUTH explains the email service needs attention. Valid manual sharing is retained; accepted/unknown states and existing request deduplication are unchanged. An emulator-only authentication-failure fixture exercises the real backend outcome, proves one failed job/code persists across retry and no mailbox message was created. TypeScript/lint and focused Chromium2 + iPhone-configured WebKit2 checks pass (new failure + existing email/Google/join path). Full CI remains required before publication. No production backend/rules/data change is needed for this UI fix.

After the owner confirms secret rotation/function update, reload the app before creating one new test invitation: the old failed request intentionally remains deduplicated and cannot resend. Check a fresh outcome/inbox/code/link rather than treating old failed records as another credential failure. PR #19's six cloud-report tests/full CI passed and its diagnostics merged at `d90d04b`; prior UI/deployment recovery checkpoints remain published.

## Active: real invitation email missing — November 23, 2026

The owner has completed deployment and HTTP invocation repair. The UI is published; PR #18's complete CI passed, it merged at main `191e9c3`, and Pages run 45276962400 succeeded. The invitation POST correctly returns JSON 401 without authentication; this proves reachability, not email delivery. The owner tested three recipient emails and reports app success with none received. Exact UI confirmation/provider/spam details were requested but not supplied; do not assume Gmail accepted these attempts, or treat displayed invitation codes as delivery evidence.

Prepared a narrow read-only mode in the existing cloud report (`DAILYBUDGET_MAIL_AUDIT=1`, or file CLI flag `--invitation-mail`). It checks effective sender/host/port matches and password-secret binding as booleans, then reads only five most recent automatic-delivery states/failure codes/timestamps using Firestore field projection. It makes two authenticated GETs to fixed Google endpoints with the DailyBudget quota header; it never sends/resends email, changes configuration, reads secret values or returns recipient addresses, invitation codes, document IDs, tokens or raw errors. Six cloud-report tests pass, including redaction and blocked/empty distinction. Ask the owner to run the reviewed script from Cloud Shell and return its sanitized output. No further deploy is required for this check.

## Cloud deployment confirmed; HTTP invocation recovery — November 23, 2026

The owner reported enabled SMTP secret version 1, corrected SMTP user/host/port, retried the interrupted deployment and supplied **Deploy complete!** for reviewed source `f45d303`. PRs #15/#16/#17 are now merged into main (`50aa679`); its tree is identical to reviewed source. Pages publication succeeded (run 45274648030). Live HTML/JavaScript return HTTP 200 and include the new Settings, Account/receipt and subscription UI markers. Served bundle is `entry-5669fd74fdae68dda04accffb6a75910.js`, SHA-256 `30bb35671429c03cb4a8c52833d4b935171de2c64361af29d0ba7c93a262aa35`. Paid store purchasing remains disabled; real inbox delivery, store/device tests and the remaining recovery/privacy gates are still unverified. Do not ask the owner to repeat password setup or deploy all functions solely to fix HTTP access.

Live receipt `/access` rejects anonymous callers with the expected HTTP 401. The new invitation and store-notification endpoints return Google's HTTP 403 before their handlers. Firebase CLI 15.36.0 sets the default public invoker on creation but leaves unspecified invoker unchanged on updates; interrupted initial creation can therefore leave invocation permissions unrepaired by a successful retry. This is consistent with the symptoms, not proof of the exact live IAM policy. The owner has been given two targeted `gcloud functions add-invoker-policy-binding ... --member=allUsers` commands, which handle gen2 Cloud Run invocation. The owner supplied successful `roles/run.invoker` bindings for both services. Live recheck now returns the expected application JSON HTTP 401 from an empty invitation POST, while store-notification GET `/` reaches Express and returns its expected unsupported-route 404. No invitation was sent by these probes. Real inbox/code/link/join testing was requested from the owner and remains pending. These permissions expose only the HTTP entry points; Firebase-token/current-family checks, store signature verification and private Storage/Firestore rules remain in place.

The source now declares `invoker: "public"` explicitly on all three existing HTTP functions, so future update deployments can restore their intended invocation policy. Scheduled maintenance is unchanged. No new password, schema, payment activation or data access was introduced. A local generated-endpoint check verifies the three public invocation declarations and absence of an HTTP trigger on maintenance; full CI must pass before merging this recovery change.

## Shared visual refresh — November 23, 2026

The owner's visual brief is implemented on `codex/shared-ui-polish`, stacked above the subscription checkpoint PR #16. See `docs/UI_POLISH.md` for the seven delivery stages, changed files, preview instructions and deliberate exceptions. The existing framework, service calls, financial calculations, database/rules and dependencies are unchanged relative to `2cc60e0`; the requested Account destination reuses the original Settings profile/deletion handlers. Inter uses existing expo-font, with its OFL license bundled. Shared controls, nested budget areas/category sheets, Account, drawer and receipt states use the tokens. Free-family receipt guards and account identity/sole-admin protections remain.

Normal-size white button text uses #0C8573 for AA contrast; #0F9D88 stays the accent. Inputs are now 48px per the latest brief, superseding the earlier 60px preference. Information glyphs remain uniformly 20px with a 48px touch area. Existing Auth photos/initials are used; custom profile-photo storage/avatar persistence is deferred under the explicit no-model/no-storage-change constraint. Unloaded category groups say View categories rather than adding aggregate reads; category defaults and the drawer library's animation remain.

TypeScript/lint, finance14/cloud4/backend-unit20 and web/Android/iOS JavaScript exports pass. All 23 Chromium flows pass (receipts9, invitation/visual9, deletion5); after final copy changes, the phone/Edit and three new visual cases pass again. Nine iPhone-configured WebKit checks pass (phone/Edit1, visual3, protected account deletion5). An obsolete Family Setup assertion was corrected to Family setup; the WebKit test clicks the opening sheet field before entering/verifying text. No native binary or physical phone test is claimed. UI review: PR #17, stacked on #16; final-head GitHub checks must be green before merging.

Keep PR #15 open until owner SMTP secret storage and reviewed Firebase Functions/rules deployment are verified; only the masked secret prompt has been received. PR #16's full GitHub checks passed (run 45237767202), but real store products, native builds, sandbox purchases/notifications and activation are still pending. Payments default disabled. Do not publish this stacked UI independently against old production rules, claim live invitation delivery or move the Milestone 2 tag.

## Subscription foundation and incoming visual brief — November 23, 2026

The owner supplied the complete subscription specification and selected **direct Google Play / Apple integration**, declining RevenueCat. Proposed USD prices are 4.99/8.99/14.99 monthly, annual 15% discount rounded to 50.90/91.70/152.90; shared family quotas are decimal 2/5/20 GB with a hard 10 MB file cap. Premium alone offers a one-month store-configured trial. No live purchase, price, trial or paid access was activated. The old unanswered pricing question is superseded by this specification.

New private catalog, store verification/bindings, Google OIDC/Apple signed notifications, reconciliation/manual refresh, native expo-iap adapter, storage meter, subscription screen, downgrade ZIP review and owner How-to are prepared. RevenueCat/react-native-iap/Nitro experiment dependencies were removed; installed native billing dependency is **expo-iap**, using existing Expo framework. Downgrades keep selected newest/oldest originals that fit, export extras in 50 MB ZIP parts, require separate deletion confirmation, and block uploads until a verified upgrade. No unchosen automatic excess deletion is enabled. Paid cancellation preserves access until verified period end, then 30-day downloads; manual-grant behavior remains separate. Store ownership transfers require operator review.

Local checks: TypeScript/lint, backend units20, existing rules14, initial full integration65, plus focused subscription suite15 including new refresh cooldown and quota-change race. Store-response tests are mocked in isolated Firebase emulators; actual Apple certificate verification rejects forged JWS. Real store/native-build/device/webhook evidence remains absent, so purchases default disabled. `docs/SUBSCRIPTIONS_ADMIN.md` contains configuration/testing instructions. Source is not deployed. PR #15 (67c2aed) for Premium discovery/invitation emails remains open, GitHub checks passed, owner was at the masked SMTP secret prompt; successful secret storage/deployment has NOT been received. Preserve that dependency; do not claim real invitation delivery.

A new pasted **VISUAL/UX ONLY** brief is now active alongside subscriptions: tokens in existing styles file, nested Settings cards/category sheets, a separate Account screen reusing deletion safeguards, drawer icons/family header, plain-language receipt empty state and shared polish at 360px. No new UI dependencies, models, backend logic or schema are authorized for that visual pass. Profile-photo upload/selection would violate its explicit model/storage constraints; use initials/existing auth photo and report custom avatar persistence deferred. White on requested #0F9D88 is only 3.39:1; use #0C8573 (4.55:1) for normal-size white button text and keep #0F9D88 accent. No theme file exists beyond app/components/common/dashboardStyles.ts; put shared tokens there. User asks delivery steps in order and file summaries after each step. Keep UI changes in separate reviewable commits from billing. Do not spawn agents.

## Active feature: Premium entry points and emailed invitations — November 22, 2026

Branch `codex/premium-entry-and-email-invitations` prepares visible Upgrade actions in receipt viewers, an honest checkout-unavailable plan page, and actual server-side invitation-email support. Current cancellation policy remains 30-day view/download/export grace, then eligible receipt cleanup, with budget entries preserved; separately granted receipt-administrator sponsorship can retain uploads. No purchase/provider/price/paid entitlement was created. Owner questions on pricing/billing period and paid feature inclusion in the first store release remain unanswered.

Read `docs/PREMIUM_INVITATIONS.md` before activation. New `familyInvitationsApi` is in existing us-west1, binds only `INVITATION_SMTP_PASSWORD`, defaults to Gmail SMTP as dailybudgethub@gmail.com, and uses verified current-admin authority, bounded quotas, stable request claims and sanitized errors. A provider-accepted email is not proof of inbox delivery; uncertain attempts are not automatically resent. Private delivery/quota records expire after seven days via maintenance. Codes last ten minutes; public HTTPS links preserve code through Google/email flows and require verified recipient email plus explicit joining. Native automatic App Links are not implemented. Manual fallback explicitly says no email was sent.

Security fixes require coordinating deployment: deploy reviewed Functions/Firestore rules BEFORE publishing the matching frontend. Both new-family paths now atomically create family/membership/profile; creator bootstrap only applies to genuinely new families. Former creators cannot regain/delete without current admin authority. Expired/used invites and unverified recipients are denied. Signup failures no longer delete an existing signed-in account. Old two-step creation is incompatible with new rules during the transition; existing active family records need no migration. Former-family attribution cleanup remains open.

All 20 Chromium browser flows passed (9 existing receipts/sign-in, 6 new Premium/invitation, 5 existing deletion), plus local TypeScript/lint, finance14/cloud4/backend-unit9/rules14/integration52. Automated email is only a fake mailbox restricted to @example.test. The six new invitation/Premium browser cases also pass in iPhone-configured WebKit, and production web plus Android JavaScript exports pass. These are not physical-device or native-binary tests. Real SMTP setup/deployment, real inbox/device results and payment lifecycle remain open. Workspace has no owner Google credentials: owner must create a sender App Password (never in chat/repo), save it through the Firebase CLI's interactive Secret Manager prompt and deploy the reviewed branch. Keep the PR unmerged until owner deployment evidence; then publish matching frontend promptly after all GitHub checks pass. Milestone 2 v0.2 remains at d56ff46 and must not move.

## Published checkpoint and next Android milestone — November 22, 2026

PR #14 merged as `b04c2f5`. Full GitHub verification succeeded: four cloud-report tests, 14 accounting tests, six receipt unit tests, 11 rules tests, 40 receipt integration tests, nine receipt/sign-in browser flows and five account-deletion browser flows. Run: https://github.com/atashVibe/DailyBudgetApp/actions/runs/45062234202 . The updated Google startup flow also passes a focused local emulator run (18.7 seconds). Earlier failed attempts and the bounded startup/trace mitigation are documented below; no product authentication/UI behavior was changed.

The owner has a personal Play Console account; creation date and verification/production access are still unknown. A preference question about including family Premium purchases in the first public release is pending; do not infer an answer. The next recommended delivery milestone is a fresh Android build installed through Google Play Internal Testing, followed by the applicable testing/store gates in the roadmap. No new native build or Play upload/submission was performed in this session. Android-first scope keeps Apple/iOS and advanced reports deferred. Cloud configuration is verified as recorded below; actual backup copy/restore, receipt-original recovery, budget period/scope/recipients/delivery, effective IAM and retained-copy expiry remain open.

## Android-first release planning and CI follow-up — November 22, 2026

The owner asked what remains before the first Play Store release and confirmed an existing personal Play Console account. Creation date, identity-verification status, app record and production-access/testing gate are still unknown. Added a dated Android-first checklist to the roadmap with current official Google sources: latest signed store build/Play Signing and Google login, real Play-installed device/family/deletion checks, operational recovery gates, store forms/listing/reviewer access, conditional 12-testers/14-continuous-days closed testing for accounts created after November 13, 2023, and production review/rollout. Current target-API guidance is Android 16/API 36. Paid family Premium's inclusion in release one is undecided; if included, its policy-compliant purchase/backend verification and lifecycle must be built/tested. Do not infer that a prior preview APK or web publication fulfills this. Apple/iOS and advanced reports remain deferred. Next delivery milestone is a fresh Play Internal Testing build, not immediate public submission.

PR #14's report changes pass four unit tests and have been verified by the owner in Cloud Shell. Two GitHub attempts timed out in the existing first Google-popup browser flow; eight other receipt flows passed. The unchanged Google flow passes a focused local emulator run with tracing. Improve the first cold-page test to wait for DOMContentLoaded plus its existing explicit app-readiness check, wait for popup DOMContentLoaded, bound browser action/navigation waits to 30 seconds and retain/upload emulator-only failure diagnostics for three days. No functional assertions are removed and the overall test timeout is not increased. Full GitHub validation must pass before merging; the original timeout's exact action was not captured, so do not claim a proven product root cause. No app UI/authentication behavior changed in this CI adjustment.

## Cloud inspection verified: existing budget and email privacy — November 22, 2026

The owner ran the corrected report (`8cd6f12`) at `2026-11-22T19:26:14.193Z`. Auth privacy became readable and `emailEnumerationProtection` is true. Budget inspection still reported `SERVICE_DISABLED` with `consumerProjectMatchesDailyBudget: true`. The owner enabled only `billingbudgets.googleapis.com` for DailyBudget and supplied the successful operation result. No Authentication setting, IAM role, budget amount or recipient was changed.

The owner's next report at `2026-11-22T19:28:18.981Z` reads both configurations successfully. An existing applicable budget named `Firebase Project dailybudget-35c26` is USD 10, with CURRENT_SPEND thresholds at 50%, 90%, 100% (USD 5/9/10). Default billing IAM recipients are enabled and no custom Monitoring channels are configured. Preserve this budget; do not create a duplicate or assume the support email is an actual recipient. Its period/exact project scope and delivered notification evidence were not included in the report. Budget warnings do not cap charges.

Daily 14-day backups remain scheduled; no completed copy is listed yet, roughly 17 minutes after schedule creation. Keep actual backup/isolated restore, receipt-original recovery, inherited/object-ACL IAM review, real retained-copy expiry and device unknown-account/reset behavior open. Next: owner verifies actual billing recipients/delivery and the first backup when available, then plans restore and independent receipt-original recovery. Apple remains deferred; family Premium purchase/provider/pricing are still planned. See `docs/CLOUD_READINESS.md` and the roadmap for the verified/open split.

## Explicit project for cloud inspection — November 22, 2026

The owner's report from `df9b3c2`, timestamped `2026-11-22T19:21:00.402Z`, independently confirms the daily backup schedule with `1209600s` retention. No backup copy is listed yet (about ten minutes after schedule creation). The latest receipt maintenance invocation reports status 0 at `19:07:02.385108Z`; actual retained-copy expiry remains untested. Billing-budget and Auth-privacy checks return `SERVICE_DISABLED` for `billingbudgets.googleapis.com` and `identitytoolkit.googleapis.com`; the earlier script did not capture which consumer project Google used.

Found and corrected a missing inspection-request setting: raw gcloud user-token GETs did not send `x-goog-user-project`. Google's official print-access-token reference documents that these requests can otherwise produce disabled-service errors for the Cloud SDK project. This may explain the owner's errors but is not confirmed without a live rerun. The report now explicitly selects `dailybudget-35c26` on every read and emits only a boolean consumer-project match for recognized error metadata. It never prints another project identifier, credentials or raw error metadata. Tests verify the fixed header on every request and matching/mismatching/invalid consumer diagnostics. No API enablement, IAM grant, Authentication upgrade, backup change or payment action was performed.

Next owner action: rerun the corrected read-only report after publication. Do not infer that the APIs are disabled in DailyBudget from the previous errors alone. Keep billing alerts, email-privacy configuration, actual backup-copy/restore, original-file recovery and effective-IAM gates open. The workspace still has no Google owner credentials. Apple remains deferred; family Premium purchasing is still planned.

## Daily backup schedule created — November 22, 2026

The owner's Cloud Shell output confirms creation of the default database's daily backup schedule at `2026-11-22T19:11:07.568019Z`, ID `2030ce62-395e-45bc-8e87-9e3b672ca515`, retention `1209600s` (14 days), with `dailyRecurrence: {}`. A repeated create returned `ALREADY_EXISTS` for the same frequency. The first creation succeeded; leave this schedule in place and do not delete/recreate it to address the second response.

Schedule creation is now verified in the roadmap and `docs/CLOUD_READINESS.md`. A completed backup copy, isolated restore and independently protected receipt-original backup remain unverified. The next owner action is rerunning the read-only report from `df9b3c2` (or later) to list actual backup copies and obtain safe reason codes for the billing-alert/Auth-privacy 403s. The updated report was merged as PR #13; all GitHub checks passed. The workspace still has no Google owner credentials; no production mutation was performed from here. Keep Apple deferred and family Premium checkout/pricing pending.

## Live cloud findings and selected backup policy — November 22, 2026

The owner ran the published read-only report from `f706d86` in Cloud Shell and supplied the output timestamped `2026-11-22T19:02:41.864Z`. Firestore `(default)` is in `us-west2`, PITR is disabled, and both backup schedules and backup-copy lists are empty. Receipt storage has public-access prevention enforced, seven-day soft deletion, no public principals in the returned bucket policy, fine-grained access and no versioning/retention lock. This does not complete inherited/object-ACL review. The API is active using the default Compute service account; hourly maintenance is enabled and reports status 0 for its last invocation, which does not prove actual retained-copy expiry. Budget-alert and Auth-privacy checks returned 403; their configuration remains unknown.

The owner selected daily database backups kept for 14 days after disclosure of size-based Google backup-storage charges. `docs/CLOUD_READINESS.md` contains the reviewed setup/list commands and the separate cloud-original/restore gates. This workspace still has no owner Google credentials; the next owner action is running the schedule-creation command in Cloud Shell and returning its output. Do not mark the schedule, a READY copy or a restore complete yet. Database snapshots exclude receipt originals and Authentication identities, and same-project snapshots alone do not complete independent app recovery.

Improve the GET-only report with allowlisted Google denial reason/service diagnostics, never raw error messages or arbitrary metadata. A 403 may come from permissions, disabled APIs, token scope or quota-project requirements; do not grant broad IAM roles or enable APIs without evidence. No cloud settings, backup jobs, billing alerts, IAM roles, authentication policies or receipt data were changed in this workspace. No app UI/backend/rules change or owner redeployment is needed for this report update.

Prior roadmap implementation was merged as PR #12, deployed to Pages at `f706d86`, and verified with a live login/popup-opening smoke check. Milestone 2 remains `v0.2` at `d56ff46`. Family Premium purchasing is still planned, with pricing/provider/checkout pending; Apple remains deferred. Next: verify the selected backup schedule/copy, diagnose the two denied checks, then plan an isolated restore and independently protected cloud receipt backup alongside the two-phone family rehearsal.

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
