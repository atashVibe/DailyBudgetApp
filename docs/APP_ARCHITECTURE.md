# Current Data Architecture

## Main Structure

Family
├── Budget Areas
│ ├── Categories
│ │ ├── type
│ │ ├── expense
│ │ ├── income
│ │ ├── refund
│ │ └── cashback
│ └── Entries

## Architecture Rules

### Budget Area

Represents a major financial area.

Examples:

- Daily Life
- Business
- Travel

### Category

Belongs permanently to one Budget Area.

Category owns:

- financial type
- reporting behavior

Examples:

- Groceries → expense
- Salary → income
- Amazon Return → refund
- Credit Card Cashback → cashback

### Entry

Stores:

- amount
- budgetAreaId
- categoryId
- type
- note
- date

Entry type is copied from Category at save time.

## Important Design Decision

EntryKind was removed completely.

Reason:

- reduced complexity
- easier UI
- easier reporting
- easier maintenance
- better user experience

## Admin Settings Structure

settings.tsx
├── FamilyBudgetSection
├── BudgetAreasSection
└── CategoriesSection

## Soft Delete Strategy

The app uses archive behavior instead of permanent delete.

Archived items:

- hidden from normal UI
- preserved for reports/history
