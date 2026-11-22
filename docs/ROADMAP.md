# DailyBudget Roadmap

## Milestone 2 checkpoint — v0.2

[Milestone 2 release](https://github.com/atashVibe/DailyBudgetApp/releases/tag/v0.2) is the versioned web/source checkpoint for family receipts, corrected accounting/status rules, the reference dashboard/category icons and mobile sign-in/Edit recovery. Publication follows checks and the matching GitHub Pages deployment; the release page records the published tag. It does not stand for App Store/Google Play delivery or completion of every device/production gate below.

**Information-button standard:** every information action uses `components/InfoButton.tsx`: the approved 20px outline glyph and muted color from Budget Overview, with invisible hit slop for tapping. Do not add page-specific icon sizes, filled circles or border/color overrides. Supply a meaningful accessible label and the current expanded state; leave layout to the caller. Budget Overview and the receipt explanation both use this component.

## Recommended next work after Milestone 2

1. **Two-person real-device family rehearsal.** On iPhone and Android, verify Google/email login and reopen, invitations/joining, synchronized entries, and shared receipt view/download/replace/delete. Verify that removing/leaving a family stops access and that an unrelated family cannot see its data. Existing emulator tests are evidence for the code, not proof of the live two-person/device path.
2. **Account recovery and deletion completion.** Verify reset-link errors and unknown-email behavior; verify Google/email deletion, sole-admin handling, and inability to reuse the deleted account. Finish trusted cleanup of attribution in families a user left previously. Apple/provider-linking work remains deferred at the owner's request.
3. **Cloud operations before a wider beta.** Verify billing/usage alerts, choose an independent backup and demonstrate a restore, and check actual shared-storage permissions and scheduled receipt cleanup/retention. Storage soft deletion and receipt export alone are not a tested independent recovery plan.

After those checks, follow the existing private-beta/device distribution plan. Keep reports/charts, payment integration and other major features later; do not start them as part of this release. The owner reviews the next task before expanding scope.

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
- [ ] Verify Firebase email enumeration protection and unknown-account behavior
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
