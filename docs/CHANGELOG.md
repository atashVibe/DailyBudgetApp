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
reduce_expense
```

This will support:

- cashback logic
- returns/refunds
- business income
- cleaner budgeting calculations
