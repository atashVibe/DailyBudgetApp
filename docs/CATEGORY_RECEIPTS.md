# Required category receipts — November 16, 2026

## What the owner requested

Family administrators can make attachments mandatory per category. The entry form offers an Attach receipt button, and Save Entry is gray/disabled until a required attachment is selected.

## Behavior

- In Family Settings → Categories, family administrators can toggle Receipt required for existing categories and choose Require a receipt while creating a category. Other members can see the requirement but cannot change it. Existing categories default to optional; no data migration or financial history rewrite is needed.
- Families with upload access see Attach receipt; free/non-upload plans see an information icon that explains “To attach a receipt, upgrade your family to Premium.” This uses the shared family entitlement, so ordinary members of Premium or administrator-sponsored families keep upload access. Unknown/loading access does not show a misleading upgrade prompt.
- The entry form provides camera, photo and PDF choices, selected filenames, removal and upload progress. Save is gray until the category is loaded and its required receipt is selected. Removing the last selected receipt disables Save again. A ready receipt already attached to an edited entry satisfies its requirement.
- On Save, selected originals upload before a new financial entry is created. Failed uploads keep form values and selections for retry; they do not create an incomplete entry or change the allowance. Stable submission/file identifiers prevent duplicate entries on retries. Previously uploaded draft files removed from the selection are reconciled before committing.
- The backend rechecks current membership, category, budget area, category type and actual ready receipt metadata before committing the financial entry and its associations together. Required-category checks also apply to direct Firestore creates/updates; clients cannot invent receipt metadata, publish draft-backed entries directly or change the setting without family-admin rights.
- Category changes update open entry forms through the existing family/category query using a realtime listener. Attachments now work for all four existing category types: expense, income, refund and cashback. Financial calculations remain unchanged.
- Current family members retain the previously approved replace/delete permissions. The requirement is checked when saving; it does not retroactively erase entries, require re-uploading existing receipts, or remove family deletion rights. A required category needs a receipt even if uploads are currently unavailable; an administrator must make it optional to permit entries without uploads.

## Backend and schema

The existing receipt API gains POST `/entry-drafts` and `/entry-drafts/commit`. Backend-only `receiptEntryDrafts/{submissionId}` stores the author, family, state and a 24-hour expiry. There can be at most 25 open drafts per family. Original objects continue using the existing private receipt path; the final entry reuses the draft identifier, so files are not copied or converted. Receipt metadata records `draft` and `uploadRequestId`; final entries record the verified `receiptId` and stable `receiptSubmissionId`.

Unfinished drafts are hidden from Family Receipts and tax ZIP exports. The existing hourly maintenance function processes up to 100 expired open drafts per run and queues original deletion using the existing audit/retry/retained-copy mechanism. A completed entry deletes its draft record and is excluded from abandoned-draft cleanup. Account deletion cleans unfinished drafts and removes their author attribution while preserving completed shared family receipts. Expired draft tombstones remain backend-only; no Firestore TTL or additional paid service is enabled.

Indexes are added for draft family/state lookup and state/expiry cleanup. Category `requiresReceipt` is an optional boolean; new entry `receiptId` references ready, same-family, same-entry metadata. Draft documents and receipt metadata remain client-write-denied. Existing accounting code is untouched.

Main changed files: category service/hook and settings UI, `ExpenseEntryForm.tsx`, common picker/button disabled/accessibility behavior, receipt/entry services, recent-entry paperclips for all category types, `functions/src/entry-drafts.mjs`, receipt API/service, Firestore rules/indexes and receipt integration/browser tests. No new npm dependency, storage provider, Function or scheduler job is added.

## Verification

- 38 receipt integration tests cover the existing lifecycle and new required receipt flow: incomplete/failed draft saves, idempotent finalization, wrong-owner/family denial, direct-write bypasses, administrator-only flags, invalid categories/dates, all four category types, expiry preserving completed entries, account deletion and finishing an already uploaded draft during grace.
- 11 existing Firestore rules tests, 14 accounting tests and 6 policy tests pass.
- Three Chromium mobile-width flows cover original receipt management and the new administrator switch, gray Save, selection/removal, failed upload then retry, exactly one resulting entry, editing with an existing receipt and another-tab category changes. The third flow uses controlled entitlement responses to verify the free-family information icon and ordinary Premium-family member button; backend subscription enforcement is covered by the emulator integration suite.
- TypeScript, lint and production web export pass. Browser tests use disposable emulator accounts; real-device camera behavior remains a phone check.
- Initial browser checks exposed a default-category loading gap and delayed switch feedback. Save now waits for an actual selected category, and the category switch updates immediately with rollback on write failure.

All tests are isolated emulators/development builds. The owner confirmed the previous receipt release works in production; this follow-up still needs backend/rules deployment and frontend publishing. Existing Google sign-in/access in the owner's own Cloud Shell is reused. Billing/setup approval persists; do not ask again or reassign the owner role.

## Deployment order

First run `cd ~/DailyBudgetApp-receipts` in Cloud Shell. The owner’s new session started in their home directory and did not have Node 24 installed, so use `nvm install 24` (which also selects it). Then run each command separately. The repository was cloned with `--single-branch`, so explicitly fetch this new branch:

```bash
nvm install 24
```

```bash
git fetch origin codex/required-category-receipts
```

```bash
git switch --detach FETCH_HEAD
```

```bash
npx --yes firebase-tools@15.36.0 deploy --project dailybudget-35c26 --only firestore:rules,firestore:indexes,functions:receipts
```

The backend dependencies are unchanged from the already installed Node 24 release. If this is a fresh Cloud Shell checkout, run `npm ci --prefix functions --engine-strict` first. Detached checkout selects the fetched reviewed update without merging unrelated Git histories or changing the stored cloud data. Stop on any command error and inspect it. Storage rules, bucket protection/retention, paid plan assignments and existing administrator grants need no changes.

After successful backend/rules deployment, merge the follow-up PR and wait for the existing Pages workflow to finish. Do not publish the new form before its draft endpoints and rules are deployed. Then refresh the usual website, enable Receipt required for one category, verify Save is gray, attach a small photo/PDF, save once and confirm both the entry and original file. Repeat an edit with the existing attachment. Native app delivery/rebuilt-device checks remain separate from Pages publishing.
