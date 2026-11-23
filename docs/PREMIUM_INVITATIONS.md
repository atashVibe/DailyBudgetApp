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

## Correct sender settings and interrupted-deployment recovery

For the configured Gmail sender, the nonsecret deployment values are `INVITATION_SMTP_USER=dailybudgethub@gmail.com`, `INVITATION_SMTP_HOST=smtp.gmail.com` and `INVITATION_SMTP_PORT=465`. They belong in the ignored `functions/.env.dailybudget-35c26` file; preserve unrelated values when correcting them. The Secret Manager App Password must belong to that sender. Do not print or place it in this file, a command argument or chat.

After an interrupted first function creation, a successful retry can leave the new HTTP service inaccessible. If the live request receives Google's HTML HTTP 403 before the app handler, inspect the function's invocation permissions. The owner can restore the intended HTTP access without rebuilding code:

```bash
gcloud functions add-invoker-policy-binding familyInvitationsApi --project=dailybudget-35c26 --region=us-west1 --member=allUsers
gcloud functions add-invoker-policy-binding storeNotifications --project=dailybudget-35c26 --region=us-west1 --member=allUsers
```

This documented gcloud command handles gen2's underlying Cloud Run service; no `--gen2` flag is needed. It grants invocation only, not access to Firestore, Storage or secrets. The invitation POST still requires the verified Firebase identity/current administrator and email limits; callbacks still require store verification. Source declarations are now explicit so future deployments repair invocation on updates as well. Scheduled maintenance stays separate.

Verify with an empty unauthenticated POST to the invitation endpoint: the expected result is the app's JSON HTTP 401, never a sent email or a successful operation. An actual delivered invitation and phone join still require a separate signed-in test.

Reference: <https://docs.cloud.google.com/sdk/gcloud/reference/functions/add-invoker-policy-binding>.

### Current publication evidence — November 23, 2026

The owner supplied **Deploy complete!** for reviewed `f45d303`, followed by successful invocation-repair bindings on both new services. The invitation unauthenticated POST now returns the app's JSON HTTP 401; receipt access also returns 401, and the store service is reachable (unsupported GET `/` returns Express 404). No probe sent an email or processed a store event. PRs #15/#16/#17 were merged; Pages run 45274648030 succeeded at main `50aa679`, whose source tree matches the reviewed/deployed checkpoint. The actual served bundle contains the new UI and disabled-purchase copy. Real inbox delivery/join and store/native tests remain unverified. No further Cloud Shell setup/deployment is needed solely for this repaired invocation setting; the explicit source declarations preserve it on future deployments.

## Diagnose a missing invitation without exposing recipient details

Run the reviewed cloud-report script in owner Cloud Shell with `node functions/scripts/cloud-readiness-audit.mjs --invitation-mail`. The stdin form uses `DAILYBUDGET_MAIL_AUDIT=1 node --input-type=module` after fetching the reviewed script. It reads only expected SMTP-setting matches, secret-binding presence, and the latest five automatic-delivery outcomes/timestamps. It does not access the password value or send any email. Six cloud-report checks cover credential/recipient/code redaction and blocked-versus-empty results.

- `failed` / `email-setup`: check the Gmail App Password belongs to the configured sender; never paste it into chat.
- `failed` / `address-rejected`: the provider rejected the address.
- `accepted`: the SMTP server accepted the message; investigate the sender's Sent/bounce messages and recipient folders. This is not inbox proof.
- `unknown` / `delivery-unknown` or prolonged `sending`: do not automatically resend an uncertain attempt.
- An empty **checked** list means no automatic email attempts were found; confirm the updated screen and Send invitation email action. A blocked/unavailable check does not prove an empty history.

### Verified sender-authentication issue and recovery

The owner audit at 2026-11-23T22:30:34Z found three failed `email-setup` attempts while all expected configuration matches and secret-binding presence were true. The backend classifies SMTP EAUTH this way: Gmail rejected the configured login; it did not accept these three messages for delivery. Replace the saved value with an App Password created while signed in as dailybudgethub@gmail.com (normal Google login passwords do not replace an App Password). Enter it only in the masked `functions:secrets:set INVITATION_SMTP_PASSWORD` prompt. Firebase CLI 15.36.0 offers to update functions using the stale version; selecting Yes updates the secret binding without requiring a full source deployment. Verify its completion before testing again.

A failed request retains its original result for duplicate protection. After credential repair, reload the app and create one fresh invitation; repeated clicks on the old request will not send another email. Verify a new accepted outcome and actual inbox/code/link/join. The owner has been asked to rotate the credential; rotation and delivery remain unconfirmed.

The UI now distinguishes definite failure with an Email was not sent alert while keeping the manual share code. Unknown delivery remains explicitly unconfirmed; the app does not retry uncertain mail automatically. Emulator-only browser coverage checks failed authentication, absence of mailbox delivery and stable request/code deduplication.
