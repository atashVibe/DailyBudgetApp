# DailyBudget accounting review — November 14, 2026

This reviews the deployed accounting code at `23d810b` / application merge
`0696e7e`. The findings below describe that original implementation. The agreed
corrections are now implemented on `codex/fix-budget-accounting`; their publishing
and verification status is recorded in `PROJECT_LOG.md`. No live records were
rewritten or deleted.

Published correction: PR #3 merged as `584450f`, deployed successfully by Pages
run `43585618133`. All 14 finance tests passed locally and in the publishing
workflow. The live login page and updated JavaScript bundle were verified.
Authenticated phone testing of the corrected summary remains the next check.
The findings combine executable checks of the actual calculation functions with
inspection of entry saving, editing, dates, permissions, and exports. Tests used
synthetic records, not a user's Firebase records.

## Rules the owner has specified

- Income must not change allowance or the spending status bar.
- Cashback must not change allowance, status, or the spending bar, just like income.
- Negative net expenses after returns must show an empty spending bar.
- Owner confirmed monthly “On track / Over budget” compares spending with the
  **whole month's budget**, not the allowance earned through today. Keep the
  monthly spending bar on that same full-month basis.
- Yearly status and spending bar compare total net spending with the **whole
  calendar year's budget**, not the budget earned so far. The owner wants higher
  spending in one month to be offset by lower spending in later months. With a
  single daily budget, the annual limit is daily budget × 365 (or 366 in a leap
  year). Keep monthly and yearly assessments independent.
- Each month's allowance starts fresh, with no carry-forward of the previous
  month's unused balance or overspending. The annual total retains all months.

## Agreed corrections implemented

- Budget spending is expenses minus refunds; income/cashback contribute zero.
- Monthly status/bar use the full calendar month; yearly status/bar use the full
  calendar year, including leap years. Month-passed progress stays independent.
- Both spending bars are bounded to 0–100%; excess refunds can remain visible as
  negative spending without creating a negative-width bar.
- Totals and allowance/recovery arithmetic use whole cents to avoid false deficits.
- Existing monthly resets remain; previous months remain in annual spending.
- Fourteen automated calculation tests cover these rules. The Pages publishing
  workflow runs them before building/deploying.

Other findings below (date input/display, duplicate saves, edit/type preservation,
validation, future-dated entries, and data freshness) remain separate follow-up
work; their policies and fixes are not silently changed by this correction.

Confirmed treatment: keep both income and cashback out of budget spending totals,
allowance, spending status, and spending bars. A future separate income/cashback
total may still report those receipts. Refunds/returns currently reverse spending;
refund timing and excess-credit treatment below still need agreement.

| Entry of $50 | Current calculation | Spending effect after correction | Allowance effect |
| --- | --- | --- | --- |
| Expense | Adds $50 to spending | Adds $50 | Decreases $50 |
| Refund / Return | Subtracts $50 from spending | Subtracts $50 | Increases $50 |
| Income | Subtracts $50 from spending | No change | No change |
| Cashback | Subtracts $50 from spending | No change | No change |

## What the app currently calculates

The dashboard combines **all members and all budget areas in the active family**.
Personal and business expenses use the same family budget. It does not maintain
separate allowances by member or budget area.

| Figure | Current formula / behavior |
| --- | --- |
| Monthly “Total Expences” | This month's expenses − refunds − income − cashback |
| Yearly Spending | This year's expenses − refunds − income − cashback |
| Allowance | Daily budget × day of month − monthly total above |
| Full-month budget | Daily budget × calendar days in this month |
| Monthly money-used percentage | Monthly total ÷ full-month budget × 100 |
| Monthly spending bar | That percentage capped at 100, without a minimum of zero |
| Month-passed bar | Day of month ÷ days in month × 100; independent of entries |
| Recovery days | If allowance is negative: round up deficit ÷ daily budget |
| Yearly budget used for status | Daily budget × days elapsed this year |
| Yearly spending bar | Yearly total ÷ elapsed-year budget × 100, capped only at 100 |

Status colors use the same thresholds for the monthly and yearly percentages:

| Percentage | Message / color |
| --- | --- |
| Below 61%, including negative values | On track / green |
| 61% through 90% | Be careful / amber |
| Above 90% through 100% | On The Border! Be careful! / red |
| Above 100% | Over budget / black |

Exactly 100% is red, and only values above 100% are called over budget. The
displayed percentage caps at 100%, even if actual spending is much higher.

## Confirmed bugs and risks

### 1. Income and cashback incorrectly fund spending allowance

