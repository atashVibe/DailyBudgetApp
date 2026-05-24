# DailyBudget Database Structure

## Current Backend

DailyBudget uses Firebase Firestore.

Firestore is not a SQL database. It does not use fixed tables. It uses:

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
