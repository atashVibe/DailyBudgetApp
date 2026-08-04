# Firestore Security Rules

The deployable source of truth is [`firestore.rules`](../firestore.rules).
`firebase.json` points Firebase tooling to that file.

## Security model

- A signed-in user can read and update only their own user profile.
- Family data is readable only by active members of that family.
- Family settings, budget areas, categories, invitations, and destructive
  family actions require an active administrator membership.
- Members may create and edit shared entries only inside their active family.
- A user cannot grant themselves an administrator role by editing their user
  profile.
- A user who leaves a family loses access immediately.
- Invitation lookup requires authentication, the invitation code, pending
  status, and the signed-in account's matching email address.
- New invitations use cryptographically generated eight-digit codes that
  expire after ten minutes.
- Account deletion may remove the deleting user's identity fields while
  preserving shared household records.
- Unrecognized collections are denied by default.

## Before deployment

Do not publish a rules change until all of these checks pass:

1. Validate the rules without deployment:

   ```powershell
   npx firebase login
   npx firebase deploy --only firestore:rules --project dailybudget-35c26 --dry-run
   ```

2. Run the Firebase Emulator security tests:

   ```powershell
   npm run test:rules
   ```

3. Test with two unrelated families and confirm that neither can read or
   modify the other's documents.

4. Test administrator and member accounts separately.

5. Test joining, leaving, switching, family deletion, and account deletion.

6. Deploy the exact reviewed file:

   ```powershell
   npx firebase deploy --only firestore:rules --project dailybudget-35c26
   ```

7. Repeat the two-family access test against the deployed project.

## Required access matrix

| Operation | Administrator | Member | Unrelated user | Signed out |
| --- | --- | --- | --- | --- |
| Read own family data | Allow | Allow | Deny | Deny |
| Add and edit entries | Allow | Allow | Deny | Deny |
| Change family budget | Allow | Deny | Deny | Deny |
| Manage budget areas/categories | Allow | Deny | Deny | Deny |
| Create invitations | Allow | Deny | Deny | Deny |
| Read a matching invitation | Allow | Allow when addressed to the account | Deny | Deny |
| Change roles | Allow | Deny | Deny | Deny |
| Read data after leaving | Deny | Deny | Deny | Deny |
| Delete own account/profile | Allow | Allow | Allow | Deny |

## Current validation status

- TypeScript: passed
- ESLint: passed with no warnings or errors
- Expo web export: passed
- Firebase rules compilation: passed using a Firebase CLI dry run
- Emulator access tests: 10 passed, 0 failed
- Production deployment: intentionally not performed
