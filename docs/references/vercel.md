# Vercel — Official Reference

> **Official docs**: https://vercel.com/docs

---

## Key Docs Links

| Topic                 | URL                                                    |
| --------------------- | ------------------------------------------------------ |
| Getting Started       | https://vercel.com/docs/getting-started-with-vercel    |
| Deployments           | https://vercel.com/docs/deployments/overview           |
| Environment Variables | https://vercel.com/docs/projects/environment-variables |
| Domains               | https://vercel.com/docs/projects/domains               |
| Analytics             | https://vercel.com/docs/analytics                      |
| Speed Insights        | https://vercel.com/docs/speed-insights                 |
| Serverless Functions  | https://vercel.com/docs/functions/serverless-functions |
| Edge Functions        | https://vercel.com/docs/functions/edge-functions       |
| Log Drains            | https://vercel.com/docs/observability/log-drains       |
| Firewall / WAF        | https://vercel.com/docs/security                       |
| Cron Jobs             | https://vercel.com/docs/cron-jobs                      |
| CLI                   | https://vercel.com/docs/cli                            |
| Limits                | https://vercel.com/docs/limits/overview                |
| Dashboard             | https://vercel.com/dashboard                           |

---

## Dilnova Deployment Notes

- Deployed to **Vercel** with automatic Git deployments
- **Rollback**: Via Vercel Dashboard → Deployments → Promote previous deployment
- **Health check**: `GET https://www.dilstar.pp.ua/api/health`
- **Log Drain**: Should be configured for 90-day retention (see `PRODUCTION_RUNBOOK.md`)
- **WAF**: Configure rate limiting and OWASP rules (see `PRODUCTION_RUNBOOK.md`)

### Packages Used

| Package                         | Purpose                     |
| ------------------------------- | --------------------------- |
| `@vercel/analytics ^2.0.1`      | Page view and web analytics |
| `@vercel/speed-insights ^2.0.0` | Core Web Vitals monitoring  |
