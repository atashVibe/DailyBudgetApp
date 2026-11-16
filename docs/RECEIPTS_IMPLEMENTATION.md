# Receipt implementation and deployment plan

Inspection baseline: `55a9f6f`, including the owner's compact summary/navigation
changes. Expo SDK 54 / React Native / TypeScript, Firebase JS Auth + Firestore,
flat shared `entries` keyed by family/user; GitHub Pages hosts exported web code.
There is no deployed receipt service, Storage rules, receipt metadata, subscription
backend, or verified independent backup in this repository. The configured bucket
name alone does not establish that the bucket exists or billing is enabled.

Existing family administrator roles remain unchanged. Receipt administrator status
is separate, assigned only by trusted Firebase Admin operations, never by email or
by first-user registration. As amended by the owner, receipts belong to a family: every current member can
view, download, replace and delete them. Former members and other families cannot
access files. Global receipt administrators do not bypass family membership. A
current global receipt administrator can sponsor their family without a paid plan.

Plan completed before implementation:

- Modify the entry list to open a receipt panel; add a Receipts drawer page.
- Add modular client receipt/entitlement services and camera/file/export controls.
- Add `functions/` for an authenticated Firebase HTTP gateway and scheduled worker.
  The gateway verifies original bytes before Storage writes, avoiding an untrusted
  public upload area. Client progress tracks the upload to this gateway.
- Add `receiptAccess/{uid}` (global receipt role) and `receiptFamilyAccess/{familyId}` (shared subscription), `receipts/{id}`
  (family/uploader metadata), `receiptLocks/{familyId}`, `receiptOperations/{id}` (retry/orphan
  cleanup), `receiptAudit/{id}`, and `receiptConfig/global` (limits/pricing).
- Add strict Firestore rules for these collections and deny direct Storage access;
  the gateway uses Firebase Admin after authenticating/authorizing each operation.
- Use unique receipt/revision IDs under `receipts/{familyId}/{entryId}/{receiptId}/`.
  Preserve originals; replacements commit a validated new version before cleaning
  the old one. Record unfinished object cleanup for retries.
- Default limits: 10 MiB/file, 2 receipts/transaction, 100 MiB/family, 2,000 receipt
  records/family. Plan limits can be changed by trusted backend configuration.
- Add security, retention, file-content, quota, replacement, export, and retry tests
  using Firebase Auth/Firestore/Storage emulators. Preserve finance/rule checks.
- Do not enable billing, deploy backend/rules, or run real-file deletion until the
  owner approves the cost-bearing setup. No payments or alternate storage provider.

Cost review (official documentation checked November 16, 2026): Firebase Storage
requires Blaze. Eligible US regional buckets may qualify for free usage; exact
eligibility depends on region and aggregate account usage. Standard us-central1
storage is approximately $0.02/GiB-month before allowances (the published hourly
rate is $0.000027397/GiB-hour). About 200 MiB of receipts is ~$0.004/month for raw
storage alone. Reads/writes, downloads, Firestore, Functions compute/build artifacts,
and the scheduler can cost extra. There is no guarantee of a $0 bill. Budget alerts
notify; they do not automatically cap spending. The admin estimate must use a
verified rate matching the actual bucket's region/class; it is not a complete bill.

Sources:
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- https://cloud.google.com/storage/pricing
- https://firebase.google.com/docs/functions/schedule-functions
- https://docs.cloud.google.com/storage/docs/soft-delete

Soft-delete/versioning/holds must be inspected before production deployment.
Removing a live object is not proof that retained copies are permanently erased.
Do not disable existing retention or backup settings automatically. Separate backup
is not yet configured or verified. Export remains the independent owner-controlled
copy; document a restore test before relying on it for tax records.
