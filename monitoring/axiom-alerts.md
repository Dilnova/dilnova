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

## 4. WAF Configuration Modified

Detects changes to the Vercel Web Application Firewall (WAF) or firewall rules that might weaken security posture.

```kusto
['vercel']
| where source == "external" or source == "audit"
| where message contains "firewall" or message contains "waf"
| where action == "update" or action == "delete" or action == "disable"
```

**Monitor Threshold:** Trigger when results > 0. Route directly to #alerts-critical in Slack.

## 5. Failed Authentication & Brute Force (>5 failures in 5m)

Detects credential stuffing or brute-force login attempts against user accounts.

```kusto
['vercel']
| where message startswith "Audit log created"
| where action == "AUTH_FAILED" or action == "ACCOUNT_LOCKED"
| extend userId = tostring(metadata.userId)
| summarize FailCount = count() by userId, bin(_time, 5m)
| where FailCount > 5
```

**Monitor Threshold:** Trigger when results > 0. Route directly to #alerts-security in Slack.

## 6. Customer Order Volume Spike (>10 orders in 10m)

Detects a single customer placing an unusually high volume of orders in a short window (fraud or compromised customer account).

```kusto
['vercel']
| where message startswith "Audit log created"
| where action == "ORDER_PLACED"
| extend customerId = tostring(metadata.userId)
| summarize OrderCount = count() by customerId, bin(_time, 10m)
| where OrderCount > 10
```

**Monitor Threshold:** Trigger when results > 0. Route to #alerts-fraud in Slack.

## 7. Checkout & Payment Error Spike / Carding Detection (>20 errors in 5m)

Detects spikes in checkout or payment failures which may indicate automated carding attempts validating stolen payment methods.

```kusto
['vercel']
| where level == "error"
| where message contains "Checkout" or message contains "payment"
| summarize ErrorCount = count() by bin(_time, 5m)
| where ErrorCount > 20
```

**Monitor Threshold:** Trigger when results > 0. Route directly to #alerts-security in Slack.
