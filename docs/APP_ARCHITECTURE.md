# DailyBudget App Architecture

## Purpose

DailyBudget is a budgeting and lightweight bookkeeping app for:

- families
- immigrants
- small business owners
- self-employed users

Goals:

- simple budgeting
- expense tracking
- business bookkeeping
- future CPA/tax preparation support
- very easy UI for non-technical users

---

# Current Financial Architecture

## Main Flow

```txt
Budget Area
   ↓
Category
   ↓
Entry
```

Example:

```txt
Daily Life
  → Groceries
  → Bills
  → Cashback

Business
  → Sales
  → Supplies
```

---

# Entry System

Entries now store stable IDs instead of text labels.

Current structure:

```txt
budgetAreaId
categoryId
```

Advantages:

- categories can be renamed safely
- prevents duplicate-name problems
- cleaner calculations
- supports future admin editing

---

# Future Planned Architecture

Later categories will control calculations using:

```txt
type
```

Examples:

```txt
Groceries → expense
Sales → income
Cashback → income
Return → reduce_expense
```

This will remove the need for manual transaction types.

Future user flow:

```txt
Budget Area → Category → Amount
```

---

# Current UI Principles

- simple mobile-first UI
- minimal steps
- reusable components
- standardized buttons and inputs
- non-technical-user friendly

---

# Current Technical Stack

Frontend:

- React Native
- Expo
- TypeScript

Backend:

- Firebase Authentication
- Firestore

Navigation:

- Expo Router
- Drawer Navigation
