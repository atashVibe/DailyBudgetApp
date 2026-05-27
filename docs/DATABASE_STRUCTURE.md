# DailyBudget Database Structure

## Backend

DailyBudget uses Firebase Firestore.

Firestore is a NoSQL document database.

Main structure:

- collections
- documents
- fields

---

# Main Collections

## users

Stores user profile information.

Fields:

```txt
email
activeFamilyId
role
createdAt
```

---

## families

Stores each family/workspace.

Fields:

```txt
name
dailyBudget
status
createdBy
createdAt
```

---

## familyMembers

Stores relationship between users and families.

Fields:

```txt
familyId
userId
role
status
joinedAt
```

---

## budgetAreas

Top-level financial areas.

Examples:

- Daily Life
- Business

Fields:

```txt
familyId
name
isArchived
createdAt
```

---

## categories

Financial categories used for entries.

Examples:

Daily Life:

- Groceries
- Gas
- Bills
- Cashback
- Return

Business:

- Sales
- Supplies
- Advertising

Fields:

```txt
familyId
budgetAreaId
name
isArchived
createdAt
```

Future planned field:

```txt
type
```

Possible values:

```txt
expense
income
reduce_expense
```

---

## entries

Financial transactions.

Current Architecture:

```txt
amount
budgetAreaId
categoryId
note
date
userId
familyId
createdAt
```

IMPORTANT:

Old architecture removed:

```txt
type
entryKindId
category
```

Entries now use IDs instead of text labels.

This prevents:

- duplicate names
- rename problems
- inconsistent calculations
