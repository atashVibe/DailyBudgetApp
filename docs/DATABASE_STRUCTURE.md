# DailyBudget Database Structure

## Current Backend

DailyBudget uses Firebase Firestore.

Firestore is not a SQL database.
It does not use fixed tables.

Firestore uses:

- collections
- documents
- fields

Collections appear automatically when the first document is created.

---

## Main Collections

### users

Stores each app user's profile.

Fields:

- email
- activeFamilyId
- role

---

### families

Stores each family or household account.

Fields:

- name
- dailyBudget
- status
- createdBy
- createdAt

---

### familyMembers

Connects users to families.

Document ID format:

```txt
familyId_userId
```

Fields:

- familyId
- userId
- role
- status
- joinedAt

---

### budgetAreas

Stores high-level finance sections.

Examples:

- Daily Life
- My Business

Fields:

- name
- familyId
- isDefault
- isArchived
- createdBy
- createdAt

Important:

- Do not hard delete budget areas.
- Use `isArchived: true`.

---

### categories

Stores finance categories inside budget areas.

Fields:

- name
- familyId
- budgetAreaId
- isDefault
- isArchived
- createdBy
- createdAt

Important:

- Each category belongs to one budget area.
- Do not hard delete categories.
- Use `isArchived: true`.

---

### entries

Stores income, expense, refund, cashback, and transfer records.

Current fields:

- userId
- familyId
- amount
- type
- category
- note
- date
- createdAt

Migration target fields:

- userId
- familyId
- budgetAreaId
- categoryId
- entryKind
- amount
- note
- date
- createdAt

Important:

- Old `type` and text `category` are temporary.
- New system should use:
  - `entryKind`
  - `budgetAreaId`
  - `categoryId`

---

### invites

Stores family invitation codes.

Fields:

- email
- familyId
- role
- code
- status
- createdAt
- expiresAt
