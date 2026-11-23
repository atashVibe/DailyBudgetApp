# DailyBudget implementation conventions

Use the existing shared UI for every new or changed screen, including email action and recovery screens. This is the owner's explicit product preference.

- Reuse `AppScreen`, `AppText`, `AppTextInput`, `FormLabel`, `PrimaryButton`, `SettingsSheet`, `LoadingSpinner` and `dashboardStyles` tokens. Authentication/recovery cards use `AuthCard`.
- Keep the current green palette, Inter typography, spacing, borders and rounded corners. Do not add one-off button styles or default blue browser/native controls to app screens.
- Use `InfoButton` for information actions: its 20px glyph and accessible tap target are shared standards. Keep short labels and their info action on the same row where possible.
- Prefer one main action per card or dialog; use the existing outline, text and danger variants for secondary and destructive actions. Preserve loading, disabled, validation and accessibility behavior.
- Check narrow phone layouts and keyboard use. UI changes must preserve the existing accounting, family authorization, receipt and subscription rules.
- Never put action codes, invitation codes, credentials or raw provider errors into logs, analytics or user-facing error details. Email verification must require a user's explicit confirmation.
