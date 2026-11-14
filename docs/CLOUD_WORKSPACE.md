# Cloud workspace

For phone testing, use the existing GitHub Pages app at
`https://atashvibe.github.io/DailyBudgetApp/`. Publishing updates happens through
the repository's Pages workflow after changes reach main. This is separate from
the cloud development preview described below.

The app runs on the shared cloud computer and connects to the existing live
Firebase project, `dailybudget-35c26`. Use dedicated test accounts and families.

Open the shared Desktop panel and use Chrome. The running app is at
`http://localhost:8083/login`. This address is on the cloud computer; opening it
in a browser on your own computer will not reach the app.

## Restarting development

From `/workspace/DailyBudgetApp`:

```bash
npm ci --cache /tmp/dailybudget-npm-cache
EXPO_NO_TELEMETRY=1 __UNSAFE_EXPO_HOME_DIRECTORY=/tmp/dailybudget-expo npm run web -- --port 8083 --host lan
```

The temporary npm cache and Expo directory avoid restricted home-directory
writes in this managed workspace. The preview is available while the workspace
and development server are running; it is not a permanent public deployment.

Firebase Auth and Firestore use the public client settings already in
`google-services.json`, with optional `EXPO_PUBLIC_FIREBASE_*` environment
overrides. Neither service requires a web app ID for the current app. If adding
Analytics, configure the actual web registration's app ID. Never use an Android
app ID as the web app ID. Never add administrator credentials or Apple private
keys to the app or public environment variables.

For another Firebase project, provide all of that project's client settings
together; do not mix keys and project IDs across projects. Existing Firebase
security rules and sign-in requirements still apply.
