# Family subscriptions: owner setup and testing

Implementation checkpoint, November 23, 2026. **Store payments are not live or proven end to end.** Firebase remains the only application database/file store. The owner selected direct Google Play Billing and Apple In-App Purchases; RevenueCat was removed. No RevenueCat service or dependency remains.

## What is already implemented

Existing Firebase Authentication, private Storage gateway, shared family membership, original files, retry/fencing/deletion tracking and accounting remain in place. Private Firestore configuration now supplies these proposed USD prices and decimal byte quotas (1 GB = 1,000,000,000 bytes):

| Family plan  | Monthly | Yearly, 15% off | Shared receipt allowance |
| ------------ | ------: | --------------: | -----------------------: |
| Free         |      $0 |              $0 |                     0 GB |
| Premium      |   $4.99 |          $50.90 |                     2 GB |
| Premium Plus |   $8.99 |          $91.70 |                     5 GB |
| Premium Pro  |  $14.99 |         $152.90 |                    20 GB |

Maximum new file size is 10,000,000 bytes (10 MB), checked against actual received bytes and decoded type on the server. The existing two-receipts-per-entry and configured receipt-count safety limits still apply. Shared usage derives from server-owned Firestore receipt and operation records, including reserved/retained originals; clients cannot edit counters or upload directly to Storage. Reservations are released only after uncertain failed-upload copies are verified removed. They are displayed separately from live originals. The locked final commit rechecks the current allowance to cover a quota reduction during upload.

The Family Receipts page shows the family plan, live/retained usage, allowance, remaining bytes, count and 80%/full warnings. The plan screen lists proposals, renewals and store availability. Store-installed native builds can fetch actual localized products, request purchases, restore and open the store subscription manager once configuration is enabled. Selecting a plan grants nothing. Only the direct server response from Google or Apple changes trusted family access. Web does not collect payment.

### Cancellation and downgrade rules

Cancelling a real paid subscription leaves upload access until its verified paid-through date. There is then a fixed 30-day view/download/export grace period before eligible receipt cleanup; budget history remains. Legacy manual operator grants with no paid period retain their prior immediate-ending behavior and are labeled as manual, not payments. Operator actions cannot overwrite store-verified billing. Global receipt-administrator sponsorship remains an independent existing exception.

After a verified downgrade takes effect, the lower allowance applies, uploads/replacements remain blocked until a verified upgrade, and a 30-day review deadline is shown. The family admin can prefer newest/oldest originals, preview which fit (reserving space for retained copies/drafts), download only the extras in ZIP parts up to 50 MB, and explicitly confirm their removal. The server rejects stale previews and preserves selected originals and all budget entries. Starting a download is not proof that the user saved it; the confirmation says to check the files. No unchosen automatic excess-file deletion is enabled. If the admin has not completed the review after the deadline, existing files stay read-only while the paid plan remains active; normal cancellation/expiry retention still applies.

### Billing ownership

The first administrator who starts store checkout establishes a private, random UUID billing binding for that family and payer. StoreKit receives it as `appAccountToken`; Google receives it as the obfuscated account ID. The backend verifies it against the store response. A payer is bound to one family; another family/admin/store cannot claim or silently transfer that purchase. Other current members share receipt access. Billing changes use the original purchaser/store account. A payer leaving or deleting their app account does not cancel a store subscription: they must cancel in the original store. Pending-owner reassignment, payer changes and cross-store moves require operator review of actual store ownership to avoid double billing; there is no self-service transfer implementation in this checkpoint.

## Owner configuration, in order

Keep purchases disabled until the entire sandbox/device checklist passes. This workspace has no owner Cloud/Play/App Store credentials. Never put keys, purchase tokens, passwords or `.p8` contents in chat, the app, `EXPO_PUBLIC_*` or GitHub.

1. Use the reviewed branch/commit in owner Cloud Shell, Node 24 and `npm ci --prefix functions --engine-strict`. Initialize private proposals only if absent:

   ```bash
   node functions/scripts/subscriptions-admin.mjs dailybudget-35c26 show
   node functions/scripts/subscriptions-admin.mjs dailybudget-35c26 init
   ```

   `init` refuses to overwrite existing configuration and keeps store purchasing off. To change a proposed price/quota without an app-code release, for example:

   ```bash
   node functions/scripts/subscriptions-admin.mjs dailybudget-35c26 price premium 499 2000000000
   ```

   **Actual store prices are set separately in the developer consoles.** Catalog proposals do not change existing charges or grandfathered store pricing. Keep them aligned and review store consent/notification rules before changing a price. `receiptConfig/subscriptions.yearlyDiscountBps` defaults to 1500; changing it updates proposals only.

2. **Google Play:** finish developer/payment-profile verification, create DailyBudget (`com.atashvibe.dailybudget`), and create three auto-renewing subscription products with monthly/yearly base plans. Configure the proposed prices. On Premium monthly/yearly, configure an eligible-new-customer **P1M** free-trial offer followed by the normal recurring price; the store collects payment information and consent. Do not offer local/fake free access. Give the actual Functions runtime service account the minimum required Play Console purchase/subscription permissions; enable the Android Publisher API. ADC is used from the runtime; no downloadable service-account key is needed. Verify the permissions with a real license tester before enabling checkout.

3. **Apple:** configure the paid-app agreement/banking/tax information, app record and In-App Purchase capability. Put all six monthly/yearly products into one auto-renewable subscription group, with Pro/Plus/Premium in the correct upgrade levels and periods at the same tier. Configure a one-month introductory free trial for Premium only; Apple determines eligibility. Leave StoreKit Family Sharing off: DailyBudget already shares through its own family membership. Record the numeric Apple app ID, issuer UUID and In-App Purchase key ID. Store the `.p8` private key only in Google Secret Manager as `APPLE_IAP_PRIVATE_KEY`; grant this runtime service account Secret Accessor on that specific secret. The Apple adapter retrieves it only server-side when configured. Apple-signed transactions/renewals/notifications are verified against bundled official Apple G2/G3 roots and the fixed bundle ID, with online certificate checks. Root certificates are public, not signing keys.

