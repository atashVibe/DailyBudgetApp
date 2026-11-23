# Leave family and branded email actions

## Behavior

Account and Switch family both offer **Leave family**. The confirmation names the family and explains that the account survives, shared entries/receipts remain with the family, and the leaving member loses access. After leaving, the user can start/join another family, open Account, edit their name, sign out or request account deletion. Leaving does not cancel a store subscription.

The existing receipt API checks the caller's Firebase token, current family and membership revision. Its transaction marks only that membership inactive and clears only that user's current family/role. The last live administrator cannot leave; two simultaneous departures cannot remove both remaining administrators through this endpoint. Disabled/deleted Auth accounts do not count as other administrators. No Firestore/Storage rules, subscription entitlement, shared entries or file contents are changed. Existing legacy switch/deletion flows are not a claim of a globally race-proof administrator policy.

`auth-action` uses shared AuthCard, text, inputs, buttons and theme for email verification, password reset and email recovery. It checks links without consuming them, requires explicit confirmation, handles expired/wrong-mode links and connection retries, ignores an incoming API key and only returns to known internal app routes. Invitation context survives verification; verification never signs in a different account or joins a family automatically. Action codes are suppressed from referrer headers, including before application startup.

## Deployment order (owner Cloud Shell required)

1. Deploy the reviewed branch's existing `receiptsApi` first. No mail credentials or new cloud service are needed:

```bash
nvm install 24 &&
cd ~/DailyBudgetApp-receipts &&
git fetch origin codex/leave-family-branded-verification &&
git switch --detach FETCH_HEAD &&
npm ci --prefix functions --engine-strict &&
npx --yes firebase-tools@15.36.0 deploy --project dailybudget-35c26 --only functions:receipts:receiptsApi
```

2. After successful deployment and full CI, merge/publish the matching app through the existing GitHub Pages workflow. Verify `/DailyBudgetApp/auth-action` is live before changing Firebase's email links.
3. In [Firebase Authentication email templates](https://console.firebase.google.com/project/dailybudget-35c26/authentication/emails), edit Email address verification → **Customize action URL**, enter **https://atashvibe.github.io/DailyBudgetApp/auth-action**, then save. Firebase applies the custom action URL to all email templates. Setting `ActionCodeSettings.url` in source only sets the continuation destination; it does not replace Firebase's hosted handler.
4. Test a newly generated verification email and reset email. Previously issued links retain their original handler. Used verification links cannot be reused as successful verification tests.

Official reference: https://firebase.google.com/docs/auth/custom-email-handler

## Verification boundaries

Backend tests exercise retained original files/shared records, lost access, caller isolation, stale/rejoined membership, last-admin protection, concurrency, store binding and authenticated HTTP routes. Browser tests exercise confirmation/cancellation, explicit email verification/join, password reset, invalid links, network retry and Account without a family. Automated checks use isolated Firebase emulators. Browser WebKit coverage is not a physical iPhone/native binary test. Real email-template configuration and real leave/verification checks require the owner after deployment.

The owner has already confirmed real invitation delivery, account creation, email verification and joining after SMTP secret version 2 was bound successfully. Do not repeat SMTP setup. Store purchasing remains disabled pending actual store integration testing; Milestone 2's existing release tag is unchanged. Former-family attribution cleanup and the separate cloud recovery/privacy gates remain open.
