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
