# Receipt setup — owner instructions

The code is prepared for review. **The new Firebase backend and rules are not
deployed, billing has not been changed, and your real account has not been given
receipt-administrator access yet.** Do not run the production steps until you have
approved the Blaze-dependent setup and its possible charges.

Your recent compact summary/navigation changes are preserved. This feature does
not change budget calculations, payment processing, family roles, or existing
transaction records. It uses your existing Firebase project and Storage only.

## Confirmed family-sharing policy

This implements the owner's later clarification: Premium is for a family. Every
current member can upload, view, download, export, replace and delete that family's
receipts. The quota and cancellation/Archive deadline are shared. Former members
and other families are denied on every server request. Global receipt-admin roles
are assigned to people separately from family-budget roles and family plans. An
active global receipt administrator sponsors their current family without assigning
Premium; other members receive family file access, not global admin powers. When
that sponsorship ends and no paid family plan covers storage, the family gets a
30-day grace period. Deleting one member's account preserves shared files for
remaining members and removes uploader identifiers where applicable. A sole-member
family's originals are queued for deletion after the account-deletion confirmation.
Downloaded/exported copies cannot be revoked from someone's device.

## What was added

- Paperclip controls beside saved entries, a family receipt panel, and a Family
  Receipts screen. Premium and Archive belong to the family. Every current member can upload to
  saved family expenses and can view, download, export, replace and delete shared
  originals. Former members and other families are denied. Deleting a transaction
  preserves the family receipts; leaving a family removes your app access.
- Camera, original-photo selection, PDF selection, progress, retry messages,
  view/download, replacement, confirmed deletion, and ZIP export.
- JPG/JPEG/PNG/PDF validation on the server, including file signatures and actual
  image/PDF parsing. Originals are never re-encoded or stored in Firestore.
- Private authenticated HTTP downloads. No public Storage download tokens, signed
  bearer links, or administrator keys in the application.
- Separate global receipt-administrator identity and family Free/Premium/Archive/
  grace permissions. Ordinary family-admin status cannot grant the global role or
  change a plan. A current global receipt administrator sponsors family access
  without marking anyone a Premium subscriber. No Stripe or payments.
- Every current member can delete family receipts regardless of payment. Canceling
  the family plan disables
  uploads/replacements immediately once cancellation is accepted, preserves
  originals, and sets one non-extending 30-day family grace deadline. Renewing/Archive
  activation before expiry prevents cleanup for the whole family. Independent
  administrator sponsorship continues to cover a family even without Premium.
- An hourly trusted worker rechecks access before cleanup, skips administrator-sponsored
  families and active Premium/Archive families, verifies object deletion, records audit
  results, and retries failures. Account deletion preserves shared receipts for remaining members and removes
  uploader attribution where appropriate; sole-member family originals are queued
  for deletion. A family losing administrator sponsorship gets 30 days of grace.
  Budget transactions are not deleted by receipt retention.
- Admin overview: actual stored original/version/soft-deleted bytes, receipt
  count, family plan counts, upcoming dates, failed deletions, and a regional storage-only
  estimate when a verified matching price is configured.

## Defaults and storage layout

- 10 MiB per original (10 × 1,024 × 1,024 bytes), 2 ready receipts per transaction.
- 100 MiB total/family, including tracked candidates and pending/retained copies;
  2,000 receipt metadata records/family. Free families have zero allocation unless sponsored by a receipt administrator.
- Backend-only `receiptConfig/global.plans` can override plan limits. The current
  HTTP gateway's safety ceiling is 25 MiB/file; the initial default remains 10 MiB.
- Paths: `receipts/{familyId}/{transactionId}/{receiptId}/{uniqueUploadRevision}`.
  A validated replacement gets a new revision before the previous revision is
  cleaned. SHA-256 detects duplicates within a transaction. Failed uploads remain
  tracked and wait at least 10 minutes before orphan verification/retry, allowing
  any in-flight object write to finish.
- New collections: `receiptAccess` (global roles), `receiptFamilyAccess` (family plans), `receipts`, `receiptLocks`,
  `receiptOperations`, `receiptAudit`, `receiptConfig`, `receiptMaintenance`.
  These are additive; no existing data migration or rewriting is required.
- Metadata includes receipt/family/uploader/transaction IDs, original filename, private
  storage path, verified MIME, byte size, digest, timestamps, status, and a date/
  merchant snapshot for export if the transaction is later unavailable.

