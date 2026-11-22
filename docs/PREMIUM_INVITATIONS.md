# Family Premium and emailed invitations

Prepared November 22, 2026. Production activation is pending the owner's secure sender setup and Functions/rules deployment. Do not claim a real email was delivered from emulator evidence.

## Premium entry points and cancellation

The family receipt viewer and each entry's receipt viewer offer **Upgrade family to Premium** when there is no active paid Premium plan, including families with separately granted receipt-administrator sponsorship. The plan page explains family-wide uploads, administrator purchasing responsibility, and that **purchasing is not available yet**. Its checkout button is disabled. No price, payment provider, charge, subscription or paid entitlement is created by opening it. Pricing/billing-period and first-release purchase scope remain owner decisions; Android digital purchases require the applicable Play billing approach.

The existing receipt policy, not a new payment integration, determines cancellation behavior:

- When Premium access ends, new uploads and replacements stop. Current family members can view/download/export existing receipts during a 30-day grace period; the app exposes the deletion deadline.
- After that deadline, scheduled maintenance deletes eligible original files and receipt records. Budget entries remain. Cleanup may occur after the deadline rather than at its exact second.
- Renewal or Archive access before deletion preserves receipts that still exist. Renewing cannot restore originals already deleted. Neither an Archive checkout nor a paid cancellation/renewal lifecycle is implemented by this change.
- Separate receipt-administrator sponsorship can continue upload access independently of a paid subscription. Family membership still controls who can access the family's files.

## Invitation flow

The administrator's **Invite Family** screen sends an email containing the eight-digit code, the fixed public HTTPS joining link, intended address/role and exact ten-minute expiry. The public link opens a web page; installed Android App Links are not configured by this work. Login, Google login, signup and password recovery preserve the code. Opening a link never joins automatically. The recipient must sign in with the addressed, verified email and explicitly choose **Join this family**. Existing last-administrator protections remain in force. Joining switches the active family under the existing membership model.

The sender must be a verified-email, current active family administrator. The backend derives family and actor from Firebase, validates the recipient and role, and rechecks authority immediately before handing the message to SMTP. It accepts no client-selected actor/family. There is an explicit manual **Create a share link instead** fallback that says no email was sent.

SMTP acceptance is not proof of inbox delivery; recipients may need to check spam. Stable per-request IDs claim delivery before SMTP. Concurrent/retried requests with the same ID do not send again, and reusing an ID for another payload is rejected. Unknown outcomes are not automatically resent. This is not a universal exactly-once delivery guarantee: SMTP/network failures can leave delivery uncertain. Private request records are retained seven days, so deduplication is bounded to that retention window. A new deliberate invitation has a new request ID.

Limits are 100 email attempts/project/day, 10/sender/hour, 20/family/hour and one/family-recipient/minute. Hour/day counters use fixed UTC windows. Failed or uncertain attempts consume quota. Manual share links do not send email and are outside SMTP limits. The existing hourly maintenance job removes expired private delivery/quota records, at most 400 per collection/run; operational failures can delay cleanup. It does not purge the existing invitation records or mailbox copies. Secret/password/provider errors are never included in API responses or application logs.

## Security and compatibility

Invitation reads/acceptance require verified recipient email. Used/expired invites cannot create membership, and deleted families cannot be joined. Private delivery/quota collections deny all client access. Family creation now atomically writes the family, initial administrator membership and user profile. The creator bootstrap applies only to a family that did not exist before that transaction: a former creator cannot use it to regain membership or delete the family without current administrator authority.

Signup failures no longer delete `auth.currentUser`; that could delete an existing signed-in account or undo an operation whose network result was unknown. Newly created accounts with incomplete setup can sign in and continue. These fixes do not complete the separate former-family personal-attribution cleanup roadmap item.

**Deploy reviewed Functions and Firestore rules before publishing the matching frontend.** Old two-step family creation and new atomic bootstrap rules are not compatible; coordinate the backend deployment and frontend publication promptly. Existing active family records need no migration. Until the frontend is published, new-family setup may fail safely during this short transition.

## Owner activation: keep credentials out of chat

The workspace has no owner Google Cloud credentials. Default sender is `dailybudgethub@gmail.com`, Gmail SMTP over TLS on port 465. If that account cannot use a Google App Password, configure a supported SMTP provider instead; never use the normal Google password or disable TLS.

1. In the sender's Google account, enable two-step verification and create an App Password named DailyBudget Invitations: <https://myaccount.google.com/apppasswords>. Follow [Google's requirements](https://support.google.com/accounts/answer/185833). Do not paste the password in chat, a command argument, source code or a repository file.
2. In owner Cloud Shell, enter the reviewed checkout and use Node 24. Fetch/switch this feature branch (or its eventual merged commit), then install its Functions dependencies. Stop if there are local changes rather than discarding them:

   ```bash
   cd ~/DailyBudgetApp-receipts
   git status --short
   git fetch origin codex/premium-entry-and-email-invitations
   git switch --detach FETCH_HEAD
   nvm install 24
   nvm use 24
   npm ci --prefix functions --engine-strict
   ```

3. Store the App Password at the CLI's interactive secret prompt. Only type/paste it into that prompt; it must not be included in the returned output:

   ```bash
   npx --yes firebase-tools@15.36.0 functions:secrets:set INVITATION_SMTP_PASSWORD --project dailybudget-35c26
   ```

4. Deploy the reviewed rules and the `receipts` codebase, which contains the existing receipt API/maintenance and the new invitation endpoint:

   ```bash
   npx --yes firebase-tools@15.36.0 deploy --project dailybudget-35c26 --only firestore:rules,functions:receipts
   ```

   Only `familyInvitationsApi` receives the SMTP secret; the existing receipt API and maintenance do not. The new function uses `us-west1`, reusing the region's existing seven-day build-image cleanup policy. No new Storage rules/index deployment is required. Default endpoint is `https://us-west1-dailybudget-35c26.cloudfunctions.net/familyInvitationsApi`; the frontend includes this fallback. Nonsecret Firebase parameters `INVITATION_SMTP_USER`, `INVITATION_SMTP_HOST`, `INVITATION_SMTP_PORT` support another provider. Store only its password in Secret Manager. Google Cloud Functions/Secret Manager and the mail provider may incur usage charges; the existing budget warnings are not a spending cap.

5. Supply the deployment result without secrets so the tested frontend can be published. Then use a spare real recipient account: send an invitation, check its inbox/spam, open the emailed link, sign in, explicitly join and verify the correct family. Verify one-use/expiry with spare invitations. Record actual delivery/device results separately from isolated tests.

[Firebase secret configuration reference](https://firebase.google.com/docs/functions/config-env).

## Verification

All automated email tests use local Firebase emulators and a fake mailbox restricted to `@example.test`; no real mail is sent. Backend checks cover concurrent duplicate requests, recipient/header validation, quotas, provider-error privacy, current authority, private records and cleanup. Rules checks cover verified/unverified recipients, expired/used invitations, atomic family creation, and former-creator access denial. Browser checks cover the Premium entry points without entitlement changes, Google/email joining, verification, wrong-recipient denial, existing-account preservation and both new-family setup paths.

Local checks passed: TypeScript/lint, finance14/cloud-report4/backend-unit9/rules14/backend-integration52; all 20 Chromium browser flows and the six invitation/Premium cases in iPhone-configured WebKit; production web and Android JavaScript exports. These exports do not establish native binary or physical-device behavior.

Real SMTP delivery, production deployment, physical-device mail-link behavior, checkout and payment lifecycle remain unverified until separately completed.
