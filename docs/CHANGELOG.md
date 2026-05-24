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
