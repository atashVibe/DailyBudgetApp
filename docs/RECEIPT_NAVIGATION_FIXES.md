# Receipt settings, filename layout, and dashboard Back fixes

## Requested behavior

1. A family administrator must not enable a required receipt when the family cannot upload receipts.
2. Long selected receipt filenames must keep Remove inside the entry form.
3. Back from Dashboard must ask before signing out; cancel must preserve the session and unsaved entry.

## Changes

- Family Settings refreshes the actual family upload entitlement on focus. Existing optional-category and new-category requirement switches are disabled without upload access. Existing checked requirements can still be turned off, so a free family is not trapped by an old setting. Pending new required-category creation is blocked without verified upload access. Existing administrator-sponsored access remains valid because those families can actually upload.
- Enabling a requirement now uses the existing authenticated receipt API (`POST /categories/receipt-requirement`). It verifies active family-admin membership and current `canUpload` inside a fenced transaction. Creating a required category validates its area/name/type and commits the category with the flag together; a failure leaves no partial optional category. A normal family member cannot configure the requirement even when uploads are allowed.
- Firestore rules deny client-side creation/enabling of a required category. Administrators retain ordinary category edits and can clear a requirement directly without needing Premium or a working receipt API. This closes bypasses through older clients/direct writes.
- The selected-file row has a shrinking, zero-minimum-width filename column and a nonshrinking Remove control. Filenames use a single shortened line, with Ready to save on a separate line. The full filename remains accessible.
- Successful password/Google/Apple login replaces the login route instead of leaving it behind Dashboard. Drawer role loading and dashboard startup wait for Firebase authentication initialization, preventing a cold reload from looking signed out.
- Dashboard Back uses a focused confirmation dialog. Stay signed in preserves the form and session; Sign out clears Firebase authentication and opens Login. The explicit drawer Sign Out action uses the same confirmation. Other screens retain normal Back behavior, and an open drawer closes before an exit confirmation.
- Browser navigation uses a same-document dashboard exit marker, waits for the route URL to settle, and preserves that marker across React Navigation's same-dashboard history writes without changing router identifiers. Back/Forward between Settings and Dashboard remain normal. Listeners/wrappers are removed when their owning component unmounts. Android hardware Back uses BackHandler; native hardware and Safari gesture behavior still need device testing.

No financial calculations, stored transaction history, original receipt files, billing settings, paid entitlements or administrator grants are rewritten. No new dependency, collection, index, Function or scheduler job is introduced.

## Verification

- 40 receipt integration tests pass, including family-admin/upload entitlement requirements, Premium/Archive/sponsored cases, atomic category creation and direct-write denial with clearing still permitted.
- 11 existing rules tests, 14 finance tests and 6 policy tests pass.
- Five Chromium mobile-width flows pass: original receipt management; required receipt form and retries; free/Premium information and disabled requirement switches; a 320-pixel long filename with Remove inside the viewport plus Back cancellation, preserved fields/files, authenticated reload, ordinary Back/Forward and confirmed logout. The fifth verifies the compact paperclip opens one image/PDF chooser, cancellation is safe, and an uploaded PDF downloads byte-for-byte unchanged.
- TypeScript, lint and production web export pass. These use disposable emulator accounts, not the owner's live account. Native hardware Back, real Google/Apple login and phone-specific browser gestures remain manual checks.
- Early browser checks caught unwanted confirmation when navigating back to Dashboard and loss of Forward navigation. The final implementation distinguishes only the guarded dashboard exit and retains its marker through the router's own history updates.

## Rollout

The existing app is live from PR #6 / main `fba9a89`. Deploy this follow-up backend/rules first through the owner's existing authenticated Cloud Shell, then publish its frontend. Cost approval and the existing receipt-administrator grant persist; do not request approval again or rerun bootstrap.

Run one command at a time; stop on any error:

```bash
cd ~/DailyBudgetApp-receipts
```

```bash
nvm install 24
```

```bash
git fetch origin codex/receipt-settings-navigation-fixes
```

```bash
git switch --detach FETCH_HEAD
```

```bash
npm ci --prefix functions --engine-strict
```

```bash
npx --yes firebase-tools@15.36.0 deploy --project dailybudget-35c26 --only firestore:rules,functions:receipts
```

After the owner reports Deploy complete, merge/publish the follow-up PR. Refresh the website and check: a free family cannot enable required receipts; long names keep Remove inside the frame; Back → Stay signed in preserves an unsaved entry; Back → Sign out opens Login. Verify required-category creation/toggling still works for a family with upload access. No Storage rule, bucket setting or index update is needed for this follow-up.

## Backend deployed; compact picker follow-up

The owner's Cloud Shell output confirms commit `55c40ae` deployed successfully: Firestore rules released, both receipt Functions updated and Deploy complete. The additional picker change modifies only the entry form/client picker and tests; no backend or rules differ from that deployed commit. Do not ask for another Cloud Shell deployment for this picker change.

The entry form now uses a 44-pixel icon-only paperclip that immediately opens the browser/phone file chooser accepting JPEG, PNG and PDF. There are no three expanded in-form action buttons. The web chooser is not forced into camera-only capture; camera availability and the chooser's exact labels/layout are controlled by the browser/OS and remain a phone check. Native builds use a native camera/files choice, with photos and PDFs accepted by the document picker. Existing saved-receipt management controls are unchanged.
