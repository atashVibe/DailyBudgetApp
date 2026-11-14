# DailyBudget Next-Session Prompt

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

Current owner direction (2026-11-13): skip Apple-specific work for now and follow
the remaining roadmap. Keep existing Apple sign-in and leave its unverified
requirements open.

1. Verify the implemented **Forgot Password** request flow with a test account.
   The login screen now links to `/forgot-password`, which sends Firebase reset
   emails, uses a generic confirmation for unknown/disabled accounts, and handles
   validation, network, and rate-limit errors. Firebase's default hosted email
   action page completes the reset. Verify delivery, reset completion, invalid,
   expired and reused links, and sign-in with the new password. Ensure Firebase
   email enumeration protection is enabled. No live auth requests were made in
   this session.
   TypeScript, lint, and production web export pass. `firebaseConfig.ts` now
   defaults to the public Firebase client configuration already tracked in
   `google-services.json`. A fresh cloud checkout runs without a `.env` file.
   Expo web is running in cloud Chrome at `http://localhost:8083/login` while the
   development server stays running. Synthetic invalid credentials received the
   expected Firebase rejection. Recovery navigation and empty-email validation
   were verified. A signed-in test session and reset-email delivery still need
   verification. Owner wants the cloud workspace only, no public deployment yet.
   Use plain, nontechnical explanations with the owner. GitHub access now works:
   checkpoint `9f910e2` was pushed to `codex/cloud-workspace-password-recovery`.
   Main has not been changed. The earlier GitHub authentication blocker is resolved.
2. Deferred for now: prevent Apple-only users from being locked out after moving to Android:
   - Let a signed-in Apple user link an Android-compatible login method, such as Google and/or email/password.
   - Preserve the same Firebase UID, family membership, roles, and budget data.
   - Warn Apple-only users to add another method.
   - Prevent Hide My Email users from accidentally creating a second account.
   - Test the complete iPhone-to-Android account-access path when an iPhone build is available.
3. Finish the required public Privacy Policy, account-deletion, support/contact, and Terms pages using `dailybudgethub.com` and `dailybudgethub@gmail.com`.
4. Continue the beta-readiness and real-device checklist in `docs/ROADMAP.md`.

Reports and graphs are important, but they are planned as a later Version 2 candidate. The roadmap includes category, budget-area, trend, comparison, filter, accessibility, and export ideas. Do not let reporting delay the first safe beta.

Implement safe repository changes directly, run checks appropriate to the changes, preserve unrelated work, and commit/push only after reviewing the diff. Explain unfamiliar Firebase, Apple, or store-console actions clearly without making the steps excessively small.
