# DailyBudget Roadmap

## Milestone 2 checkpoint — v0.2

[Milestone 2 release](https://github.com/atashVibe/DailyBudgetApp/releases/tag/v0.2) is the versioned web/source checkpoint for family receipts, corrected accounting/status rules, the reference dashboard/category icons and mobile sign-in/Edit recovery. Publication follows checks and the matching GitHub Pages deployment; the release page records the published tag. It does not stand for App Store/Google Play delivery or completion of every device/production gate below.

**Information-button standard:** every information action uses `components/InfoButton.tsx`: the approved 20px outline glyph and muted color from Budget Overview, with invisible hit slop for tapping. Do not add page-specific icon sizes, filled circles or border/color overrides. Supply a meaningful accessible label and the current expanded state; leave layout to the caller. Budget Overview and the receipt explanation both use this component.

## First public Google Play release — remaining work

The owner confirmed a **personal Play Console developer account** on November 22, 2026. Account creation date, identity verification and app setup/production access have not yet been inspected. The current website and older direct-install Android preview do not prove that the latest app is ready for Play production.

- [x] Owner has a personal Play Console developer account.
- [ ] Confirm account verification, create/inspect the DailyBudget app record, and check the account's production-access requirements.
- [ ] Decide whether purchasable family Premium is included in the first release. If included, choose price/billing period, implement a policy-compliant Android purchase flow with backend verification and family-wide access, and test renewal/cancellation/refund/restore behavior in a sandbox. Google Play Billing is the standard path for these digital features; any market-specific alternative requires reviewing eligibility and applicable rules. No checkout is implemented yet.
- [ ] Build a signed Android App Bundle for `com.atashvibe.dailybudget`, configure Play App Signing and the correct Firebase/Google login signing fingerprints, and upload to Internal Testing. Verify current target-API and native-library compatibility in the built artifact, including Android 16/API 36 and 16 KB compatibility; the source configuration alone is not evidence.
- [ ] Install through Google Play on real Android phones and test Google/email login, reopening, family invitations/roles, accounting/refunds/income/cashback, shared receipts, camera/PDF permissions, editing, Back/keyboard behavior and slow/offline recovery. Finish account-deletion cleanup for previous family memberships and verify deletion/reset behavior on spare accounts. Apple-specific work remains deferred for this Android-first scope.
- [ ] Finish our operational launch safeguards: an actual database backup and isolated restore, independently protected cloud receipt-original recovery, billing recipients/delivery, effective IAM and real retained-copy expiry. These are project readiness criteria, separate from Play's forms.
- [ ] Finalize name/icon/screenshots/feature graphic/descriptions/support contact. Review existing public privacy/terms/deletion pages against final receipt/payment/retention behavior. Complete Data safety, account deletion, Financial features, age/target-audience/content rating and ads declarations accurately; provide a working reviewer account with sample family data and access instructions.
- [ ] Run Internal Testing, then Closed Testing as required. Personal accounts created **after November 13, 2023** must have at least **12 testers opted in continuously for 14 days**, then apply for production access and provide genuine testing/feedback evidence. Account type alone does not establish whether this gate applies; approval is not automatic.
- [ ] Resolve critical findings, submit the tested build for review, and use a controlled production rollout with monitored support/errors/costs.

Recommended next delivery milestone: **a fresh build in Play Internal Testing**, while the remaining release gates are completed. Advanced reports and Apple/iOS delivery remain later; paid Premium's inclusion in the first public release is still an owner decision.

Google requirements checked November 22, 2026: [personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465), [target API](https://support.google.com/googleplay/android-developer/answer/11926878), [native page-size compatibility](https://developer.android.com/guide/practices/page-sizes), [digital payments](https://support.google.com/googleplay/android-developer/answer/9858738), [user data and account deletion](https://support.google.com/googleplay/android-developer/answer/10144311).

## Recommended next work after Milestone 2

1. **Finish account recovery/deletion verification.** The Google confirmation bug is now fixed and passes isolated tests for same-user deletion, wrong-user rejection, cancellation, sole-admin protection and ownership changes during confirmation. Remaining work: actual iPhone/Android confirmation on spare accounts, live reset-link/unknown-email protection checks, and trusted backend attribution cleanup in families the user previously left. Apple/provider-linking work remains deferred.
2. **Two-person real-device family rehearsal.** On iPhone and Android, verify Google/email login and reopen, invitations/joining, synchronized entries, and shared receipt view/download/replace/delete. Verify that removing/leaving a family stops access and that an unrelated family cannot see its data. Existing emulator tests are evidence for the code, not proof of the live two-person/device path.
3. **Cloud operations before a wider beta.** Verify billing/usage alerts, choose an independent backup and demonstrate a restore, and check actual shared-storage permissions and scheduled receipt cleanup/retention. Storage soft deletion and receipt export alone are not a tested independent recovery plan.

The owner has authorized progressing through this roadmap. Complete independent code/tests and record device or production checks only when verified. After readiness checks, follow the private-beta/device distribution plan. Family Premium purchase is now an explicit requested feature below; implementing checkout still needs pricing/payment decisions. Keep reports/charts and Apple-specific work deferred.

## Roadmap execution after Milestone 2

- [x] Prepare Google confirmation before the user's tap and reauthenticate the existing user without switching the main app account.
- [x] Bind deletion to the intended UID, get current server ownership before cleanup, and preserve sole-admin protection.
- [x] Verify cancellation/wrong-account/password errors, shared-history/original preservation, sole-family removal and new sign-in losing old-family access in isolated browser tests.
- [x] Add repeatable emulator-only browser checks to GitHub CI alongside existing receipt/sign-in regressions.
- [x] Prepare a read-only owner report for backup schedules/copies, storage protection/IAM, billing alerts, receipt jobs and Auth email privacy. Unit tests verify GET-only access, fixed Google hosts, secret filtering and blocked-permission reporting.
- [ ] Verify the deletion confirmation on actual iPhone/Android hardware using spare DailyBudget accounts.
- [x] Run the owner report against the live project. Owner supplied the Cloud Shell output on November 22, 2026; the initial report showed no backups, while budget-alert/Auth-privacy queries returned 403 and remain unverified. See `docs/CLOUD_READINESS.md`.
- [x] Choose the database backup policy with the owner: daily copies, retained 14 days; size-based storage charges disclosed.
- [x] Create the selected daily backup schedule with 14-day retention. Owner supplied the successful Cloud Shell output (`1209600s`); a repeated create returned the expected `ALREADY_EXISTS`.
- [ ] Verify an actual backup and demonstrate an isolated restore. Receipt originals require a separate cloud backup/recovery plan.
- [x] Resolve the cloud inspection failures and verify an existing applicable USD 10 budget with USD 5/9/10 warning thresholds; actual notification delivery remains open.
- [ ] Configure/verify any missing production safeguards only after inspecting the report; choose alert thresholds and backup retention with the owner.

The current browser tests prove a second identity retains shared entries and original receipt bytes after the first user's deletion. They do not complete the following live-device rehearsal:

- [ ] Use two spare DailyBudget accounts/devices and a test family with existing receipt-upload access; no real payment is required for this rehearsal.
- [ ] Invite the second account as a member, join using the valid code, and confirm an unrelated account cannot reuse that invitation.
- [ ] Add/edit entries from each device and verify both see the same records and correct totals after refreshing/reopening.
- [ ] Upload an original from one device; view/download/replace/delete it from the other as allowed by current family access.
- [ ] Verify a normal member cannot change administrator-only settings.
- [ ] Leave/remove the member and confirm refreshed app/receipt requests no longer grant family access. Existing downloaded copies are a separate matter from server access.
- [ ] Close/reopen each phone browser and verify Google/email sessions and the Edit form behavior.

### Read-only live cloud report

In the owner's Google Cloud Shell, update/read the script from this repository and run `functions/scripts/cloud-readiness-audit.mjs` with Node. It requires no npm installation and does not change settings or read budget entries/receipt contents. It obtains the owner's gcloud token in memory, sends GET requests only to fixed Google APIs, and never prints the token, function environment variables or unrelated project budgets. Share only the JSON report, not credentials.

A result marked `checked` means the configuration was read, not that recovery or notification delivery was proven. An empty schedule/budget list, a blocked API and an unperformed restore remain open checks. A real restore into a separate destination, original-file recovery, inherited IAM review, alert delivery and retained-copy cleanup still need evidence before the production gates are closed.

The owner supplied the first live report and successful creation of the 14-day daily database backup schedule on November 22, 2026. Findings, the exact schedule ID and read-only verification commands are recorded in `docs/CLOUD_READINESS.md`. A completed backup copy and restore remain unverified. The report now includes safe reason codes for blocked checks instead of assuming every 403 is an IAM problem.

The `19:21:00Z` follow-up independently confirms the daily/14-day schedule; backup copies are still absent. Both blocked checks report `SERVICE_DISABLED`, but the consumer project was unknown. The corrected report explicitly selects DailyBudget using Google's quota-project header and exposes only a boolean consumer-project match in safe diagnostics. The corrected rerun at `19:26:14Z` verified email privacy as enabled and identified the Budgets API as disabled in DailyBudget. The owner enabled that API; the `19:28:18Z` report reads both configurations. An applicable USD 10 budget already exists with USD 5/9/10 warnings and default billing IAM recipients enabled. Do not create another budget. Budget period/scope, actual email delivery, backup copies and restore remain unverified.

## Family Premium purchase — requested

A family administrator must be able to purchase Premium in the app to enable receipt uploads for the family. This is a requested feature, not just a possible paid idea. Checkout implementation follows the current readiness work and the owner's pricing/payment decisions.

- [ ] Decide the family price, billing period and payment provider/store approach with the owner.
- [ ] Add an Upgrade Family to Premium action for active family admins; other members see how to ask their admin.
- [ ] Create checkout on the trusted backend, bound to the authorized admin and the correct family. Prevent duplicate purchases/charges.
- [ ] Activate Premium only after server verification of a real payment/store purchase; never trust a browser success screen or allow client writes to paid access.
- [ ] One active family subscription enables receipt uploads for **all current members**, under the existing shared limits. It does not grant access to other families or former members.
- [ ] Support subscription management, cancellation, renewal, refunds/failures, restored purchases and idempotent payment notifications; preserve the existing receipt read/export/deletion and grace-period rules.
- [ ] Define what happens when the payer leaves, loses admin status or switches families; keep billing ownership separate from file permissions.
- [ ] Review Apple/Google payment rules for native distribution and test the full purchase lifecycle in a payment sandbox before taking real payments.

No checkout or price is enabled by adding this roadmap item. Existing manually granted/sponsored receipt access is not proof that payments work.

## iPhone field sizing, Edit and sign-in recovery

- [x] Bound the web date field and align free/Premium receipt controls beside their label.
- [x] Put month/year figures beside progress labels and connect Edit to the expanded form.
- [x] Prepare browser Google sign-in before enabling it; keep successful authentication separate from profile errors.
- [x] Add bounded connection-read backoff and spending recovery without replaying writes.
- [x] Finish Chromium/WebKit checks and publish PR #10 (`f751850`).
- [ ] Owner retests sign-in/reopen and Edit on iPhone 17 after the fixes.

## Google popup sign-in regression

- [x] Reproduce live `auth/argument-error` and restore the web popup resolver on demand.
- [x] Add browser coverage for Google popup cancellation/retry, fake sign-in and session restoration.
- [x] Complete checks and publish PR #9 (`54ed8b6`); live Google popup verified.
- [ ] Owner verifies Google sign-in and reopening on S22.

## Reference layout and Android session follow-up

- [x] Prepare reference card layout, current teal, taller controls and admin category icon library.
- [x] Fix saved-login restoration, persistent session initialization and bounded account loading/retry.
- [x] Verify browser session return and stalled-request recovery while preserving accounting/receipts.
- [x] Publish the reference website (PR #8, `7b5a127`).
- [ ] Get actual S22 feedback; clarify APK versus browser if needed.

Details: `docs/DASHBOARD_LAYOUT_SESSION_FIXES.md`.

## Receipt settings and navigation follow-up

- [x] Prepare upload-entitlement checks for enabling required categories, with server/rule enforcement.
- [x] Keep long selected filenames and Remove inside a narrow entry form.
- [x] Confirm Dashboard Back sign-out; preserve cancelled drafts and normal Back/Forward navigation.
- [x] Deploy updated receipt Functions/rules through the owner's Cloud Shell (`55c40ae`).
- [x] Publish the frontend including compact system-picker paperclip (PR #7).
- [ ] Owner production/device verification of all three reported fixes.

Details: `docs/RECEIPT_NAVIGATION_FIXES.md`.

## Required category receipt follow-up — November 16, 2026

- [x] Add family-admin receipt requirements per category and an entry-form attachment button with disabled gray Save when missing.
- [x] Add safe pre-save uploads, server/rule enforcement, idempotent retries and abandoned-draft cleanup; preserve accounting.
- [x] Deploy the required-category backend/rules/indexes and publish PR #6; owner tested and reported follow-up bugs.
- [ ] Owner verification of required-category selection, upload, save and edit in production.

See `docs/CATEGORY_RECEIPTS.md`.

## Owner-requested family receipts — November 16, 2026

- [x] Prepare family receipt UI, Firebase backend, permissions, retention and export on the review branch.
- [x] Verify emulator security/lifecycle, browser workflow, accounting regression checks, types, lint and web export.
- [x] Obtain approval for documented Firebase usage costs before backend activation (owner approved November 16, 2026).
- [x] Confirm bucket location/protection, deploy receipt services/rules/indexes, configure build-image cleanup and assign the existing owner securely.
- [x] Configure the public receipt API URL in the Pages workflow.
- [x] Publish the website and verify a real signed-in receipt upload (owner confirmed it works).
- [ ] Complete least-privilege production IAM review.
- [ ] Complete live family-sharing, cleanup and real-phone checks; verify independent backup/restore.

Details and remaining limitations: `docs/RECEIPTS_REPORT.md`.

## Goal

Release DailyBudget quickly without exposing real users or financial data to preventable problems.

The sequence is:

1. Beta-readiness fixes
2. Internal device testing
3. Private beta with friends
4. Public store launch
5. Monetization experiments

## Current Progress

- [x] Email/password authentication
- [x] Google authentication
- [x] Apple web authentication
- [x] Apple Developer App ID
- [x] Apple Services ID and private key
- [x] Firebase Apple configuration
- [x] Budget areas and categories
- [x] Default-selection behavior
- [x] Family creation, joining, and roles
- [x] TypeScript passes
- [x] Lint passes without errors
- [x] Commit and push the completed Apple-login work
- [ ] Test Apple login on a real iPhone
- [ ] Test Google login on real iPhone and Android devices
- [x] Build and install an Android internal-preview APK on a real phone
- [ ] Build and install an iOS preview after Apple two-factor access is available
- [x] Select the public beta/support email: `dailybudgethub@gmail.com`

## Milestone Tracking Rules

- Mark a roadmap item `[x]` only after the result is implemented or completed and verified.
- Do not mark an attempted, partially completed, or blocked task as finished.
- Record meaningful completed milestones in `docs/PROJECT_LOG.md` with the date and evidence.
- Commit and push every stable milestone so the roadmap and implementation remain synchronized.
- Update `docs/NEXT_SESSION_PROMPT.md` whenever a session materially changes the project state or next priority.

---

# Phase 1 — Mandatory Beta-Readiness Work

Do not add major features during this phase.

## 1. Save the Current Version

- [x] Review the Apple-login changes
- [x] Commit them
- [x] Push them to GitHub
- [x] Confirm the `.p8` Apple key is not inside the repository
- Release checkpoint tag: `v0.2` (Milestone 2); publication is recorded on the linked GitHub release page.

## 2. Account Deletion

Add an easy-to-find **Delete Account** option under Settings.

- [x] Require confirmation before deletion
- [x] Require recent sign-in before deletion
- [x] Support email/password reauthentication
- [x] Support Google reauthentication
- [ ] Support Apple reauthentication and token revocation
- [x] Support Apple reauthentication (native token revocation still needs a backend)
- [x] Delete the Firebase Authentication account
- [x] Delete the user profile
- [x] Delete the user’s family-membership record
- [x] Remove or anonymize personal data
- [ ] Add trusted backend cleanup for personal attribution in families the user left previously
- [x] Handle users who are the family’s only administrator
- [x] Require the administrator to transfer ownership or explicitly delete the family
- [ ] Test deletion with all three login methods
- [ ] Confirm deleted users cannot sign back into the old account

## 2A. Account Recovery and Cross-Platform Access

These are beta-release requirements, not optional Version 2 features.

2026-11-13 session scope: Apple-specific implementation and device testing are
deferred at the owner's request. Apple sign-in is disabled in the current beta. Leave
Apple checklist items open; the original cross-platform release gate is unresolved.

Password-reset request UI is implemented. TypeScript, lint, and web-export checks
are tracked in `PROJECT_LOG.md`. The owner reported the normal phone reset test
works on 2026-11-14. Enumeration protection and invalid/expired hosted-link tests
remain separate verification tasks.

- [x] Add a clear **Forgot Password** action to the login screen
- [x] Send Firebase password-reset emails (normal phone flow confirmed by owner)
- [x] Verify live Firebase email enumeration protection is enabled (owner reports November 22, 2026).
- [ ] Verify unknown-account/reset behavior on real devices
- [x] Show a clear reset-request confirmation
- [ ] Verify expired-link and invalid-link messages on Firebase's hosted page
- [ ] Let an authenticated Apple user add an Android-compatible sign-in method
- [ ] Support linking Google sign-in and/or an email/password login to the existing Firebase user
- [ ] Preserve the same Firebase UID, family membership, roles, and budget data when linking providers
- [ ] Warn Apple-only users to add another sign-in method before moving to Android
- [ ] Prevent Apple Hide My Email users from accidentally creating a separate account on Android
- [x] Add recovery guidance for users who no longer have access to their original provider
- [ ] Test this full path: create with Apple on iPhone, link another method, then sign in on Android and verify the same data

## 3. Required Public Pages

Create a small public DailyBudget website containing:

- [x] Privacy Policy
- [x] Account/Data Deletion Request
- [x] Support/contact page
- [x] Terms of Use
- [x] Public support email address selected: `dailybudgethub@gmail.com`
- [x] Links that work without signing into the app
- [ ] Connect `dailybudgethub.com` after verifying the existing domain/DNS setup

Public pages are live under `https://atashvibe.github.io/DailyBudgetApp/` at
`privacy`, `delete-account`, `support`, and `terms`. Pages run `43582463506`
published them. All four returned HTTP 200 with the expected content and links;
the live Support page was inspected in signed-out Chrome.

Add these links inside:

- [x] Sign-up screen
- [x] Settings screen
- [x] Deletion-information link in the Delete Account dialog
- [ ] Verify Settings and deletion-dialog links on signed-in devices

The privacy policy must accurately explain:

- Email address and user ID collection
- Budget entries and family data
- Firebase and authentication providers
- Why data is collected
- How it is protected
- Who it is shared with
- Data retention
- Account and data deletion
- Contact information
- Policy-update process

## 4. Database Security

Because DailyBudget stores personal financial information:

- [x] Review every Firestore security rule
- [x] Confirm users can only read their own families
- [x] Confirm members cannot perform administrator actions
- [x] Secure invitation codes
- [x] Prevent users from changing their own roles
- [x] Prevent access after leaving a family
- [x] Add Firestore rules to the repository
- [x] Test rules with two unrelated test families
- [x] Store the current Firestore indexes in the repository
- [ ] Configure Firebase usage/billing alerts
- [ ] Decide how backups and recovery will work
- [ ] Consider Firebase App Check before public launch

## 5. Stability Pass

- [x] Install Expo’s recommended compatible package versions
- [x] Run TypeScript
- [x] Run lint
- [x] Run Expo dependency checks
- [ ] Test email, Google, and Apple authentication
- [ ] Test sign-out for every authentication method
- [ ] Test creating and joining families
- [ ] Test invitation codes and role permissions
- [ ] Test adding, editing, and deleting entries
- [ ] Test budget-area and category changes
- [ ] Confirm changing defaults does not reorder the list
- [ ] Test empty families and empty categories
- [ ] Test archived categories and budget areas
- [ ] Prevent duplicate saves from repeated taps
- [ ] Show understandable errors when requests fail
- [ ] Test slow or disconnected internet
- [x] Add basic tests for financial calculations
- [ ] Check text size, contrast, and accessibility labels

## 6. Release Identity

- [ ] Decide whether the public name is `DailyBudget` or `DailyBudgetApp`
- [x] Confirm bundle/package ID: `com.atashvibe.dailybudget`
- [ ] Review the app icon on light and dark backgrounds
- [ ] Review splash screen
- [ ] Set version and build-number strategy
- [ ] Create separate test accounts and families
- [ ] Decide whether beta and production use separate Firebase projects

## Phase 1 Exit Gate

Proceed only when:

- [ ] No known data-loss or security bug
- [ ] No broken authentication method
- [ ] Forgot-password recovery works safely
- [ ] Apple-created accounts can access the same account on Android through a linked method
- [ ] Account deletion works
- [x] Privacy and deletion pages are public
- [ ] Core budget workflows work on web
- [ ] All work is committed and pushed

---

# Phase 2 — Internal Real-Device Testing

## iPhone

- [ ] Create the DailyBudget record in App Store Connect
- [ ] Verify agreements and developer information
- [ ] Create an EAS production iOS build
- [ ] Upload it to App Store Connect
- [ ] Wait for processing
- [ ] Add the build to TestFlight Internal Testing
- [ ] Install it from TestFlight on a real iPhone
- [ ] Test Apple login
- [ ] Test Google login
- [ ] Test email/password login
- [ ] Test every core budgeting workflow
- [ ] Test on at least one smaller and one larger iPhone if available

## Android

- [x] Create and install a direct Android internal-preview APK on a real phone
- [ ] Create the app in Google Play Console
- [ ] Confirm developer identity verification
- [ ] Create an EAS Android App Bundle
- [ ] Upload it to Internal Testing
- [ ] Add trusted tester email addresses
- [ ] Install it through Google Play
- [ ] Test Google and email/password login
- [ ] Confirm the Apple button is hidden
- [ ] Test the back button and Android keyboard
- [ ] Test at least two Android screen sizes

## Phase 2 Exit Gate

- [ ] No crashes during normal use
- [ ] Authentication works on real devices
- [ ] Data remains correct after closing and reopening
- [ ] Family permissions work
- [ ] Account deletion works
- [ ] No critical layout problems

---

# Phase 3 — Private Beta With Friends

## Prepare the Beta

- [ ] Write a short explanation of what DailyBudget does
- [x] Select the beta feedback email: `dailybudgethub@gmail.com`
- [ ] Create a feedback form if email alone is insufficient
- [ ] Prepare a simple “What to test” checklist
- [ ] Explain that beta data might be reset
- [ ] Never use real banking passwords or highly sensitive notes
- [ ] Establish how bugs should be reported

## Apple Beta

- [ ] Create a TestFlight external-testing group
- [ ] Add beta description and contact information
- [ ] Submit the build for Beta App Review
- [ ] Invite interested friends after approval

## Android Beta

- [ ] Move from Internal Testing to Closed Testing
- [ ] Invite friends using their Google accounts
- [ ] If required, maintain at least 12 opted-in testers for 14 continuous days before applying for production access

## Collect Useful Feedback

Ask testers to report:

- [ ] Where they became confused
- [ ] Anything they expected but could not find
- [ ] Login or invitation failures
- [ ] Incorrect budget calculations
- [ ] Data that disappeared or duplicated
- [ ] Screens that look bad on their phone
- [ ] Features they would actually pay for
- [ ] Features they do not care about

Classify feedback:

- **Critical:** crashes, security, data loss, incorrect totals
- **Important:** broken workflows or severe confusion
- **Later:** cosmetic preferences and new feature ideas

Complete at least two beta cycles before public launch.

---

# Phase 4 — Public Store Preparation

## Store Materials

- [ ] Final app name and subtitle
- [ ] Short and full descriptions
- [ ] App icon
- [ ] iPhone screenshots
- [ ] Android phone screenshots
- [ ] Optional tablet screenshots
- [ ] Category and age rating
- [ ] Keywords
- [ ] Support URL
- [ ] Privacy Policy URL
- [ ] Account-deletion URL
- [ ] Copyright and developer information

## Apple App Store

- [ ] Complete App Privacy disclosures
- [ ] Describe Firebase and authentication data accurately
- [ ] Complete export-compliance questions
- [ ] Provide App Review notes
- [ ] Provide a permanent demo account with sample data
- [ ] Make every major feature accessible to reviewers
- [ ] Select the tested TestFlight build
- [ ] Submit for App Review
- [ ] Use manual release after approval

## Google Play

- [ ] Complete Data Safety
- [ ] Complete Account Deletion disclosure
- [ ] Complete Financial Features declaration accurately
- [ ] Complete target-audience and content-rating forms
- [ ] Declare whether the app contains ads
- [ ] Provide permanent reviewer login credentials
- [ ] Complete package-name and identity verification
- [ ] Apply for production access if required
- [ ] Use a staged production rollout

## Public Launch Gate

- [ ] No unresolved critical beta issue
- [ ] Security rules verified
- [ ] Privacy disclosures match actual behavior
- [ ] Account deletion verified
- [ ] Reviewer account works
- [ ] Support channel is monitored
- [ ] Production data and backups are ready
- [ ] Store listings accurately describe existing features

---

# Phase 5 — After Launch

## First Weeks

- [ ] Monitor crashes and login failures
- [ ] Monitor Firebase errors, usage, and costs
- [ ] Respond to support requests
- [ ] Read store reviews
- [ ] Fix critical problems before adding features
- [ ] Release small, understandable updates
- [ ] Maintain release notes

## Product Decisions

Measure:

- [ ] How many invited users install the app
- [ ] How many finish family setup
- [ ] How many enter expenses repeatedly
- [ ] How many return after one week
- [ ] Which screens cause abandonment
- [ ] Which features testers repeatedly request

## Version 2 Candidate — Reports and Graphs

Do not delay the first safe beta for this work. Use beta feedback to decide which reports are genuinely useful.

- [ ] Define the reporting model and useful date ranges
- [ ] Add spending totals by category
- [ ] Add spending totals by budget area
- [ ] Add daily, weekly, monthly, and yearly trends
- [ ] Add budget-versus-actual comparisons
- [ ] Add period-over-period comparisons
- [ ] Add clear charts for category shares and spending trends
- [ ] Make every graph understandable without relying only on color
- [ ] Support useful filters such as family member, category, budget area, and date range
- [ ] Decide which reports belong in the free version and which could be paid
- [ ] Consider CSV/PDF export after the on-screen reports are validated

## Monetization

The requested **family-admin Premium purchase flow** is specified near the top of this roadmap. It must grant family-wide receipt upload access through verified backend payments, not a per-person entitlement.

Do not add payment complexity before users repeatedly use the app.

First:

- [ ] Interview active beta users
- [ ] Ask what problem DailyBudget solves for them
- [ ] Ask which feature would justify payment
- [ ] Identify whether users prefer subscription or one-time purchase
- [ ] Define a useful free version
- [ ] Keep basic data access and account deletion outside any paywall
- [ ] Review Apple and Google payment rules before implementing payments

Possible paid features to validate—not automatically build:

- Advanced household reports
- Longer history and comparisons
- Smart recurring-expense tools
- Data export formats
- Multiple family budgets
- Custom insights and alerts
- Shared planning features

## Finish-Fast Rules

- No major new feature before private beta.
- Fix critical bugs before cosmetic improvements.
- Work on one checklist item at a time.
- Commit every stable checkpoint.
- Do not rebuild working architecture without a demonstrated problem.
- Let real tester behavior decide which new features matter.
- Public release is not the finish line; a stable private beta is the next finish line.
