# Dashboard visual and UX polish

The dashboard remains the existing shared Expo/React Native screen for web, Android and iOS. No dependency, persistence model, route, request, financial service, subscription rule or receipt upload flow was changed.

## Work order and files

1. **Budget overview:** `app/components/BudgetSummaryCard.tsx`, `app/components/common/dashboardStyles.ts`. A single 10px spending bar with Today marker replaces the ring. The existing remaining amount is the hero, followed by a derived daily guide, pace badge and three period statistics. Month progress and yearly spending remain behind a collapsed Details action.
2. **New entry:** `app/components/ExpenseEntryForm.tsx`, `app/components/common/AppPicker.tsx`. Always visible, amount first, plain labels, default area/category and filtering unchanged, date and receipt side by side, existing required-receipt/upload checks retained. Empty/zero amounts show the requested inline form error. New entries use the same Add entry label for every category type. Existing edit mode retains Update entry and Cancel edit so updating is clearly distinguished from adding.
3. **Recent entries:** `app/components/RecentEntriesList.tsx`. Compact 32px category tiles, signed amounts, relative date labels and thin dividers. The accessible Entry actions button opens the existing receipt/edit/delete actions and retained note/type details. The receipt modal uses a simple fade. Existing View all/Load more behavior is retained; the View all label stays constant.
4. **Responsive/accessibility polish:** shared `PrimaryButton.tsx`, `AppPicker.tsx`, `Toast.tsx`, theme tokens, and `app/(drawer)/dashboard.tsx`. Shared focus treatment, tabular amounts, safe-area wrapper, static loading skeletons and inline errors. Edit scroll reveals the form immediately. Tests in `tests/receipt-ui.spec.mjs` and `tests/account-deletion-ui.spec.mjs` follow the new controls while preserving existing data/access assertions.

## What the old bar measured

The bar under Remaining was `summary.progressPercent`: expenses minus refunds divided by the **entire month's budget**, clamped from 0% to 100%. The ring was remaining **earned allowance through today** divided by that earned allowance. They were different measures and were not supposed to be complementary percentages. Income/cashback affect neither. Nothing in `services/financeCalculations.ts`, the report totals or the entry services was changed.

The monthly hero still uses `summary.remainingToday`, not full-month budget minus spending. The yearly hero retains the previous full-year allowance minus spending. Budget/Spent/Daily budget statistics expose the existing full-period totals. The new pace badge is display-only: spending versus full-period budget × elapsed days / total days, with full-period overspending taking precedence. Its Today marker uses the same elapsed-day convention as the existing month progress. Daily guide = existing remaining / days left **including today**, avoiding a zero divisor on the last day. The existing recovery-plan message remains available when earned allowance is negative.

For a 30-day month at $30/day, day 15 with expenses $300 and refunds $40: full budget $900, spending $260 (29%), earned allowance $450, remaining $190 and a 16-day guide of $11.88/day. Income/cashback remain neutral. Refunds exceeding expenses leave the spending bar empty.

## Deliberate limits

- Native dropdowns remain native. Type annotations and selected checks are provided using their existing option labels, colors and selection styling. Exact right-aligned sublabels, per-word font sizes and popup highlight appearance depend on the OS/browser; a custom menu would add interaction behavior beyond this native-picker polish.
- All targets are at least 48px/dp where the shared controls allow, including the large amount field. The approved InfoButton remains a 20px visual glyph with a 48px hit area, consistently everywhere.
- The existing allowance, month reset/year accumulation, defaults, period selection, required-receipt gating, receipt access, upload retries, editing, deletion, category icons, family authorization and account information remain intact.
- No dynamic category-based heading or button text, new animation library, store payment change, platform fork, native binary build or real-data migration was introduced. The existing explicitly named edit mode is preserved.
- Existing light-theme behavior is preserved. No new dark theme was invented.

## Preview

After publication, open or refresh **https://atashvibe.github.io/DailyBudgetApp/** on desktop, Android Chrome/Samsung Internet, or iPhone Safari/Chrome. Installed home-screen web apps use the same URL/code.

For native development previews, use the repository's existing development client (`npx expo start --dev-client`) and open its link/QR in an already installed matching Android/iOS development build. Expo Go does not contain all of this app's native sign-in/store modules. No new native binary or signing setup is needed for the shared UI source, but an installed native app must load the updated bundle or be rebuilt through the existing preview-build process.

Automated browser checks use isolated Firebase demo emulators. WebKit with an iPhone device profile and Android/iOS JavaScript exports are not physical-device/native-binary tests. Real phone testing remains necessary before store release.
