# Family receipt implementation report — November 16, 2026

## Result

Prepared on `codex/firebase-receipts` from main `55a9f6f`. The receipt backend/rules have since been deployed through the owner’s Cloud Shell; the website publishing workflow is now connected to the live service; publishing and authenticated use are the next checks. The existing compact budget summary and accounting calculations are preserved.

Premium and Archive belong to a family. Every current family member can view, download, export, replace and delete shared receipts. Premium permits uploads; Archive and cancellation grace permit reading/export without new uploads. Deletion remains available regardless of payment. Former members and other families are denied. A separate global receipt administrator role can sponsor a current family without assigning a paid plan; family administrators cannot grant themselves that role. Membership is still required for file access.

## Changes

- Expense paperclips and the Family Receipts screen support original JPG/JPEG/PNG/PDF uploads, progress, retry, view/download, replacement, confirmed deletion and ZIP export with original bytes and SHA-256 manifest.
- An authenticated Firebase Functions gateway validates file contents and enforces family membership, plan permissions, two-receipt and shared storage limits. Direct Storage client access is denied. Production uploads require bucket public access prevention to be enforced.
- Firestore tracks family plans, separate global roles, receipt metadata, fenced mutation locks, unfinished uploads, cleanup jobs and audit results. Replacement commits the new original before deleting the old one. Unfinished upload candidates count toward quotas and are retried safely.
- Cancellation disables uploads immediately and grants one non-extending 30-day family grace period. Hourly maintenance rechecks current permissions before queueing expiry cleanup. Renewing or activating Archive before expiry prevents new expiry cleanup. Budget entries are never deleted by receipt retention.
- Cleanup distinguishes removing a live object from verified permanent deletion, tracks retained versions/soft-deleted copies and retries failures. The owner confirmed seven-day soft deletion; actual retained-copy cleanup and a least-privilege IAM review remain open.
- Account deletion preserves receipts for remaining family members and removes the departing user's visible receipt attribution; sole-member family originals are submitted for deletion after the existing account-deletion confirmation.
- A receipt administrator overview reports shared plans, deadlines, storage/version totals and a storage-only estimate when verified region/class pricing is configured. There is no payment integration and no automatically assigned production administrator.

## Files and schema

| Area | Created or modified files |
| --- | --- |
| Backend | `functions/src/{index,api,service,family-context,files,policy}.mjs`, `functions/scripts/{receipt-admin,emulator-demo}.mjs`, `functions/test/policy.test.mjs`, backend package/lock files |
| Receipt interface | `components/ReceiptPanel.tsx`, `services/receipts.ts`, `app/(drawer)/receipts.tsx`, drawer layout, `app/components/RecentEntriesList.tsx` |
| Account/privacy | `services/accountDeletion.ts`, `services/auth.ts` (development-only emulator opt-in), account settings confirmation, `app/privacy.tsx`, `app/delete-account.tsx` |
| Firebase/build | `storage.rules`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `app.json`, root package/lock files, `.gitignore` |
| Checks/deployment | `.github/workflows/test-receipts.yml`, frontend workflow API URL variable, `tests/receipts.integration.test.mjs`, `tests/receipt-ui.spec.mjs`, `playwright.receipts.config.mjs` |
| Documentation | `RECEIPTS_REQUIREMENTS.md`, `RECEIPTS_IMPLEMENTATION.md`, `RECEIPTS_SETUP.md`, this report, project log, roadmap and next-session prompt |

The additive Firestore schema introduces `receiptAccess/{uid}` for global roles,
`receiptFamilyAccess/{familyId}` for shared plans and deadlines, `receipts/{id}`
for original-file associations, `receiptLocks/{familyId}`, `receiptOperations/{id}`,
`receiptAudit/{id}`, `receiptConfig/global` and `receiptMaintenance/cursor`. No
migration of existing budgets or users is required. Originals use
`receipts/{familyId}/{transactionId}/{receiptId}/{uniqueRevision}`. Clients cannot
write the new metadata/entitlements directly, and direct Storage access is denied;
all file operations pass through backend authorization. Actual production rules
must be inspected before deploying so unrelated existing uses are preserved.

