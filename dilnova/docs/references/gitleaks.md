# Gitleaks — Official Reference

> **Used for**: Secret scanning in CI
> **Official docs**: https://github.com/gitleaks/gitleaks

---

## Key Docs Links

| Topic | URL |
|---|---|
| GitHub Repository | https://github.com/gitleaks/gitleaks |
| Installation | https://github.com/gitleaks/gitleaks#getting-started |
| Configuration | https://github.com/gitleaks/gitleaks#configuration |
| GitHub Action | https://github.com/gitleaks/gitleaks-action |
| Allowlisting | https://github.com/gitleaks/gitleaks#configuration |

---

## How Dilnova Uses Gitleaks

- **CI Integration**: Runs on every push/PR via `gitleaks/gitleaks-action@v2`
- **Config file**: `.gitleaks.toml`
- **Allowlist**: `.env.example` is excluded (contains template secrets, not real ones)

### Configuration

```toml
# .gitleaks.toml
[allowlist]
description = "Global allowlist for files that contain example or template secrets"
paths = [
    '''^\.env\.example$'''
]
```

### CI Workflow

```yaml
# .github/workflows/ci.yml → secrets-scan job
- name: Gitleaks Secrets Scan
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
