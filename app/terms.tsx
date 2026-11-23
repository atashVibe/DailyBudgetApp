import PublicInfoPage from "../components/PublicInfoPage";

export default function TermsScreen() {
  return (
    <PublicInfoPage
      title="Terms of use"
      dated
      introduction="These terms describe using DailyBudget, a personal and family budgeting app. Contact dailybudgethub@gmail.com if you have questions before using the service."
      sections={[
        {
          title: "What the app does",
          body: "DailyBudget records information you enter and calculates budget summaries. It does not connect to a bank, move money, or provide financial, investment, tax, or legal advice. Check important totals against your own records before making financial decisions.",
        },
        {
          title: "Your account",
          body: "Keep your sign-in secure and use an account you are authorized to access. Provide accurate information needed for your account and family membership. Do not share passwords, impersonate another person, or attempt to bypass access controls.",
        },
        {
          title: "Shared budgets",
          body: "Only invite people who should have access to your family budget. Members can see shared information, and administrators can manage settings and invitations. Enter only information you have permission to share. You remain responsible for your entries and the people you choose to invite.",
        },
        {
          title: "Acceptable use",
          body: "Do not use DailyBudget for unlawful activity, to harass others, to upload harmful content, or to interfere with the service. Do not attempt to access another family’s information. We may restrict access where necessary to investigate misuse or protect the service and its users.",
        },
        {
          title: "Beta availability and changes",
          body: "DailyBudget is being prepared for beta testing. Features may change, and interruptions or errors may occur. Keep your own copies of records you need. We do not guarantee uninterrupted availability or error-free calculations. These statements do not remove rights that cannot be excluded under applicable law.",
        },
        {
          title: "Store subscriptions",
          body: "Paid store subscriptions are being prepared and are not enabled until configuration and testing are complete. When available, the store shows the actual price, trial eligibility and renewal terms before you confirm. Eligible Premium trials renew at the store-confirmed recurring price unless cancelled in the store. Cancel through the store that took payment; access continues through the verified paid period. Receipt download/deletion rules are shown in the app and Privacy Policy. Deleting your DailyBudget account does not cancel a store subscription. Catalog prices are proposals until confirmed by the store.",
        },
        {
          title: "Leaving and deleting",
          body: "You can stop using DailyBudget or request account deletion. Shared family records may remain as explained in the Privacy Policy and Account & Data Deletion page. If you are a family’s only administrator and others remain, arrange another administrator before deleting your account.",
        },
        {
          title: "Changes and contact",
          body: "We will update the date on this page when terms change and communicate material changes where appropriate. Contact dailybudgethub@gmail.com with questions or concerns.",
        },
      ]}
    />
  );
}
