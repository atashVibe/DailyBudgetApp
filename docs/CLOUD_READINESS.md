# Cloud readiness — November 22, 2026

## Verified owner report

The owner ran the read-only report from published commit `f706d86` in Google
Cloud Shell and supplied its output, timestamped `2026-11-22T19:02:41.864Z`.
The project is `dailybudget-35c26`. No settings were changed by that report.

| Area | Evidence | Remaining work |
| --- | --- | --- |
| Database | `(default)` in `us-west2`; point-in-time recovery disabled; one-hour version retention | Initial report listed no schedules/copies. The owner subsequently created the daily, 14-day schedule below; an actual backup copy and restore remain unverified. |
| Receipt storage | `US-WEST1`; public-access prevention enforced; no public principals in bucket IAM; seven-day soft deletion; versioning off; no retention lock | Check inherited and object ACL permissions; prepare a separate cloud backup of originals. These settings alone do not prove effective least privilege or independent recovery. |
| Bucket access mode | Uniform bucket-level access is off | Review fine-grained/object ACL use before changing access mode. Do not switch it simply to clear a checklist. |
| Billing | Owner enabled the Budgets API; report at `19:28:18.981Z` reads an existing applicable USD 10 budget with current-spend thresholds at 50%, 90% and 100% (USD 5/9/10). Default billing IAM recipients are enabled; custom notification-channel count is zero. | Confirm actual recipients, budget period/project scope and email delivery. The report does not include period/scope details or prove notification delivery. Do not create a duplicate budget. |
| Receipt API | Function active; uses the project's default Compute service account | Review effective permissions and plan a dedicated least-privilege runtime account. The account name alone does not prove excessive access. |
| Receipt maintenance | Enabled hourly; latest reported attempt `2026-11-22T19:07:02.385108Z`, status code `0` | This reports a successful invocation, not proof that every retained copy has expired. Verify actual cleanup separately. |
| Authentication privacy | Corrected reports at `19:26:14.193Z` and `19:28:18.981Z` read `emailEnumerationProtection: true`. No Authentication setting was changed. | Configuration is verified; real-device unknown-account/reset-link behavior remains a separate check. |

The original report described 403s as requiring owner permission. The status alone
does not distinguish missing IAM permission, disabled APIs, token scopes or a quota
project requirement. The updated report includes only allowlisted Google error
reason codes and API service names. It still omits raw error messages, access
tokens and arbitrary metadata. Unknown diagnostics stay omitted; an omitted reason
does not prove a particular cause.

## Follow-up report and request-project correction

The owner reran the diagnostic report from `df9b3c2` at
`2026-11-22T19:21:00.402Z`. It independently lists a daily schedule with retention
`1209600s` (14 days). Backup copies are still an empty list; this was approximately
ten minutes after schedule creation, not proof that a scheduled backup failed.

Both blocked checks now include `SERVICE_DISABLED` and their service name. The
script did not send `x-goog-user-project`, and the old diagnostics did not preserve
the consumer-project context. Google documents that raw gcloud user tokens can
produce disabled-service errors for the Cloud SDK project unless a quota project
is explicitly supplied. This is a possible explanation, not a verified cause of
this owner's errors.

The report now sends `x-goog-user-project: dailybudget-35c26` on every GET. Its
allowlisted denial diagnostics may include `consumerProjectMatchesDailyBudget`
as a boolean, without printing any unrelated project identifier or raw metadata.
This corrects the inspection request; it does not enable any API, change IAM,
alter billing settings, upgrade Authentication or configure alerts. The caller
needs `serviceusage.services.use` on the explicitly selected project. Preserve
blocked status if Google still denies a check.

The owner ran the corrected report from `8cd6f12` at
`2026-11-22T19:26:14.193Z`. Auth privacy became readable and showed
`emailEnumerationProtection: true`; the inspection now works without an Authentication upgrade or configuration
change. The budgets denial persisted with
`consumerProjectMatchesDailyBudget: true`, identifying the disabled Budgets API
in the actual app project.

The owner then ran the following command and supplied its successful operation
result. This enabled the Budgets API; no budget was created or changed:

```bash
gcloud services enable billingbudgets.googleapis.com --project=dailybudget-35c26
```