`services/reports.ts:46` treats income and cashback exactly like refunds. Both
monthly and yearly spending, allowance, recovery days, status, and spending bars
use those net totals. This violates the owner's allowance requirement and the
income/status requirement.

Executable example: April 10, daily budget $30, no expenses:

| Entries | Current spending | Current allowance | Allowance under the owner's rule |
| --- | --- | --- | --- |
| None | $0 | $300 | $300 |
| Income $100 | −$100 | $400 | $300 |
| Cashback $20 | −$20 | $320 | $300 |

Stored entry types remain separate. Correcting this aggregation can recalculate
existing typed entries without rewriting their amounts.

### 2. Negative totals produce negative bar widths

`services/financeCalculations.ts:60` and `:76` only limit percentages at the top.
For $100 expenses and a $150 refund, monthly net spending is −$50. With a $900
monthly budget, the function returns a **−5.56% bar width**. Negative percentage
width is invalid for the web bar; it can fall back to the element's automatic
width, explaining a full-looking bar. The negative calculated width was reproduced;
the owner's phone rendering was reported, not independently reproduced.

Both monthly and yearly bars must be bounded between 0% and 100%. Keep the true
negative amount available as a refund credit rather than turning it into a full
bar. Whether to carry that credit across periods needs a separate decision.

### 3. Negative allowance and “On track” can coexist by the agreed rule

This follows from two different comparisons: allowance uses the budget earned
through today, while monthly status uses the whole month's budget.

Reproduced: April 10, daily budget $30, expenses $400. Allowance is **−$100** and
the app suggests four recovery days, but monthly status is **On track**, with a
44.44% bar against the full $900 month. Yearly status uses elapsed days instead,
so monthly and yearly status are not directly comparable.

The owner has now confirmed the full-month comparison. This combination is
therefore expected behavior, not a defect to fix by changing monthly status to
an elapsed-days comparison. Labeling the monthly basis clearly can help users.
The owner also confirmed yearly status should use the full calendar-year budget.
Replace the current elapsed-year denominator when implementing the corrections.

### 4. Fractions of a cent can create a false recovery day

Money is summed using floating-point numbers without cent rounding before the
deficit check. Reproduced: daily budget $0.30 on the first day of the month,
expenses $0.10 and $0.20. Spending becomes $0.30000000000000004. Allowance displays
**−$0.00**, but recovery days becomes **1**. Money calculations should use integer
cents, with an agreed rounding rule and sensible size limits.

### 5. Dates are interpreted differently across screens

- Calculations correctly treat a normal `YYYY-MM-DD` entry as a local calendar
  day. The recent list and initial native date picker use `new Date(date)`, which
  treats that same date-only string as UTC. Reproduced in Los Angeles: an entry
  stored as April 10 displays as **April 9**, with an artificial time of day.
- A timestamp string such as `2026-04-10T12:00:00Z` is silently omitted from totals
  because the report adds another `T00:00:00`. This was reproduced. The current
  form saves date-only strings; the prevalence of older timestamps was not checked
  in live data.
- Empty or invalid dates are not explicitly rejected by the save handler. Reports
  silently skip some invalid values; JavaScript can normalize impossible calendar
  dates into another month. Such entries need explicit handling, not quiet omission.
- The annual elapsed-day calculation divides elapsed milliseconds by 24 hours.
  After a daylight-saving change it can be off by a day near midnight. Reproduced
  in Los Angeles on March 9, 2026: day **67** is used instead of **68**.

### 6. Repeated Save taps can create duplicate entries

The save handler has no in-flight lock and the Save button stays enabled during
the request. New records use a fresh Firestore document ID each time. Multiple
requests can therefore create duplicate expenses and change totals. This is a
code-confirmed path; no duplicate live records were created to test it.

### 7. Editing can change an entry's accounting type unexpectedly

Existing entries store their type, so changing a category's type alone does not
rewrite past totals. However, saving an edited entry assigns the category's
**current** type. If a refund category was later changed to expense, editing only
the old entry's note can convert that refund into an expense.

Archived categories and budget areas disappear from the edit selectors. The form
can fall back to another selection, changing an old entry's area/category/type on
save. Historical category names also show as Unknown Category in the recent list
because its lookup excludes archived categories. Entries in archived areas still
count in totals; archiving does not erase history.

### 8. Amount and budget validation need stronger checks

- Zero-value entries are accepted by the form. Negative signs are stripped, so
  refunds must be entered as positive amounts in a refund category.
- Comma decimals are silently changed: typing `12,50` produces `1250`, not `12.50`.
  This follows directly from the sanitizer; it needs either safe locale handling
  or a clear validation message.
