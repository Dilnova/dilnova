# Gitleaks — Official Reference

> **Used for**: Secret scanning in CI
> **Official docs**: https://github.com/gitleaks/gitleaks

---

## Key Docs Links

| Topic             | URL                                                  |
| ----------------- | ---------------------------------------------------- |
| GitHub Repository | https://github.com/gitleaks/gitleaks                 |
| Installation      | https://github.com/gitleaks/gitleaks#getting-started |
| Configuration     | https://github.com/gitleaks/gitleaks#configuration   |
| GitHub Action     | https://github.com/gitleaks/gitleaks-action          |
| Allowlisting      | https://github.com/gitleaks/gitleaks#configuration   |

---

## How Dilnova Uses Gitleaks

- **CI Integration**: Runs on every push/PR via a pinned raw Docker image (`zricethezav/gitleaks@sha256:b109bc5f8f76a38196a3e413704fc5b9e3c32360bce4e4b603bd6f45b3721dbb`)
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
  run: docker run -v ${{ github.workspace }}:/src zricethezav/gitleaks@sha256:b109bc5f8f76a38196a3e413704fc5b9e3c32360bce4e4b603bd6f45b3721dbb detect --source /src -v
```
