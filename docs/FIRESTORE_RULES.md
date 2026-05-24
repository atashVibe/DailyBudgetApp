# Firestore Rules Documentation

This file describes the intended Firestore security behavior in human language.

Actual Firebase rules may evolve over time.

---

# Users

Users can:

- read their own user document
- update their own user document

Users should not access other users' documents.

---

# Families

Only family members should access family data.

---

# Family Members

Family members can:

- read family member records inside their own family

Only admins should manage roles.

---

# Invites

Only family admins should:

- create invites
- revoke invites

Invitations should expire automatically.

---

# Budget Areas

Only admins can:

- create budget areas
- rename budget areas
- archive budget areas

Members can read budget areas.

Budget areas should never be permanently deleted.

---

# Categories

Only admins can:

- create categories
- rename categories
- archive categories

Members can read categories.

Categories should never be permanently deleted.

---

# Entries

Family members can:

- create entries
- read entries

Only entry owners or admins should edit/delete entries.

---

# Important Security Goals

- Prevent cross-family access
- Prevent unauthorized writes
- Protect private financial data
- Keep rules scalable
- Minimize Firestore read costs
