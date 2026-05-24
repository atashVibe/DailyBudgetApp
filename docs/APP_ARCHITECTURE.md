# DailyBudget App Architecture

## Stack

DailyBudget uses:

- Expo Router
- React Native
- TypeScript
- Firebase Authentication
- Firestore
- GitHub

---

## Main App Flow

1. User signs in.
2. App checks user profile.
3. If user has an active family, user goes to the drawer app.
4. If user does not have a family, user goes to family setup.
5. When a family is created, default finance data is seeded.

---

## Authentication

Current auth methods:

- Email/password
- Google login

Apple login architecture exists but is paused for now.

---

## Family System

The app uses a family-based structure.

A user can belong to a family through:

- creating a family
- joining with invite code

Family membership is stored in:

- users
- families
- familyMembers

---

## Finance System

The finance system uses:

- budgetAreas
- categories
- entries

Budget areas are high-level sections.

Examples:

- Daily Life
- My Business

Categories belong to budget areas.

Entries belong to a family and will later connect to:

- budgetAreaId
- categoryId

---

## Services

Finance data is loaded through service files:

- services/budgetAreas.ts
- services/categories.ts
- services/seedFinanceData.ts
- services/entries.ts

---

## UI Components

Reusable UI components are stored in:

- app/components/AppTextInput.tsx
- app/components/PrimaryButton.tsx
- app/components/AppPicker.tsx
- app/components/AppScreen.tsx
- app/components/FormLabel.tsx

Important:

Do not create duplicate selector components.

Use:

- AppPicker

Do not use:

- AppSelect

---

## Documentation Rule

Any time we change:

- code structure
- database structure
- Firestore rules
- app flow

we must update the docs before pushing to GitHub.
