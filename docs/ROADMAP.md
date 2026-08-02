# DailyBudget Roadmap

## Goal

Release DailyBudget quickly without exposing real users or financial data to preventable problems.

The sequence is:

1. Beta-readiness fixes
2. Internal device testing
3. Private beta with friends
4. Public store launch
5. Monetization experiments

## Current Progress

- [x] Email/password authentication
- [x] Google authentication
- [x] Apple web authentication
- [x] Apple Developer App ID
- [x] Apple Services ID and private key
- [x] Firebase Apple configuration
- [x] Budget areas and categories
- [x] Default-selection behavior
- [x] Family creation, joining, and roles
- [x] TypeScript passes
- [x] Lint passes without errors
- [x] Commit and push the completed Apple-login work
- [ ] Test Apple login on a real iPhone
- [ ] Test Google login on real iPhone and Android devices

---

# Phase 1 — Mandatory Beta-Readiness Work

Do not add major features during this phase.

## 1. Save the Current Version

- [x] Review the Apple-login changes
- [x] Commit them
- [x] Push them to GitHub
- [x] Confirm the `.p8` Apple key is not inside the repository
- [ ] Create a stable beta checkpoint/tag

## 2. Account Deletion

Add an easy-to-find **Delete Account** option under Settings.

- [x] Require confirmation before deletion
- [x] Require recent sign-in before deletion
- [x] Support email/password reauthentication
- [x] Support Google reauthentication
- [ ] Support Apple reauthentication and token revocation
- [x] Support Apple reauthentication (native token revocation still needs a backend)
- [x] Delete the Firebase Authentication account
- [x] Delete the user profile
- [x] Delete the user’s family-membership record
- [x] Remove or anonymize personal data
- [x] Handle users who are the family’s only administrator
- [x] Require the administrator to transfer ownership or explicitly delete the family
- [ ] Test deletion with all three login methods
- [ ] Confirm deleted users cannot sign back into the old account

## 3. Required Public Pages

Create a small public DailyBudget website containing:

- [ ] Privacy Policy
- [ ] Account/Data Deletion Request
- [ ] Support/contact page
- [ ] Terms of Use
- [ ] Public support email address
- [ ] Links that work without signing into the app

Add these links inside:

- [ ] Sign-up screen
- [ ] Settings screen
- [ ] Delete Account screen

The privacy policy must accurately explain:

- Email address and user ID collection
- Budget entries and family data
- Firebase and authentication providers
- Why data is collected
- How it is protected
- Who it is shared with
- Data retention
- Account and data deletion
- Contact information
- Policy-update process

## 4. Database Security

Because DailyBudget stores personal financial information:

- [ ] Review every Firestore security rule
- [ ] Confirm users can only read their own families
- [ ] Confirm members cannot perform administrator actions
- [ ] Secure invitation codes
- [ ] Prevent users from changing their own roles
- [ ] Prevent access after leaving a family
- [ ] Add Firestore rules to the repository
- [ ] Test rules with two unrelated test families
- [ ] Configure Firebase usage/billing alerts
- [ ] Decide how backups and recovery will work
- [ ] Consider Firebase App Check before public launch

## 5. Stability Pass

- [ ] Install Expo’s recommended compatible package versions
- [ ] Run TypeScript
- [ ] Run lint
- [ ] Run Expo dependency checks
- [ ] Test email, Google, and Apple authentication
- [ ] Test sign-out for every authentication method
- [ ] Test creating and joining families
- [ ] Test invitation codes and role permissions
- [ ] Test adding, editing, and deleting entries
- [ ] Test budget-area and category changes
- [ ] Confirm changing defaults does not reorder the list
- [ ] Test empty families and empty categories
- [ ] Test archived categories and budget areas
- [ ] Prevent duplicate saves from repeated taps
- [ ] Show understandable errors when requests fail
- [ ] Test slow or disconnected internet
- [ ] Add basic tests for financial calculations
- [ ] Check text size, contrast, and accessibility labels

## 6. Release Identity

- [ ] Decide whether the public name is `DailyBudget` or `DailyBudgetApp`
- [x] Confirm bundle/package ID: `com.atashvibe.dailybudget`
- [ ] Review the app icon on light and dark backgrounds
- [ ] Review splash screen
- [ ] Set version and build-number strategy
- [ ] Create separate test accounts and families
- [ ] Decide whether beta and production use separate Firebase projects

## Phase 1 Exit Gate

Proceed only when:

- [ ] No known data-loss or security bug
- [ ] No broken authentication method
- [ ] Account deletion works
- [ ] Privacy and deletion pages are public
- [ ] Core budget workflows work on web
- [ ] All work is committed and pushed

---

# Phase 2 — Internal Real-Device Testing

## iPhone

- [ ] Create the DailyBudget record in App Store Connect
- [ ] Verify agreements and developer information
- [ ] Create an EAS production iOS build
- [ ] Upload it to App Store Connect
- [ ] Wait for processing
- [ ] Add the build to TestFlight Internal Testing
- [ ] Install it from TestFlight on a real iPhone
- [ ] Test Apple login
- [ ] Test Google login
- [ ] Test email/password login
- [ ] Test every core budgeting workflow
- [ ] Test on at least one smaller and one larger iPhone if available

