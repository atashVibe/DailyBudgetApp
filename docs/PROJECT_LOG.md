# DailyBudget Project Log

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

### 2026-11-14 — GitHub Pages release preparation

- Owner requested publication to the existing Pages URL for phone testing.
- Verified TypeScript, lint, whitespace, and a production export with the real
  `/DailyBudgetApp` base path. Removed an Android app-ID override from the web
  deployment workflow; Auth and Firestore use the existing public project settings.
- PR #1 is being merged for the Pages workflow. Confirm the deployment completes
  and the live recovery screen works before treating publication as verified.

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
