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

All receipt tests used `demo-dailybudget-receipts` emulators. Retention/hold and failure branches use simulated adapters over emulator objects; they do not prove actual GCS retention timing. No production user files were uploaded or deleted. No billing, bucket policies, production security rules or Functions were changed.

## Still required before activation

1. Owner approval for Firebase Blaze-dependent Storage and Functions setup, including usage-based charges. Free allowances and budget alerts are not a spending cap.
2. Inspect the actual project, bucket location, existing rules/files, public access prevention, IAM, retention/versioning and billing. Preserve unrelated existing resources.
3. Deploy reviewed rules/indexes/Functions, explicitly assign the existing owner's Firebase UID as global receipt administrator from a trusted environment, and configure the frontend API URL.
4. Verify the deployed service with the owner's account and a second family account, membership revocation and production cleanup/monitoring. Rebuild native apps and test real iPhone/Android camera, picker, viewing and sharing.
5. Complete an independent backup/restore exercise, native downloaded-file cache policy and public-release abuse/IAM review. Export is available; a verified independent backup service is not configured. Cancellation warnings are in-app only.

See [setup and cost instructions](RECEIPTS_SETUP.md), [implementation plan](RECEIPTS_IMPLEMENTATION.md), and [original requirements with approved family amendment](RECEIPTS_REQUIREMENTS.md).