- The daily-budget field allows arbitrary numeric precision and does not reject
  non-finite values explicitly. The dashboard substitutes $30 for a stored zero
  budget because it uses a truthiness fallback; Settings refuses zero budgets.
- The repository's Firestore entry rules enforce family access but do not
  validate amount positivity/finiteness, cents, recognized type, valid date, or
  category/area consistency. Malformed values can poison or silently disappear
  from totals. Adding schema checks requires rules regression tests and a plan
  for existing data.

### 9. Summaries can be stale or temporarily misleading

The dashboard retrieves entries when opened/refreshed after its own changes. It
does not subscribe to changes made by another family member. It does not schedule
a refresh at midnight or month/year rollover. Failed entry loading is not handled
with the same visible error as failed dashboard-context loading; zero or older
totals may remain. Overlapping requests are not guarded against stale responses.

## Rules needing agreement

1. **Monthly comparison agreed:** Status and spending bar compare against the
   full month's budget. Do not change them to an elapsed-days comparison.
   The month-passed bar remains independent of transactions. **Yearly comparison
   also agreed:** use the whole calendar-year budget. Monthly overspending may be
   compensated by lower spending in later months without declaring the full year
   over budget. Monthly allowance resets as confirmed in item 5 below.
2. **Refund period:** A refund currently reduces spending in the month/year of its
   own entry date, even if the purchase was in a previous period. There is no link
   to an original purchase and no check against over-refunding.
3. **Negative spending:** Should excess refunds increase this month's allowance
   above the earned daily budget? The current formula does that. The owner has
   specified an empty bar for negative spending. The existing within-month refund
   credit remains; balances reset at the next month under the confirmed rule.
4. **Future-dated entries:** All entries in the selected current month count now,
   even if dated later this month. All entries in the current year count toward
   yearly spending, including future months. Reproduced with an April 20 expense
   counted on April 10. Decide whether planned items should be separate from
   actual spending or future dates should be disallowed.
5. **Rollover:** Allowance resets with each month; there is no carry-forward balance
   for unused allowance or overspending. Recovery days are an estimate assuming
   no further spending and do not model the month reset or changing budget.
   **Owner confirmed:** each month starts fresh; only the yearly total retains the
   previous month's spending. Do not add monthly allowance carry-forward.
6. **Budget changes:** Updating the daily budget recalculates the entire current
   month/year at the new rate. No effective date or budget-rate history is stored.
7. **Scope and currency:** All family areas share one daily budget. Dollar signs
   are fixed; currencies and conversion are not modeled. Confirm whether business
   entries should affect the same allowance as household entries.
8. **Cashback treatment agreed:** It must leave allowance, status, and the spending
   bar unchanged, just like income. A future separate receipts total is optional.
   A purchase discount entered as a lower expense is a different treatment from
   a later cashback receipt; the app currently has no explicit link.

## Entry lifecycle, access, and exports

- Totals use the entry date, not its creation date. Recent Entries is ordered by
  creation time, so a newly entered older expense appears near the top while
  affecting the older period's totals.
- Editing updates the same document; deleting removes it. A successful dashboard
  reload recomputes totals from the remaining records. There is no separate cash
  balance ledger or income/cashback total shown on the dashboard today.
- Active family members can add, edit, and delete shared family entries, including
  another member's entries. Only administrators can change daily budget and manage
  categories/areas. This is the current permission model, not an accounting error.
- CSV export contains raw dated records, type, and positive amount, with optional
  area filtering. It does not calculate totals. Summing the Amount column alone
  does not produce spending or cash flow; the entry type must be used. Export
  includes archived category/area names because its lookup loads all of them.

## Proposed correction order after review

1. Preserve the agreed full-month basis for monthly status/bar. Finish reviewing
   refund/period and monthly allowance carry-forward rules. Income/cashback
   exclusions and the full-year annual comparison are also confirmed.
2. Exclude income/cashback from budget spending and bound both bars to 0–100%.
3. Add regression tests for all four types, negative refunds, over-budget values,
   exact cents, monthly/yearly boundaries, and agreed refund/future-date rules.
4. Fix money/date handling and prevent duplicate saves and silent edit conversions.
5. Strengthen validation and error/loading states; test family sharing and period
   rollover. Do not silently rewrite or delete existing entries.

Review limitations: no authenticated ledger was inspected, no Firebase rules were
deployed, and no production entries were added, changed, or deleted. Live phone
rendering and duplicate-save/edit interactions still need a dedicated test family.
