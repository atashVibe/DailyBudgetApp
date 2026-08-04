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
- Apple login is intentionally unavailable in the native Android app.
- Apple Developer identifiers, Firebase configuration, and Sign in with Apple are configured.
- The iOS preview build is waiting until I have access to the trusted device needed for Apple two-factor authentication.
- The Apple private `.p8` key is stored outside the repository in Personal Vault. Never display it, move it into the project, or commit it.

## Highest-priority work

1. Implement a safe **Forgot Password** flow for email/password users.
2. Prevent Apple-only users from being locked out after moving to Android:
   - Let a signed-in Apple user link an Android-compatible login method, such as Google and/or email/password.
   - Preserve the same Firebase UID, family membership, roles, and budget data.
   - Warn Apple-only users to add another method.
   - Prevent Hide My Email users from accidentally creating a second account.
   - Test the complete iPhone-to-Android account-access path when an iPhone build is available.
3. Finish the required public Privacy Policy, account-deletion, support/contact, and Terms pages using `dailybudgethub.com`.
4. Continue the beta-readiness and real-device checklist in `docs/ROADMAP.md`.

Reports and graphs are important, but they are planned as a later Version 2 candidate. The roadmap includes category, budget-area, trend, comparison, filter, accessibility, and export ideas. Do not let reporting delay the first safe beta.

Implement safe repository changes directly, run checks appropriate to the changes, preserve unrelated work, and commit/push only after reviewing the diff. Explain unfamiliar Firebase, Apple, or store-console actions clearly without making the steps excessively small.
