# Approved family-sharing amendment — November 16, 2026

The owner clarified that Premium belongs to a family. Every current family member can upload, view, download, export, replace and delete that family’s receipts. Former members and people outside the family must be denied. Family plans, quotas and retention are shared. Global receipt-administrator identity remains separate from family roles and paid plans. This amendment supersedes the individual-only receipt access and individual-plan portions of the original request below.

---

# Daily Budget – Receipt Management, Firebase Storage, and Premium Access

## PROJECT OBJECTIVE

Implement a secure, reliable receipt management system in my existing Daily Budget application.

The application already uses Firebase. I want to use:

- Firebase Authentication for user identity.
- Cloud Firestore for receipt metadata and subscription entitlements.
- Firebase Cloud Storage for actual receipt files.

Do not introduce Cloudflare R2, AWS S3, or another storage provider.

This application currently has only one user: me. However, I intend to make it publicly available in the future, potentially with thousands of users.

Build the feature for my immediate use while preparing the architecture for future premium subscriptions.

**IMPORTANT: Do not rewrite the existing application, replace Firebase, or modify unrelated features. Preserve the existing architecture and coding conventions wherever possible.**

---

# PHASE 1 – INSPECT THE EXISTING APPLICATION

Before writing or modifying code:

1. Examine the complete existing project structure.
2. Identify the programming language, framework, and application architecture.
3. Identify how Firebase is currently configured.
4. Identify the existing Firebase Authentication implementation.
5. Identify the existing Firestore database structure.
6. Identify how users and expense transactions are represented.
7. Determine whether Firebase Cloud Storage is already configured.
8. Identify whether the application has an existing administrator role or permission system.
9. Identify the existing backup, deployment, and backend infrastructure.

Do not assume anything about the existing implementation.

Prepare a short implementation plan explaining:

- Which existing files need modification.
- Which new files need to be created.
- Which Firestore collections or documents need to be added.
- Which Firebase configuration changes are required.
- Whether additional backend infrastructure is necessary.
- Any expected recurring costs.

Do not begin implementation until the inspection and plan are complete.

Do not ask me to redesign or replace existing functionality.

---

# PHASE 2 – RECEIPT MANAGEMENT

## 2.1 Supported file formats

Allow users to attach these files to expense transactions:

- JPG
- JPEG
- PNG
- PDF

Keep the original uploaded file unchanged.

Do not convert original PDFs or images into another format.

If thumbnails or compressed previews are generated, store them separately from the original file.

## 2.2 Receipt functionality

Users should be able to:

1. Take a photograph of a receipt using a supported device.
2. Select an existing photograph.
3. Upload a PDF document.
4. Attach multiple receipts to one transaction.
5. View previously uploaded receipts.
6. Download original files.
7. Replace an existing receipt.
8. Delete a receipt after confirmation.
9. See upload progress and upload errors.

Integrate receipt functionality naturally into the existing expense transaction interface.

Do not unnecessarily redesign the existing user interface.

## 2.3 File size limits

Implement configurable file-size limits.

Use these initial limits unless the existing application has technical constraints that require different values:

- Maximum individual file size: 10 MB.
- Maximum number of receipts per transaction: 2.

Validate file size and actual file content, not just the filename extension.

Keep these limits configurable for future subscription plans.

---

# PHASE 3 – FIREBASE STORAGE ARCHITECTURE

## 3.1 Storage responsibilities

Use:

**Firebase Cloud Storage**
- Actual receipt images.
- Original PDF documents.
- Optional separately generated thumbnails.

**Cloud Firestore**
- Receipt metadata.
- Transaction association.
- User ownership.
- Storage references.
- Subscription entitlements.
- Retention and deletion status.

Never store images or PDF files as Base64 strings inside Firestore.

## 3.2 Storage organization

Use a structure similar to:

receipts/{userId}/{transactionId}/{receiptId}

Every receipt must have a unique identifier.

Do not use filenames alone as unique identifiers.

## 3.3 Receipt metadata

Store the following information for each receipt:

- receiptId
- userId
- transactionId
- originalFilename
- storagePath
- mimeType
- fileSize
- uploadedAt
- updatedAt
- status

Use appropriate timestamps and consistent data types.

Do not store unnecessary duplicate information.

## 3.4 Security and privacy

Receipt documents contain potentially sensitive financial information.

Implement strict ownership and access controls.

Requirements:

- Users can only access their own receipts.
- Users cannot read, download, replace, or delete another user's receipts.
- Do not make receipt files publicly accessible.
- Do not expose Firebase administrative credentials in client code.
- Validate authentication and authorization for every operation.
- Validate file types, file sizes, and ownership.
- Use secure download mechanisms.
- Do not rely on hidden buttons or frontend checks for security.