## Android

- [ ] Create the app in Google Play Console
- [ ] Confirm developer identity verification
- [ ] Create an EAS Android App Bundle
- [ ] Upload it to Internal Testing
- [ ] Add trusted tester email addresses
- [ ] Install it through Google Play
- [ ] Test Google and email/password login
- [ ] Confirm the Apple button is hidden
- [ ] Test the back button and Android keyboard
- [ ] Test at least two Android screen sizes

## Phase 2 Exit Gate

- [ ] No crashes during normal use
- [ ] Authentication works on real devices
- [ ] Data remains correct after closing and reopening
- [ ] Family permissions work
- [ ] Account deletion works
- [ ] No critical layout problems

---

# Phase 3 — Private Beta With Friends

## Prepare the Beta

- [ ] Write a short explanation of what DailyBudget does
- [ ] Create a feedback email or form
- [ ] Prepare a simple “What to test” checklist
- [ ] Explain that beta data might be reset
- [ ] Never use real banking passwords or highly sensitive notes
- [ ] Establish how bugs should be reported

## Apple Beta

- [ ] Create a TestFlight external-testing group
- [ ] Add beta description and contact information
- [ ] Submit the build for Beta App Review
- [ ] Invite interested friends after approval

## Android Beta

- [ ] Move from Internal Testing to Closed Testing
- [ ] Invite friends using their Google accounts
- [ ] If required, maintain at least 12 opted-in testers for 14 continuous days before applying for production access

## Collect Useful Feedback

Ask testers to report:

- [ ] Where they became confused
- [ ] Anything they expected but could not find
- [ ] Login or invitation failures
- [ ] Incorrect budget calculations
- [ ] Data that disappeared or duplicated
- [ ] Screens that look bad on their phone
- [ ] Features they would actually pay for
- [ ] Features they do not care about

Classify feedback:

- **Critical:** crashes, security, data loss, incorrect totals
- **Important:** broken workflows or severe confusion
- **Later:** cosmetic preferences and new feature ideas

Complete at least two beta cycles before public launch.

---

# Phase 4 — Public Store Preparation

## Store Materials

- [ ] Final app name and subtitle
- [ ] Short and full descriptions
- [ ] App icon
- [ ] iPhone screenshots
- [ ] Android phone screenshots
- [ ] Optional tablet screenshots
- [ ] Category and age rating
- [ ] Keywords
- [ ] Support URL
- [ ] Privacy Policy URL
- [ ] Account-deletion URL
- [ ] Copyright and developer information

## Apple App Store

- [ ] Complete App Privacy disclosures
- [ ] Describe Firebase and authentication data accurately
- [ ] Complete export-compliance questions
- [ ] Provide App Review notes
- [ ] Provide a permanent demo account with sample data
- [ ] Make every major feature accessible to reviewers
- [ ] Select the tested TestFlight build
- [ ] Submit for App Review
- [ ] Use manual release after approval

## Google Play

- [ ] Complete Data Safety
- [ ] Complete Account Deletion disclosure
- [ ] Complete Financial Features declaration accurately
- [ ] Complete target-audience and content-rating forms
- [ ] Declare whether the app contains ads
- [ ] Provide permanent reviewer login credentials
- [ ] Complete package-name and identity verification
- [ ] Apply for production access if required
- [ ] Use a staged production rollout

## Public Launch Gate

- [ ] No unresolved critical beta issue
- [ ] Security rules verified
- [ ] Privacy disclosures match actual behavior
- [ ] Account deletion verified
- [ ] Reviewer account works
- [ ] Support channel is monitored
- [ ] Production data and backups are ready
- [ ] Store listings accurately describe existing features

---

# Phase 5 — After Launch

## First Weeks

- [ ] Monitor crashes and login failures
- [ ] Monitor Firebase errors, usage, and costs
- [ ] Respond to support requests
- [ ] Read store reviews
- [ ] Fix critical problems before adding features
- [ ] Release small, understandable updates
- [ ] Maintain release notes

## Product Decisions

Measure:

- [ ] How many invited users install the app
- [ ] How many finish family setup
- [ ] How many enter expenses repeatedly
- [ ] How many return after one week
- [ ] Which screens cause abandonment
- [ ] Which features testers repeatedly request

## Monetization

Do not add payment complexity before users repeatedly use the app.

First:

- [ ] Interview active beta users
- [ ] Ask what problem DailyBudget solves for them
- [ ] Ask which feature would justify payment
- [ ] Identify whether users prefer subscription or one-time purchase
- [ ] Define a useful free version
- [ ] Keep basic data access and account deletion outside any paywall
- [ ] Review Apple and Google payment rules before implementing payments

Possible paid features to validate—not automatically build:

- Advanced household reports
- Longer history and comparisons
- Smart recurring-expense tools
- Data export formats
- Multiple family budgets
- Custom insights and alerts
- Shared planning features

## Finish-Fast Rules

- No major new feature before private beta.
- Fix critical bugs before cosmetic improvements.
- Work on one checklist item at a time.
- Commit every stable checkpoint.
- Do not rebuild working architecture without a demonstrated problem.
- Let real tester behavior decide which new features matter.
- Public release is not the finish line; a stable private beta is the next finish line.