## Costs and approval boundary

[Firebase requires Blaze for Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
Free usage may apply, but charges remain possible. Backend Functions, an hourly
Cloud Scheduler job, Firestore operations, downloads, build artifacts and retained
copies can also cost money. The API scales to zero and is limited to two concurrent
instances (one request/instance); the maintenance function has one instance. These
limits and upload quotas are safeguards, not a guaranteed bill cap.

Example only: at the published us-central1 Standard storage rate of about
$0.02/GiB-month, 100 MiB costs about $0.002/month for storage alone before free
allowances. Your actual bucket region, billing plan, retention settings, paid usage
and monthly bill have not been inspected. Do not assume that example is your bill.
The admin screen declines to invent a price when the configured rate does not
match the bucket's actual location/storage class.

- [Storage pricing](https://cloud.google.com/storage/pricing)
- [Scheduled function costs](https://firebase.google.com/docs/functions/schedule-functions)
- [Soft-delete behavior and charges](https://docs.cloud.google.com/storage/docs/soft-delete)

Do not upgrade billing or deploy resources until the owner has approved this
specific setup. All work so far uses isolated emulators and a review branch.

## Production setup after approval

### 1. Check the Firebase project and billing

1. Open [Firebase Console](https://console.firebase.google.com/) and select
   **dailybudget-35c26**. Verify it is your existing DailyBudget project.
2. Check the plan shown near the bottom-left. If it says Spark, choose **Upgrade**,
   review Blaze, and select your own billing account. You perform the billing
   confirmation yourself; do not share card details or passwords in this chat.
3. Open **Build → Firestore Database** and note the existing database location.
4. Open **Build → Storage**. If a bucket already exists, inspect it and its current
   rules before changing anything. A bucket name in the source does not prove it
   has been provisioned. Preserve any unrelated files/rules; do not blindly replace
   live rules if another feature/app already relies on this bucket.
5. If Storage is new, choose **Get started**, use a reviewed location compatible
   with your existing database, and start with locked access. Eligible US regions
   may have free allowances. Location affects costs and cannot simply be changed
   later. Match `RECEIPT_REGION` below to the reviewed deployment region.

### 2. Verify bucket privacy, retention, and alerts

1. In the bucket's Google Cloud details, open **Permissions**. Remove public
   `allUsers` / `allAuthenticatedUsers` grants if any, after confirming that they
   are not serving an unrelated existing feature. Set **Public access prevention**
   to **Enforced**. Uploads will be blocked until this is explicitly enforced.
2. Under **Protection**, inspect **Soft delete**, **Object versioning**, object
   holds, and retention policies. Record their current settings. Do not disable
   existing protection automatically. The backend also deletes noncurrent
   generations and tracks soft-deleted copies, but cannot bypass a retention lock.
3. A 30-day grace deadline is the scheduled start of cleanup, not a promise that
   policy-retained copies disappear at that instant. Soft-deleted copies can
   remain chargeable until their retention ends. The UI/audit do not call such
   copies permanently erased. The hourly worker retries, processing up to 500
   family-access records plus 100 due cleanup operations per run with a persisted cursor.
   Large backlogs can delay cleanup; monitor failures and scheduled dates.
4. In **Google Cloud → Billing → Budgets & alerts**, select the project and create
   a small monthly budget you are comfortable with (for example $5) with alerts at
   50%, 90%, and 100%. Verify that you receive the alerts. Alerts do not stop charges.
5. Confirm the runtime service account has the required Firestore, Firebase Auth
   read/user lookup, and bucket object read/write/delete/list plus bucket-metadata
   permissions. Use a dedicated least-privilege service account before public
   release. No IAM changes have been made by this work.

### 3. Deploy from a trusted Firebase/GCP session

Use a trusted development environment or the Google Cloud Console's **Activate
Cloud Shell** terminal. Sign into your own Google/Firebase account there; never
paste an access token or a service-account key into this chat or the repository.

Check out the reviewed receipt branch/commit, then run:

```bash
npm ci
npm ci --prefix functions
gcloud config set project dailybudget-35c26
gcloud auth application-default login
npx --yes firebase-tools@15.36.0 login --no-localhost
```

Complete any Google sign-in/consent directly in your browser. If either tool
reports a permission problem, stop and resolve the correct project/account rather
than creating a new project or changing access broadly.

The default deployment region is `us-central1`. If a different region was reviewed,
set `RECEIPT_REGION=the-reviewed-region` in an ignored
`functions/.env.dailybudget-35c26` before deployment. Then, after reviewing the
live rules, deploy only the receipt code and additive rules/indexes:

```bash
npx --yes firebase-tools@15.36.0 deploy \
  --project dailybudget-35c26 \
  --only firestore:rules,firestore:indexes,storage,functions:receipts
```

This enables/deploys paid-plan infrastructure and creates the scheduler job. It
has NOT been run by this implementation. Review API-enablement/IAM prompts and
costs. Record the printed `receiptsApi` URL. Verify the deployment uses the actual
Firebase bucket, has no emulator environment variables, and uses the reviewed
region. Add an Artifact Registry cleanup policy for old function build artifacts
after checking that it will not remove artifacts used by other deployments.

### 4. Grant your existing account receipt-administrator access

1. In **Firebase → Build → Authentication → Users**, find your existing account.
2. Open it and copy its **User UID**. Confirm you selected your own account.
3. In the trusted terminal with Application Default Credentials, replace
   `YOUR_EXISTING_UID` below, then run:

```bash
node functions/scripts/receipt-admin.mjs dailybudget-35c26 YOUR_EXISTING_UID grant
```

This script verifies the existing Auth user, refuses to race an active receipt
operation, assigns a backend-owned receipt-admin flag, and writes an audit record.
It does not assign Premium, select the first account, or hardcode an email. Your
current family receives administrator-sponsored receipt access while you remain an
active member; family members receive file access but not global admin powers. To
revoke from a trusted operator session, replace `grant` with `revoke`.

Once activated, the in-app **Family Receipts → Receipt Administration** section allows
authorized global receipt admins to grant/revoke other admins by account UID and
manage test family plans by family ID. Each current family member shares the plan
and quota; there is no separate Premium assignment per member.
Server authorization is checked on every action; hiding a button is not security.
Plan changes here do not take payment. Do not activate paid-user access merely on
the basis of a client assertion when real billing is integrated later.

### 5. Enable the web app only after the backend is ready

1. In GitHub, open **DailyBudgetApp → Settings → Secrets and variables → Actions →
   Variables → New repository variable**.
2. Name it `RECEIPTS_API_URL` and paste the deployed `receiptsApi` URL as its value.
   This URL is public configuration, not an admin key. Do not put a credential here.
3. Merge the reviewed receipt PR and allow the existing Pages workflow to publish.
4. Open the usual app link, refresh, sign in, and use the paperclip beside a saved
   expense. Open **Family Receipts** for bulk export and the admin overview.
5. Native Android/iPhone builds require a new build because camera/document/file
   modules were added. Configure `EXPO_PUBLIC_RECEIPTS_API_URL` in the corresponding
   EAS build environment and rebuild; an old installed APK will not acquire these
   native modules merely because the website changed.

### 6. Configure an honest storage estimate

In Firestore, create/edit backend-only `receiptConfig/global` with a `pricing` map:

```json
{
  "pricing": {
    "region": "US-CENTRAL1",
    "storageClass": "STANDARD",
    "usdPerGiBMonth": 0.02,
    "verifiedAt": "2026-11-16",
    "source": "https://cloud.google.com/storage/pricing"
  }
}
```

These are examples: use the actual bucket location/class and current verified
price, not an assumed rate. The overview refuses mismatched or mixed-class
estimates. It scans actual receipt objects, including noncurrent/soft-deleted
copies, without returning another user's file content. Large inventories can take
time; background aggregate metrics are a scaling follow-up before a large launch.

## Tests and what they do not prove

```bash
npm ci
npm ci --prefix functions
npm run test:finance
npm run test:receipts
npm run test:receipts:emulator
npx tsc --noEmit
EXPO_NO_TELEMETRY=1 npm run lint
```

The receipt integration suite refuses to run without Auth/Firestore/Storage
emulator variables and uses a `demo-` project. It exercises the same HTTP gateway
and service code as production. It is not a test of deployed Cloud Functions,
production IAM, actual soft-delete timing/retention holds, real billing, or native
camera/file-sharing on an Android/iPhone. Soft-retention/failure states are simulated
over actual emulator object operations. Those production/device checks remain open.

In this restricted cloud workspace, also set the following for npm/emulator caches:

```bash
FIREBASE_EMULATORS_PATH=/tmp/dailybudget-firebase-emulators \
XDG_CONFIG_HOME=/tmp/dailybudget-config \
npm_config_cache=/tmp/dailybudget-npm-cache npm run test:receipts:emulator
```

The optional `functions/scripts/emulator-demo.mjs` starts a demo-only HTTP gateway
inside the three emulators. It refuses real projects and seeds a known fake demo
account. Its test identity is not a production admin-bootstrap mechanism. The app
has an explicit development-only `EXPO_PUBLIC_FIREBASE_EMULATORS=1` opt-in; never
set that for a production build. Do not reuse the demo password for a real account.

### Repeat the automated browser check (demo accounts only)

Use three terminals from the repository root. Terminal 1 starts fresh isolated
emulators and the demo HTTP gateway (stop any earlier demo emulators first):

```bash
npx --yes firebase-tools@15.36.0 emulators:exec --project demo-dailybudget-receipts --only auth,firestore,storage 'node functions/scripts/emulator-demo.mjs'
```

Terminal 2 starts the development web app using that demo project:

```bash
EXPO_PUBLIC_FIREBASE_EMULATORS=1 \
EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-dailybudget-receipts \
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost \
EXPO_PUBLIC_FIREBASE_API_KEY=demo-only-key \
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-dailybudget-receipts.appspot.com \
EXPO_PUBLIC_RECEIPTS_API_URL=http://localhost:8787 \
npx expo start --web --port 8091
```

Terminal 3 installs the browser if needed and runs the project test:

```bash
npx playwright install chromium
npx playwright test --config playwright.receipts.config.mjs
```

An existing Chromium executable can be selected with `CHROMIUM_PATH`. For isolated
alternative ports, set matching `RECEIPTS_DEMO_PORT`, `RECEIPTS_DEMO_WEB_ORIGIN`,
frontend API URL and `RECEIPTS_UI_URL` (the test allows localhost 8091 or 8093 only).
Use a fresh demo database for each full browser run. The test seeds no production
account and exercises a file input in place of actual camera hardware.

## Export, backup, recovery, and migration

- Export produces a ZIP with originals organized by transaction year, unique receipt
  IDs and original filenames, a JSON manifest with transaction/merchant information
  where available, and SHA-256 hashes. It aborts if an original cannot be fetched.
- Save the ZIP and the existing budget CSV on an independently controlled encrypted
  computer/drive. Open files and compare hashes before treating the copy as a backup.
  Members of a canceled family must complete export before its shared grace deadline.
- Deleting a transaction preserves shared family receipts in Family Receipts. Export uses the
  current entry date/merchant only when the current family member is authorized to read that
  entry; otherwise it uses the attachment snapshot. Orphaned transactions do not
  make the receipt disappear or expose another family's data.
- Recovery/migration: first verify ZIP hashes offline; use the manifest to map old
  transaction IDs to the destination's entries; test a dry-run import in a separate
  test project, verify ownership/rules/counts/hashes, and only then migrate with a
  trusted admin tool. Do not overwrite existing transactions or assume old IDs are
  valid in another project. An automatic production restore/import tool is not
  implemented or tested; ordinary originals remain independently readable.
- No independent managed backup has been configured. Firebase Storage durability,
  soft deletion and versioning are not claimed to be an independent backup. Restore
  tests and a reviewed long-term backup policy remain required before public use
  for irreplaceable tax records. Files whose permanent deletion was verified cannot
  be recovered through a renewed subscription.

## Remaining before public release

- Owner approval, real bucket/billing/IAM/rules inspection, backend deployment,
  receipt-admin bootstrap and web API configuration.
- Real-file smoke tests for image/PDF capture, download, replacement, export,
  cancellation/renewal/Archive, and confirmed deletion on actual infrastructure.
- Native rebuilt Android/iPhone tests, temporary downloaded-file cache policy,
  mobile behavior during large ZIP exports, and native view/share availability.
- Production retention/versioning/hold verification, budget-alert delivery check,
  a tested independent backup/restore plan, App Check/rate-abuse review, and a
  least-privilege runtime service account.
- Notifications: no existing general notification/email delivery service was found;
  this version supplies in-app deadline warnings only. Add reminders when such
  infrastructure is configured, without treating auth reset emails as a mail service.
- Future billing integration must use trusted server events to update access;
  payment processing is intentionally absent. Review audit/job log retention and
  large-scale admin metrics before onboarding thousands of users.
