# Password recovery verification

Use dedicated test accounts. Do not reset a real user's password for testing.

The app uses `sendPasswordResetEmail` and Firebase's default hosted action handler;
it does not implement a custom email-link handler. Confirm the Firebase password
reset email template still points to that handler and enable email enumeration
protection in Firebase Authentication settings. Generic UI text alone does not
protect the underlying API from enumeration.

Before marking recovery complete:

1. Open Sign In → Forgot Password on web and Android. Confirm it works signed out,
   the keyboard does not hide controls, and Back to Sign In returns to login.
2. Submit an empty or malformed address. Confirm a validation message appears.
3. Request a reset for an email/password test user. Confirm the email arrives,
   including checking spam. Open the link, set a new password, then verify the old
   password fails and the new one accesses the same UID, family, role, and entries.
4. Request a reset for an unknown address and a disabled test account. Confirm
   the app shows the same confirmation as a successful request. Inspect API
   responses to verify email enumeration protection is enabled.
5. Reuse a completed link, then test an invalid and expired link on the hosted
   Firebase page. Confirm clear errors and that requesting a new link from the
   app works. Do not mark these tested based only on the app's guidance text.
6. Disconnect the device, submit, and confirm the connection error allows retry.
   Repeat taps while a request is pending must not start concurrent requests.
7. Confirm Google/Apple recovery guidance is visible. A reset must not create a
   new user, change family membership, or link another provider.

Live email delivery, Firebase console configuration, and device checks remain
unverified until recorded with results in the project log.