A final owner report at `2026-11-22T19:28:18.981Z` reads the existing applicable
budget, named `Firebase Project dailybudget-35c26`, amount **USD 10**. Its
current-spend warnings are **USD 5, USD 9 and USD 10**. Default billing IAM
recipients are enabled; zero custom Monitoring channels does not mean default
email is disabled. The report omits budget period and exact project-scope details,
and no actual delivered email was supplied. Leave the existing budget in place;
alerts do not stop charges. Verify the actual recipients and delivery separately.

The daily 14-day schedule is still listed, but backup copies remain empty in the
latest report, roughly 17 minutes after schedule creation. No failed backup was
reported and no successful backup copy or restore has yet been demonstrated.
Next: confirm billing recipients/delivery, verify the first backup once available,
and plan an isolated restore plus independently protected receipt-original
recovery. Keep effective-IAM, actual retained-copy expiry and real-device account
behavior gates open.

## Created: daily database backup schedule, retained 14 days

The owner selected **14 days** after being told that backup storage is billed by
Google based on size. The owner's Cloud Shell output confirms successful creation
for the existing default database at `2026-11-22T19:11:07.568019Z`:

- Schedule ID: `2030ce62-395e-45bc-8e87-9e3b672ca515`.
- Database: `projects/dailybudget-35c26/databases/(default)`.
- Recurrence: `dailyRecurrence: {}` (daily).
- Retention: `1209600s`, exactly 14 days.

The following command has already succeeded; use the read-only checks below to
verify results rather than running it again:

```bash
gcloud firestore backups schedules create --project=dailybudget-35c26 --database='(default)' --recurrence=daily --retention=14d
```

The owner repeated the create command and received `ALREADY_EXISTS` for the same
frequency. This is consistent with the successful first creation, not evidence
of backup failure. Leave the schedule in place. Creation does not prove a completed
backup; Google chooses the time of day. No actual backup copy has yet been shown.

Inspect schedules and actual backup copies with these separate read-only checks:

```bash
gcloud firestore backups schedules list --project=dailybudget-35c26 --database='(default)' --format=json
```

```bash
gcloud firestore backups list --project=dailybudget-35c26 --location=us-west2 --format=json
```

Backup storage is billable per retained copy and size; restores are billed by
restored size. No fixed monthly cost can be inferred from the report because it
does not include database size. This choice does not enable point-in-time recovery,
create a budget or change receipt retention. Do not enable other paid features as
part of this command.

## Recovery evidence still needed

- [x] Record successful schedule creation and confirm daily recurrence plus 14-day retention (owner Cloud Shell output, November 22, 2026).
- [ ] Confirm at least one backup for the default database reaches `READY`.
- [ ] Plan and perform an isolated restore into a new database, keeping the app pointed at production. Verify representative families, entries, memberships and indexes. Account for restore charges and protection of the copied data before running it.
- [ ] Review and apply appropriate security rules to the test destination. Managed database backups do not include Firebase Authentication identities, receipt-file originals, security rules or TTL policies; source-controlled rules and separately reviewed recovery steps are needed.
- [ ] Prepare an independently protected cloud backup location and bounded retention for receipt originals, with matching metadata/hashes. Verify recovery of original bytes before treating exports/copies as a backup. Define how deletion requests expire from retained copies.
- [x] Resolve the inspection 403s: explicit DailyBudget quota-project header verifies existing Auth privacy; owner enabled only the Budgets API after a matching-project denial. Latest report reads both configurations successfully.
- [x] Verify the existing applicable USD 10 budget and USD 5/9/10 current-spend warning thresholds; preserve it without creating a duplicate.
- [ ] Confirm the existing budget period/project scope and actual billing email recipients; verify delivered notifications. Alerts do not cap charges.
- [ ] Review inherited IAM and existing object ACLs; verify actual receipt cleanup and retained-copy expiry.

Managed Firestore snapshots in the same project are a first recovery layer. They
do not complete independent recovery of the whole app or protect against every
project/account-loss scenario. Keep the full backup/restore roadmap gate open.

Official references checked November 22, 2026:

- [Scheduled backups and restores](https://firebase.google.com/docs/firestore/backups)
- [Create a backup schedule with gcloud](https://docs.cloud.google.com/sdk/gcloud/reference/firestore/backups/schedules/create)
- [Database backup and restore pricing](https://firebase.google.com/docs/firestore/pricing#backup_data_and_restore_operations)
- [gcloud user-token requests and the quota-project header](https://docs.cloud.google.com/sdk/gcloud/reference/auth/print-access-token)

- [Google Cloud budget alerts and notifications](https://docs.cloud.google.com/billing/docs/how-to/budgets)