Use Firebase Storage Security Rules and Firestore Security Rules.

If trusted backend authorization is required, implement it using the existing backend architecture or an appropriate Firebase server-side service.

Never trust subscription or administrator information supplied by the client.

---

# PHASE 4 – USER PLANS AND PERMISSIONS

Create a centralized entitlement system.

Do not scatter subscription checks throughout the application.

Keep these concepts separate:

- User identity.
- Administrator role.
- Subscription status.
- Receipt permissions.
- Storage retention status.

## 4.1 Free users

Free users:

- Can use existing budget functionality.
- Cannot upload new receipts.
- Do not receive receipt storage allocation.

## 4.2 Premium users

Active Premium users:

- Can upload receipts.
- Can view existing receipts.
- Can download receipts.
- Can replace receipts.
- Can delete receipts.
- Can export their receipts.

## 4.3 Administrator

My account must have permanent administrator-level access to receipt functionality without requiring a Premium subscription.

Requirements:

- Administrator permissions must be assigned securely on the backend.
- Do not hardcode my email address into application logic.
- Do not allow ordinary users to grant themselves administrator privileges.
- Do not expose administrator privileges through client-side settings.
- Allow authorized administrators to grant or revoke administrator access.
- Administrators must still authenticate normally.

My account must be treated as an administrator, not as a Premium subscriber.

For the initial implementation, provide a secure setup procedure to assign my existing account the administrator role.

Do not automatically grant administrator privileges to the first user who registers.

## 4.4 Future subscription integration

Do not implement Stripe or actual payment processing yet.

Prepare the architecture for future monthly and yearly subscriptions.

The entitlement system should support:

- Free.
- Premium.
- Archive.
- Administrator.

Subscription status and actual receipt permissions must be managed separately.

---

# PHASE 5 – SUBSCRIPTION CANCELLATION AND RETENTION

This is an important business requirement.

I do not want to pay indefinitely for storing files belonging to customers who have canceled their Premium subscriptions.

Implement the following retention policy.

## 5.1 Active Premium subscription

While a subscription is active:

- Allow uploads.
- Allow viewing.
- Allow downloads.
- Allow replacements.
- Allow deletion.

## 5.2 Subscription cancellation

When a user cancels Premium:

1. Immediately disable new uploads.
2. Preserve existing receipt files.
3. Start a 30-day grace period.
4. Continue allowing the user to view and download existing receipts.
5. Allow bulk export of all existing receipts.
6. Display the exact date when permanent deletion is scheduled.
7. Provide clear warnings about the upcoming deletion.
8. Send notifications before the deadline if notification infrastructure exists.

Cancellation must not immediately delete any files.

## 5.3 After the 30-day grace period

If the user has not purchased Premium again or activated an Archive plan:

1. Permanently delete their receipt files from Firebase Cloud Storage.
2. Delete corresponding receipt metadata from Firestore.
3. Verify deletion.
4. Record the result in an administrative audit log.
5. Retry failed deletions automatically.
6. Do not delete unrelated transaction records or budget history.

The deletion process must be idempotent. Running it multiple times must not cause errors or unintended deletion.

Account for any configured soft deletion, object versioning, or backup retention that could continue generating storage charges.

Do not claim that data has been permanently deleted if retained copies still exist.

## 5.4 Re-subscribing

If a user renews or purchases Premium before the deletion deadline:

- Cancel the scheduled deletion.
- Restore Premium receipt permissions.
- Preserve all existing receipts.

If deletion has already completed, do not pretend the original files can be recovered.

---

# PHASE 6 – FUTURE ARCHIVE PLAN

Prepare the entitlement architecture for an optional Archive plan.

Do not implement billing yet.

Archive users:

- Cannot upload new receipts.
- Can view existing receipts.
- Can download existing receipts.
- Can export all their receipts.
- Pay a recurring fee to retain their existing documents.

An Archive subscription should prevent the 30-day deletion process from running.

Keep Archive functionality separate from Premium functionality so it can be introduced later without redesigning the receipt system.

---

# PHASE 7 – COST CONTROL

I am currently the only user and want to keep operating costs as low as possible.

Requirements:

1. Use Firebase's available free usage allowances.
2. Do not introduce unnecessary paid services.
3. Implement configurable upload and storage limits.
4. Prevent duplicate uploads where possible.
5. Avoid unnecessary file downloads.
6. Avoid storing multiple copies of original receipts without a clear reason.
7. Monitor storage usage.
8. Configure billing alerts where supported.
9. Provide an administrator view of total receipt storage usage.
10. Estimate monthly storage costs using actual stored data and applicable Firebase pricing.

IMPORTANT:

Firebase's free usage allowances do not eliminate the possibility of charges.

Check the current Firebase Storage billing requirements before implementation.