## Verification

| Check | Result |
| --- | --- |
| Existing accounting tests | 14 passed |
| Existing Firestore budget rules | 11 passed |
| Receipt policy tests | 6 passed |
| Auth/Firestore/Storage emulator integration | 30 passed |
| Automated mobile-width web flow in Chromium | 1 passed |
| TypeScript | Passed |
| Expo lint | Passed |
| Production web export | Passed |
| Backend production dependency audit | Zero known advisories at verification |

The browser flow signs in with a disposable emulator account, saves an expense, uploads image/PDF originals, checks downloaded bytes and image viewing, checks the two-file cap, replaces and confirms deletion, exercises a camera-style file input, exports and verifies ZIP contents, and opens the administrator overview. Camera hardware is not simulated by that test. The backend integration suite additionally verifies sharing across current members, access revocation, other-family isolation, roles, direct-rule denial, malformed files, quotas/concurrency, grace/renewal/Archive, retained-copy/failure retries, interrupted upload recovery, account deletion and missing-file export failure.

Early browser runs exposed test synchronization problems during React hydration and hidden cached login screens; explicit navigation/visible selectors fixed the test, and the final browser run passed. A lint invocation initially failed because the workspace home cache directory was unavailable; the documented writable Expo cache path fixed it. No failing check remains in the local final results.

All receipt tests used `demo-dailybudget-receipts` emulators. Retention/hold and failure branches use simulated adapters over emulator objects; they do not prove actual GCS retention timing. No production user files were uploaded or deleted by the automated tests. Subsequently, the owner deployed the backend/rules, enforced public access prevention, enabled required Google services and configured build-image cleanup through their own Cloud Shell.

## Activation status

The owner approved the documented Firebase setup and costs on November 16, 2026. Their Cloud Shell output confirms:

- Blaze was already enabled; the existing empty bucket is US-WEST1/REGIONAL with seven-day soft deletion, and public access prevention was enforced.
- Existing Firestore is us-west2. Both Node 24 receipt Functions were successfully created in us-west1, and rules/indexes were published.
- The CLI failed only at the post-deployment cleanup prompt. A separate command successfully configured seven-day build-image cleanup for the us-west1 `gcf-artifacts` repository.
- The trusted administrator script verified the owner's existing Auth UID and granted the global receipt role, without assigning Premium.

The deployed API is `https://us-west1-dailybudget-35c26.cloudfunctions.net/receiptsApi`. A direct unauthenticated `/access` request returned the expected HTTP 401 sign-in error. That confirms the gateway is live and blocks anonymous access; it does not prove authenticated family storage operations. Pages now defaults to this public API URL, with an optional repository variable override. This workspace has no Google credentials and cannot manage repository Actions variables; the public configuration fallback avoids needing that GitHub permission.

## Remaining verification before public release

1. Publish the reviewed website and test a real signed-in expense attachment, image/PDF viewing, original download, replacement, confirmed deletion and ZIP export.
2. Test a second current family member, membership revocation, actual runtime IAM, scheduled cleanup, retention/version behavior and monitoring against production infrastructure.
3. Rebuild native apps and test actual iPhone/Android camera, picker, viewing/sharing and downloaded-file cache policy. Existing installed builds do not gain new native modules automatically.
4. Verify an independent backup/restore exercise and complete public-release abuse/least-privilege IAM review. Export exists; a verified independent backup service is not configured. Cancellation warnings are in-app only. Free allowances and billing alerts are not a spending cap.

See [setup and cost instructions](RECEIPTS_SETUP.md), [implementation plan](RECEIPTS_IMPLEMENTATION.md), and [original requirements with approved family amendment](RECEIPTS_REQUIREMENTS.md).
