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
          body: "Firebase, operated by Google, provides authentication and Cloud Firestore data storage. If you choose Google or Apple sign-in, that provider processes your sign-in and shares account information according to your choices and its own privacy policy. Password sign-in and password resets are handled by Firebase. GitHub Pages hosts the web app and may process network information such as IP addresses under GitHub’s privacy policy. Our support email is hosted by Gmail. These providers may process information outside your country.",
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
