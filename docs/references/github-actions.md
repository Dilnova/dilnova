# GitHub Actions — Official Reference

> **Official docs**: https://docs.github.com/en/actions

---

## Key Docs Links

| Topic                         | URL                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Getting Started               | https://docs.github.com/en/actions/learn-github-actions                                                              |
| Workflow Syntax               | https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions                                |
| Events that Trigger Workflows | https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows                                     |
| Expressions                   | https://docs.github.com/en/actions/learn-github-actions/expressions                                                  |
| Contexts                      | https://docs.github.com/en/actions/learn-github-actions/contexts                                                     |
| Environment Variables         | https://docs.github.com/en/actions/learn-github-actions/variables                                                    |
| Secrets                       | https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions                                   |
| Service Containers            | https://docs.github.com/en/actions/using-containerized-services/about-service-containers                             |
| Caching Dependencies          | https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows                        |
| GitHub Dependabot             | https://docs.github.com/en/code-security/dependabot                                                                  |
| CodeQL Analysis               | https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql |

---

## Dilnova CI/CD Workflows

### `.github/workflows/ci.yml`

| Job              | Steps                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **validate**     | Checkout → Install pnpm → Setup Node 20 → Install deps → Audit → Lint → TypeScript check → Verify migrations → Unit tests → Production build |
| **secrets-scan** | Checkout → Gitleaks scan                                                                                                                     |
| **e2e**          | Checkout → Install pnpm → Setup Node 20 → Install deps → Run DB migrations (Postgres service) → Install Playwright → Run E2E tests           |

### `.github/workflows/codeql.yml`

- GitHub CodeQL static analysis for security vulnerabilities

### `.github/dependabot.yml`

- Automated dependency update PRs

### Key Actions Used

| Action                        | Purpose                    |
| ----------------------------- | -------------------------- |
| `actions/checkout@v4`         | Clone repository           |
| `pnpm/action-setup@v4`        | Install pnpm               |
| `actions/setup-node@v4`       | Setup Node.js with caching |
| `gitleaks/gitleaks-action@v2` | Secrets scanning           |
