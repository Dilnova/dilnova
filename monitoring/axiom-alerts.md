# Axiom Security Alerts

These Axiom Processing Language (APL) queries are designed to detect suspicious audit trail activity. Configure these as **Axiom Monitors** to trigger Slack/PagerDuty alerts.

## 1. High-Frequency Admin Actions (>10 per minute)
Detects potential compromised admin accounts or brute-force data modification.

```kusto
['vercel']
| where message startswith "Audit log created"
| extend userId = tostring(metadata.userId)
| summarize ActionCount = count() by userId, bin(_time, 1m)
| where ActionCount > 10
```
**Monitor Threshold:** Trigger when results > 0.

## 2. Superadmin Role Grants
Detects privilege escalation or unauthorized grants of the global `superadmin` role.

```kusto
['vercel']
| where message startswith "Audit log created"
| where message contains "superadmin" or tostring(metadata.role) == "superadmin" or tostring(metadata.updates.role) == "superadmin"
```
**Monitor Threshold:** Trigger when results > 0.

## 3. Bulk Data Access Patterns
Detects mass data extraction (like rapid or unauthorized GDPR exports).

```kusto
['vercel']
| where message startswith "Audit log created"
| where action == "GDPR_DSAR_EXPORT" or action == "API_GDPR_EXPORT"
```
**Monitor Threshold:** Trigger when results > 0 (or > 1 in a 5-minute window if some legitimate usage is expected).
