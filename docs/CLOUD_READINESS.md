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
| Billing | Billing enabled | Budget-alert query returned HTTP 403. Alert existence and delivery remain unknown. |
| Receipt API | Function active; uses the project's default Compute service account | Review effective permissions and plan a dedicated least-privilege runtime account. The account name alone does not prove excessive access. |
| Receipt maintenance | Enabled hourly; last attempt `2026-11-22T18:07:02.585045Z`, status code `0` | This reports a successful invocation, not proof that every retained copy has expired. Verify actual cleanup separately. |
| Authentication privacy | Configuration query returned HTTP 403 | Email enumeration protection remains unknown. Identify the denial before changing roles, scopes or APIs. |

The original report described 403s as requiring owner permission. The status alone
does not distinguish missing IAM permission, disabled APIs, token scopes or a quota
project requirement. The updated report includes only allowlisted Google error
reason codes and API service names. It still omits raw error messages, access
tokens and arbitrary metadata. Unknown diagnostics stay omitted; an omitted reason
does not prove a particular cause.

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
- [ ] Resolve budget-alert and Auth-privacy 403s using the updated read-only report. Do not grant broad roles or enable APIs based on the status alone.
- [ ] Choose an alert amount/currency with the owner, confirm recipients and verify notification delivery. Alerts do not cap charges.
- [ ] Review inherited IAM and existing object ACLs; verify actual receipt cleanup and retained-copy expiry.

Managed Firestore snapshots in the same project are a first recovery layer. They
do not complete independent recovery of the whole app or protect against every
project/account-loss scenario. Keep the full backup/restore roadmap gate open.

Official references checked November 22, 2026:

- [Scheduled backups and restores](https://firebase.google.com/docs/firestore/backups)
- [Create a backup schedule with gcloud](https://docs.cloud.google.com/sdk/gcloud/reference/firestore/backups/schedules/create)
- [Database backup and restore pricing](https://firebase.google.com/docs/firestore/pricing#backup_data_and_restore_operations)
