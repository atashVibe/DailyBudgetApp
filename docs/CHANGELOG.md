# DailyBudget Changelog

## Prepared — Premium entry points and invitation email

- Add Upgrade family to Premium in receipt viewers, with honest unavailable checkout and the existing cancellation/grace explanation.
- Add server-side invitation emails containing a code and join link, with verified family-admin authority, quotas, request deduplication and secure SMTP configuration.
- Preserve invitation codes through Google/email sign-in, signup and recovery; require verified recipient email and explicit joining.
- Block expired/used invitations and former-creator privilege recovery; atomically create families and preserve existing accounts when signup fails.
- Live email activation and coordinated Functions/rules/frontend deployment remain pending. No real payment or email delivery is claimed from tests.

## After Milestone 2 — roadmap execution

- Fix Google confirmation for DailyBudget account deletion using prepared, same-user reauthentication and current server ownership checks.
- Add cancellation/wrong-user protection, account-bound cleanup and a retryable, scrollable confirmation dialog.
- Add emulator-only browser regression checks to CI and a read-only Cloud Shell readiness report.
- Record family-admin Premium purchasing as an explicit roadmap feature; checkout/pricing/payment verification remain pending.
- Keep live phone/cloud verification and former-family attribution cleanup open; no production deletion or payment was performed for these tests.

## Milestone 2 — v0.2 — November 21, 2026

Web/source checkpoint, building on Milestone 1 (`v0.1`).

- Family-wide Premium receipt access, original image/PDF handling, shared file management and ZIP export through the Firebase gateway.
- Per-category required receipts, Premium-aware controls, direct paperclip selection and safe attachment-before-entry saving.
- Reference dashboard layout, current teal, taller controls, family-admin category icon library and compact monthly/yearly progress.
- Correct whole-month/year status rules, with income/cashback excluded and negative spending bars empty.
- Saved sessions, browser Google sign-in preparation, bounded cloud-read recovery, Back confirmation and Edit form reveal.
- One shared 20px information-button style, matching Budget Overview everywhere.

The release page records publication and the exact tag. Google web account-deletion confirmation still needs its popup setup updated and verified. Physical-device/family-sharing verification, other recovery/deletion follow-ups and cloud backup/alert checks remain on the roadmap. Apple sign-in remains deferred. This checkpoint does not publish a new APK, TestFlight or store build.

## 2026-05-24

### Major Finance Architecture Migration

Removed old transaction type architecture.

OLD:

```txt
type
entryKindId
category
```

NEW:

```txt
budgetAreaId
categoryId
```

### ExpenseEntryForm Cleanup

- removed Type picker from UI
- simplified entry flow
- categories now load directly from budget area
- fixed category selection issues
- fixed edit-mode instability
- fixed picker reset problems

### Database Improvements

Entries now save stable document IDs instead of text labels.

Benefits:

- safer renaming
- cleaner architecture
- easier future calculations
- better long-term scalability

### Future Planned Work

Planned future category field:

```txt
type
```

Possible values:

```txt
expense
income
refund
```

This will support:

- cashback logic
- returns/refunds
- business income
- cleaner budgeting calculations

# Latest Changes

## Settings & Data Architecture Refactor

### Removed EntryKind Architecture

- Removed EntryKind collection and logic completely
- Simplified structure to:
  Budget Area → Category(type)
- Category now owns financial behavior
- Entry stores final calculated type

### Category Types

Supported category types:

- expense
- income
- refund
- cashback

### Settings Refactor

- Split settings into modular sections:
  - FamilyBudgetSection
  - BudgetAreasSection
  - CategoriesSection

### Budget Areas

- Add budget area
- Edit budget area
- Archive budget area
- Improved admin UI with row actions/icons

### Categories

- Add category
- Edit category
- Archive category
- Categories refresh correctly in Dashboard

### Dashboard Improvements

- ExpenseEntryForm category refresh fixed
- Improved refresh consistency using focus reloads

### UI Improvements

- Replaced large action buttons with icon actions
- Settings page now uses cleaner admin-style rows
- Archive confirmations now work on web
