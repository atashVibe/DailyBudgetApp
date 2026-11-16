# Family receipt implementation report — November 16, 2026

## Result

Prepared on `codex/firebase-receipts` from main `55a9f6f`. This is a reviewable implementation, not a live Firebase deployment. The existing compact budget summary and accounting calculations are preserved.

Premium and Archive belong to a family. Every current family member can view, download, export, replace and delete shared receipts. Premium permits uploads; Archive and cancellation grace permit reading/export without new uploads. Deletion remains available regardless of payment. Former members and other families are denied. A separate global receipt administrator role can sponsor a current family without assigning a paid plan; family administrators cannot grant themselves that role. Membership is still required for file access.

## Changes

- Expense paperclips and the Family Receipts screen support original JPG/JPEG/PNG/PDF uploads, progress, retry, view/download, replacement, confirmed deletion and ZIP export with original bytes and SHA-256 manifest.
- An authenticated Firebase Functions gateway validates file contents and enforces family membership, plan permissions, two-receipt and shared storage limits. Direct Storage client access is denied. Production uploads require bucket public access prevention to be enforced.
- Firestore tracks family plans, separate global roles, receipt metadata, fenced mutation locks, unfinished uploads, cleanup jobs and audit results. Replacement commits the new original before deleting the old one. Unfinished upload candidates count toward quotas and are retried safely.
- Cancellation disables uploads immediately and grants one non-extending 30-day family grace period. Hourly maintenance rechecks current permissions before queueing expiry cleanup. Renewing or activating Archive before expiry prevents new expiry cleanup. Budget entries are never deleted by receipt retention.
- Cleanup distinguishes removing a live object from verified permanent deletion, tracks retained versions/soft-deleted copies and retries failures. Actual bucket retention and IAM have not been inspected.
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

All receipt tests used `demo-dailybudget-receipts` emulators. Retention/hold and failure branches use simulated adapters over emulator objects; they do not prove actual GCS retention timing. No production user files were uploaded or deleted. No billing, bucket policies, production security rules or Functions were changed.

## Activation approval and current access blocker

The owner approved Firebase cloud setup and possible usage charges on November 16, 2026. PR #5 checks passed on GitHub. The owner has since confirmed Firebase CLI access in their own Cloud Shell, Blaze enabled, bucket US-WEST1 with seven-day soft deletion, successful public-access-prevention enforcement, and Firestore us-west2. The backend runtime/CI now use Node 24 for dependency compatibility and default to us-west1. This workspace still has no Firebase/Google authenticated deployment session; its GitHub integration cannot manage Actions variables (HTTP 403), and the shared browser/viewer is unavailable. No production deployment or billing change has occurred. The owner is being guided to their own Firebase Console/Cloud Shell session; no credentials should be pasted into chat.

## Still required before activation

1. Establish an authenticated session in the owner’s trusted Firebase/Google environment. Cost approval is already received; free allowances and budget alerts are not a spending cap.
2. Inspect the actual project, bucket location, existing rules/files, public access prevention, IAM, retention/versioning and billing. Preserve unrelated existing resources.
3. Deploy reviewed rules/indexes/Functions, explicitly assign the existing owner's Firebase UID as global receipt administrator from a trusted environment, and configure the frontend API URL.
4. Verify the deployed service with the owner's account and a second family account, membership revocation and production cleanup/monitoring. Rebuild native apps and test real iPhone/Android camera, picker, viewing and sharing.
5. Complete an independent backup/restore exercise, native downloaded-file cache policy and public-release abuse/IAM review. Export is available; a verified independent backup service is not configured. Cancellation warnings are in-app only.

See [setup and cost instructions](RECEIPTS_SETUP.md), [implementation plan](RECEIPTS_IMPLEMENTATION.md), and [original requirements with approved family amendment](RECEIPTS_REQUIREMENTS.md).
