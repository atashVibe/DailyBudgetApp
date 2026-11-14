import { Link } from "expo-router";
import PublicInfoPage from "../components/PublicInfoPage";

export default function DeletionInfoScreen() {
  return (
    <PublicInfoPage
      title="Account & Data Deletion"
      introduction="You can delete your DailyBudget account in the app or request help by email. You do not need to sign in to read this page or contact support."
      sections={[
        {
          title: "Delete in the app",
          body: "Sign in, open Settings, find Account, and tap Delete Account. Read the warning, type DELETE, and confirm your identity with your password or original sign-in provider. Deletion is permanent. If other members remain and you are the only administrator, add another administrator first. If you are the only family member, that family’s budget data is also deleted.",
        },
        {
          title: "Request deletion by email",
          body: "Email dailybudgethub@gmail.com with the subject “DailyBudget deletion request”. Tell us the account email you used and whether you want the account deleted or help removing particular personal information. If possible, send the request from your account email. If you cannot sign in or use an Apple relay email, explain that in your message. We will need to verify ownership before deleting or disclosing account information. Never email passwords, verification codes, or identity documents.",
        },
        {
          title: "What is removed and what may remain",
          body: "Account deletion removes your Firebase sign-in, personal profile, and family-membership records. Shared budget history may remain for other family members with account attribution removed from your current families. Free-text notes are not automatically scrubbed of personal information. Tell support about personal information in notes or families you previously left so it can be reviewed for cleanup. Information other members copied, and provider-managed logs or backups, may remain as described in the Privacy Policy.",
        },
        {
          title: "After making a request",
          body: "Sending an email requests assistance; it does not immediately delete your account. Support will respond to arrange verification and explain any remaining steps. We do not advertise a fixed completion time during beta. If an in-app deletion fails, contact support rather than assuming all records were deleted.",
        },
      ]}
    >
      <Link
        href="mailto:dailybudgethub@gmail.com?subject=DailyBudget%20deletion%20request"
        style={{
          color: "#155E50",
          textDecorationLine: "underline",
          fontSize: 16,
          paddingVertical: 20,
        }}
      >
        Start a deletion request email
      </Link>
    </PublicInfoPage>
  );
}
