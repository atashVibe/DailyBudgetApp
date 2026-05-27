# DailyBudget Changelog

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
