import PublicInfoPage from "../components/PublicInfoPage";

export default function SupportScreen() {
  return (
    <PublicInfoPage
      title="Support & Contact"
      introduction="For DailyBudget help, privacy requests, or beta feedback, email dailybudgethub@gmail.com. You do not need to sign in to contact us."
      sections={[
        {
          title: "Tell us what happened",
          body: "Describe what you were trying to do, what happened instead, and whether you were using the website, Android, or iPhone. Include any error message. If you send a screenshot, remove private budget details first. Never send passwords or verification codes. Email support is monitored for beta feedback; an immediate response is not guaranteed.",
        },
        {
          title: "Trouble signing in?",
          body: "For an email/password account, use Forgot Password on the sign-in screen and check your inbox and spam folder. For an Apple or Google account, use the original provider. Do not create another account to recover your existing family budget. Contact us if you can no longer access your original provider.",
        },
        {
          title: "Privacy or deletion requests",
          body: "Use the Privacy Policy and Account & Data Deletion links below for details. You can email support even if you cannot sign in. We may need to verify ownership before accessing, changing, or deleting account information.",
        },
      ]}
    />
  );
}
