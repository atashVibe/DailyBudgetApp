import PublicInfoPage from "../components/PublicInfoPage";

export default function PrivacyScreen() {
  return (
    <PublicInfoPage
      title="Privacy Policy"
      dated
      introduction="DailyBudget helps you track spending and manage a shared family budget. This policy explains the information used by the app and how to contact us about it."
      sections={[
        {
          title: "Information you provide",
          body: "We store your account email address, Firebase user ID, sign-in provider, and display name when provided. Family data includes names, membership, roles, invitations, budget amounts, budget areas, and categories. Budget entries include amounts, entry types, dates, notes, and the member who created them. Support requests include the information you choose to email us.",
        },
        {
          title: "Why we use it",
          body: "We use this information to sign you in, recover access, maintain your family membership, apply administrator permissions, save and calculate budgets, manage invitations, and respond to support or deletion requests. Only add information that your family needs for budgeting. Do not put banking passwords, identity documents, or other highly sensitive information in notes.",
        },
        {
          title: "Family sharing",
          body: "Members of the same family can access its shared budget information. Administrators manage family settings and invitations. Your account email or display name may appear to other family members. People you invite must be told that they are joining a shared budget. Other members may keep copies of information they can see.",
        },
        {
          title: "Services we use",
          body: "Firebase, operated by Google, provides authentication and Cloud Firestore data storage. If you choose Google or Apple sign-in, that provider processes your sign-in and shares account information according to your choices and its own privacy policy. Password sign-in and password resets are handled by Firebase. GitHub Pages hosts the web app and may process network information such as IP addresses under GitHub’s privacy policy. Our support email is hosted by Gmail. When enabled, automatic family invitation emails are sent through our configured SMTP email provider (Gmail by default) and contain the recipient address, family name, invitation role, temporary code and join link. Scheduled cleanup removes invitation delivery and abuse-prevention metadata after seven days; operational failures can delay cleanup. Invitation emails can remain in sender and recipient mailboxes until those account owners delete them. These providers may process information outside your country.",
        },
        {
          title: "Protection and device storage",
          body: "Firebase Authentication and database access rules restrict access based on your account and family membership. The web app uses HTTPS. Sign-in information may be stored on your device to keep you signed in. Sign out when using a shared device. No service can guarantee absolute security. The app currently has no advertising or bank-account connection feature.",
        },
        {
          title: "Retention and deletion",
          body: "Account and budget records are kept while needed to provide your budget and until they are deleted. Deleting your account removes your sign-in, profile, and membership records. Shared family history can remain for other members with your account attribution removed from families you currently belong to; notes are not automatically scrubbed of personal information. When you are the only member of a family, its budget data is deleted too. Attribution in a family you previously left may need additional cleanup: contact support. Provider-managed logs, backups, and support emails may remain under the providers’ retention policies or where required by law. We do not promise immediate removal from every provider backup.",
        },
        {
          title: "Family receipt originals",
          body: "When you attach receipts, Firebase Cloud Storage holds the original JPG, JPEG, PNG or PDF, and Firestore holds the filename, size, upload times, ownership and transaction association. Receipts are shared with every current member of their family. Current members can view, download, replace and delete family receipts; people outside the family and former members cannot access them through the app. Global receipt administrators manage access and see usage and deletion records; that role alone does not grant access to another family’s originals. Viewing, downloading or exporting can create copies on your device. Deleting a budget entry does not automatically erase your receipt: manage it under Family Receipts.",
        },
        {
          title: "Receipt access and retention",
          body: "Active Premium and receipt-administrator access allow uploads. Archive access retains existing originals without new uploads. Premium and Archive access belong to the family and cover its current members. Canceling the family plan stops Premium uploads and starts a shared 30-day download/export grace period. A current member with separately assigned global receipt-administrator access can sponsor the family without a Premium subscription. The app shows the scheduled deletion date. Renewing Premium or activating Archive before expiry preserves files that have not already been deleted. After expiry, scheduled backend cleanup removes eligible originals and receipt metadata; budget history stays intact. Deleting one member’s account preserves shared receipts for remaining members; a sole-member family’s originals are submitted for deletion. Storage soft deletion, versioning or retention holds can delay permanent erasure and remain chargeable. Such copies are tracked until deletion can be verified. No independent backup is currently promised. Export your originals before the deadline and keep copies you need for your records. Email support with access or deletion questions.",
        },
        {
          title: "Your requests",
          body: "You can edit information through the app and delete your account in Settings. You can also email dailybudgethub@gmail.com to request access, correction, or deletion of your information, including information in families you previously left. We may need to verify account ownership before acting. The Account & Data Deletion page explains the process.",
        },
        {
          title: "Policy updates",
          body: "We will update the date on this page when this policy changes. Material changes will be communicated through the app or the account contact information where appropriate. Contact dailybudgethub@gmail.com with privacy questions.",
        },
      ]}
    />
  );
}