Do not enable paid services or deploy resources without explaining the required changes and potential costs to me.

Do not promise that billing alerts will automatically stop charges.

---

# PHASE 8 – BACKUP AND DATA PORTABILITY

Receipt documents may be needed for IRS audits years after the original transaction.

Do not treat receipt files as temporary application attachments.

Requirements:

- Preserve original documents.
- Provide bulk receipt export.
- Organize exported documents by tax year.
- Include original filenames where practical.
- Include a manifest containing transaction dates, merchant information if available, and receipt associations.
- Ensure users can download their documents independently of the application.
- Do not automatically delete receipts belonging to active users.

The application must have a documented recovery and migration strategy.

Do not claim Firebase Storage is independently backed up unless a separate backup mechanism has actually been configured and tested.

---

# PHASE 9 – AUTOMATED RETENTION AND ADMINISTRATION

Implement a trusted scheduled backend process to manage expired receipt access.

It must:

- Find users whose grace periods have expired.
- Check their current subscription and Archive entitlements again.
- Skip administrators.
- Skip active Premium users.
- Skip Archive users.
- Delete only eligible users' receipt files.
- Update Firestore metadata.
- Log successful and failed operations.
- Retry failed operations.
- Avoid duplicate processing.

Do not implement cleanup exclusively in the frontend.

Provide an administrative view showing:

- Total number of stored receipts.
- Total storage consumed.
- Number of Premium users.
- Number of Archive users.
- Number of users awaiting deletion.
- Upcoming deletion dates.
- Failed deletion operations.
- Estimated monthly storage costs.

Use the existing application design and navigation.

Do not build a separate administration application unless the existing architecture requires it.

---

# PHASE 10 – TESTING

Do not consider this feature complete just because the code compiles.

Implement and run appropriate tests.

Test the following scenarios:

### Upload and retrieval

1. Upload a JPG receipt.
2. Upload a JPEG receipt.
3. Upload a PNG receipt.
4. Upload a PDF receipt.
5. View uploaded images.
6. View uploaded PDFs.
7. Download original files.
8. Replace a receipt.
9. Delete a receipt with confirmation.
10. Attach multiple receipts to one transaction.

### Security

11. Verify that unauthenticated users cannot access receipts.
12. Verify that User A cannot access User B's receipts.
13. Verify that users cannot modify another user's receipt metadata.
14. Verify that free users cannot bypass upload restrictions.
15. Verify that administrator permissions cannot be granted from client-side code.

### Subscription lifecycle

16. Verify that administrators can upload without Premium.
17. Verify that active Premium users can upload.
18. Verify that free users cannot upload.
19. Verify that cancellation immediately disables new uploads.
20. Verify that canceled users can download existing receipts during the 30-day grace period.
21. Verify that renewal cancels scheduled deletion.
22. Verify that Archive users retain existing receipts.
23. Verify that expired users' files are deleted after the grace period.
24. Verify that unrelated budget transactions remain intact.
25. Verify that failed deletions are retried safely.

### Reliability

26. Test interrupted uploads.
27. Test failed downloads.
28. Test unavailable Firebase Storage.
29. Test bulk receipt export.
30. Test the scheduled cleanup process.

Use Firebase Emulator Suite where appropriate for security and automated testing.

Clearly distinguish tests performed in an emulator from tests verified against actual Firebase infrastructure.

---

# PHASE 11 – IMPLEMENTATION AND FINAL REPORT

After completing the inspection and receiving any necessary approval for billing-related changes:

Implement the feature in small, logical stages.

Requirements:

- Follow existing coding conventions.
- Keep code modular and maintainable.
- Do not duplicate existing functionality.
- Do not introduce unnecessary dependencies.
- Create database migrations or safe schema updates where needed.
- Update Firebase Security Rules.
- Provide meaningful error messages.
- Do not break existing application functionality.
- Do not overwrite existing user data.

After implementation, provide a report containing:

1. What was implemented.
2. Files created and modified.
3. Firestore schema changes.
4. Firebase Storage configuration.
5. Security Rules changes.
6. Administrator setup instructions.
7. Firebase Console configuration steps.
8. Any billing requirements.
9. Estimated recurring costs.
10. Test results, including failures.
11. Remaining tasks before public release.

Do not mark incomplete functionality as completed.

If a feature requires manual configuration in Firebase Console, explain exactly what I need to click and configure, step by step.

I am not an expert in software development or Firebase. Use clear language and do not assume I know how to configure cloud infrastructure.

## FINAL PRIORITY

My immediate priority is to use receipt uploads in my own Daily Budget application.

Build a secure foundation that supports future Premium and Archive plans, but do not overengineer the first release.

Preserve my existing application and database.

Do not implement payment processing yet.

Do not make costly infrastructure changes without my approval.