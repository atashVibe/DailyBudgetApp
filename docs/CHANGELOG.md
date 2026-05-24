# DailyBudget Changelog

## 2026-05-24

### Architecture

- Replaced old type/category system
- Introduced budgetAreas architecture
- Added categories collection
- Added entryKind system

### Finance

Added default budget areas:

- Daily Life
- My Business

Added default categories.

- Added budget area and category service files for dynamic finance loading.
- Standardized reusable picker/input/button direction.
- Removed duplicate select component and kept AppPicker as the reusable selector.

### Firestore

Created:

- budgetAreas collection
- categories collection

Added:

- seedFinanceData service

### UI

- Hid Join Family drawer item for admins
- Began StyleSheet standardization

### Authentication

- Google login working
- Apple login architecture added (paused)

### Documentation

Created:

- DATABASE_STRUCTURE.md
- APP_ARCHITECTURE.md
- FIRESTORE_RULES.md
- CHANGELOG.md

## 2026-05-24

### Fixed

- Restored Add Entry saving in ExpenseEntryForm.tsx.
- Removed invalid useEffect() placement from inside handleSave().
- Moved budget area loading into a proper component-level useEffect().
- Restored stable entry form behavior before continuing dynamic category migration.

## 2026-05-24

### Added

- Added dynamic category loading from Firestore
- Added Budget Area picker to ExpenseEntryForm
- Categories now reload automatically when Budget Area changes

### Compatibility

- Hardcoded category fallback still exists temporarily
- Existing entry structure still supports:
  - type
  - category

### Notes

- Migration toward:
  - entryKind
  - budgetAreaId
  - categoryId
    is still in progress
