rules_version = '2';

service cloud.firestore {
match /databases/{database}/documents {

    // USERS
    match /users/{userId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }

// FAMILIES
match /families/{familyId} {
allow create: if request.auth != null;
allow read: if request.auth != null;
allow update: if request.auth != null;
}

// FAMILY MEMBERS
match /familyMembers/{memberId} {
allow create: if request.auth != null;
allow read: if request.auth != null;
allow update: if request.auth != null;
}

// BUDGET AREAS
match /budgetAreas/{budgetAreaId} {
allow read, create, update: if request.auth != null;
}

// CATEGORIES
match /categories/{categoryId} {
allow read, create, update: if request.auth != null;
}

    // ENTRIES
    match /entries/{entryId} {
      allow read, create, update, delete: if request.auth != null;
    }

    // INVITES
    match /invites/{inviteId} {
      allow create: if request.auth != null;
      allow read: if true;
      allow update: if true;
    }

}
}