4. In private `receiptConfig/subscriptions`, add the exact store mappings (not placeholders):

   ```json
   {
     "purchasesEnabled": false,
     "googleEnabled": false,
     "appleEnabled": false,
     "products": [
       {
         "store": "google",
         "productId": "YOUR_PLAY_PREMIUM_ID",
         "basePlanId": "monthly",
         "plan": "premium",
         "interval": "monthly",
         "trialOfferId": "YOUR_ELIGIBLE_P1M_OFFER_ID"
       },
       {
         "store": "apple",
         "productId": "YOUR_APPLE_PREMIUM_MONTHLY_ID",
         "plan": "premium",
         "interval": "monthly"
       }
     ],
     "appleAppId": 1234567890,
     "appleIssuerId": "YOUR_ISSUER_UUID",
     "appleKeyId": "YOUR_KEY_ID",
     "sandboxTesterUids": []
   }
   ```

   Include each actual plan/period/store mapping; Google matching uses both product and base-plan ID. Apple matching uses the exact product ID. The example IDs above must not be used as real credentials/products. Sandbox Apple/Google purchases only grant access for UIDs explicitly named in `sandboxTesterUids`; use spare test families. Clear the allowlist for ordinary production accounts. Enable only the configured store(s) for controlled testing, not a public release.

5. **Store notifications and missed-event recovery:** deploy reviewed Firestore rules and `functions:receipts`. Direct Storage remains denied to clients. New `storeNotifications` is in existing `us-west1`:
   - Google RTDN: configure a Pub/Sub topic and Google Play publishing rights. Push to `https://us-west1-dailybudget-35c26.cloudfunctions.net/storeNotifications/google` using authenticated OIDC, a dedicated service account and the exact configured audience. Set `googlePushServiceAccount` and `googlePushAudience` in private configuration. The handler verifies the signed Google ID token, verified service-account email, issuer/audience and fixed package ID, then re-reads the purchase from Android Publisher. Message plan/expiry claims are never trusted.
   - Apple V2 notifications: set production/sandbox endpoints to `https://us-west1-dailybudget-35c26.cloudfunctions.net/storeNotifications/apple`. Only Apple-signed payloads pass, and the handler re-reads current subscription status. Unverified notifications do not access the private signing key.
   - Existing hourly maintenance rechecks due purchases; manual Refresh uses a one-minute server cooldown. Outages never create extra paid time or extend retention. Keep alerts on verification failures and test a missed notification before release.

6. Build new native apps with the installed `expo-iap` module/plugin and the existing Expo toolchain. Expo Go and the website cannot exercise purchases. A JavaScript export alone is not a native build. Validate native compilation/signing/Google login on actual Play-installed Android and Apple sandbox/TestFlight builds. Do not upgrade Expo or change working authentication just to make a billing dependency compile without reviewing that separately.

7. After controlled store tests pass, enable `purchasesEnabled` and the appropriate store flag for the tested release. Verify catalog/store prices, trial eligibility, billing terms, cancellation links, renewal, upgrade/downgrade timing, refund, restore, acknowledgement and notifications before taking real payments. Publish the matching frontend only after its backend/rules deployment. Existing invitation activation still separately requires the SMTP secret; see `PREMIUM_INVITATIONS.md`.

## How to monitor the app

Your global receipt-administrator role is distinct from a family-admin role. Open **Family Receipts → Receipt Administration → Refresh storage overview**. Ordinary users are denied this endpoint.

- Store-verified paid family counts per plan, with trials counted separately.
- Shared usage/allowance per family and families above allowance.
- Live original bytes by uploader UID (attribution, not an individual private quota).
- Recent failed uploads and pending/failed receipt deletion.
- Actual bucket objects/retained copies and the existing regional storage-only estimate where a verified rate exists. Full Firebase costs still come from Cloud Billing.
- Actual net subscription revenue, store fees, taxes and refunds must come from Google Play/Apple financial reports. The app reports revenue unavailable rather than multiplying proposed prices by family counts or counting trials/manual grants as sales.

Do not use manual access grants to simulate successful payment. They remain explicitly separate operator support tools and cannot modify a store-verified subscription. Never change billing proof/binding records to move a charge between families. Confirm cancellation/ownership in the original store first.

## Testing evidence and remaining release gates

At this checkpoint: TypeScript, 20 backend unit cases, 14 existing Firestore rules cases and 65 initial integration cases passed; a focused 15-case subscription run also passed, including refresh cooldown and the quota-change race. Store tests use injected Google-format responses in isolated Firebase emulators, plus actual Apple certificate-verifier rejection of forged signatures. They do not prove valid Apple/Google purchases, store acknowledgements/renewals, native SDK compatibility, notification delivery, live price/trial eligibility or production security configuration end to end.

Required owner/device rehearsal: Free cannot upload; each verified tier gives the whole family the correct allowance; verify the 80%/100% display and 10 MB rejection; simultaneous uploads/failed retry/deletion never overspend quota; wrong-family/direct Firebase writes are denied; trial renews only according to store consent; cancelling preserves paid access until end; downgrade review keeps chosen originals and budget entries; extras ZIPs open unchanged; uploads stay blocked until upgrade; leaving removes access; other members can still read shared originals. Use spare accounts and files, never production account deletion for testing. Record actual results before marking paid release ready.
