import fs from "node:fs";
import path from "node:path";

function findGitDir(startDir) {
  let current = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(current, ".git");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

const gitDir = findGitDir(process.cwd());
if (!gitDir) {
  console.log(
    ".git directory not found (searched up to 5 parent directories), skipping git hook installation.",
  );
  process.exit(0);
}

// If .git is a file (e.g. in a worktree or git submodule), we resolve the real git dir path
let hooksDir = path.join(gitDir, "hooks");
try {
  // Directly attempt to read to avoid TOCTOU (Time-of-check to time-of-use) race condition.
  // If gitDir is a directory, readFileSync will throw an EISDIR error which is safely caught.
  const content = fs.readFileSync(gitDir, "utf8");
  const match = content.match(/^gitdir:\s*(.+)$/m);
  if (match && match[1]) {
    const gitRefPath = match[1].trim();
    const resolvedGitDir = path.isAbsolute(gitRefPath)
      ? gitRefPath
      : path.resolve(path.dirname(gitDir), gitRefPath);
    hooksDir = path.join(resolvedGitDir, "hooks");
  }
} catch (e) {
  // Fall back to standard gitDir/hooks if resolution fails
}

if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

const hookPath = path.join(hooksDir, "pre-commit");
const hookSource = `#!/bin/sh
# Gitleaks pre-commit hook to scan for secrets

if command -v gitleaks >/dev/null 2>&1; then
  echo "Running local gitleaks secret scanning..."
  gitleaks protect --staged --verbose
  if [ $? -ne 0 ]; then
    echo "Error: Gitleaks detected secrets in your staged changes. Commit aborted."
    exit 1
  fi
else
  echo "Warning: gitleaks is not installed on your system. Please install it to scan for secrets before committing."
  echo "Installation guide: https://github.com/gitleaks/gitleaks"
fi
`;

try {
  fs.writeFileSync(hookPath, hookSource, { mode: 0o755 });
  fs.chmodSync(hookPath, 0o755);
  console.log(`Successfully installed gitleaks pre-commit hook to ${hookPath}`);
} catch (error) {
  console.error("Failed to install git pre-commit hook:", error);
}

const commitMsgHookPath = path.join(hooksDir, "commit-msg");
const commitMsgHookSource = `#!/bin/sh
# Conventional Commits commit-msg hook

msg=$(cat "$1")
pattern="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\([a-z0-9-]+\\))?!?: .+"

if ! echo "$msg" | grep -qE "$pattern"; then
  echo "Error: Invalid commit message format."
  echo "Commit messages must follow the Conventional Commits specification:"
  echo "  <type>[optional scope]: <description>"
  echo ""
  echo "Examples:"
  echo "  feat(catalog): add product search filter"
  echo "  fix(auth): resolve session expiration bug"
  echo "  docs: update API documentation"
  exit 1
fi
`;

try {
  fs.writeFileSync(commitMsgHookPath, commitMsgHookSource, { mode: 0o755 });
  fs.chmodSync(commitMsgHookPath, 0o755);
  console.log(`Successfully installed conventional commit-msg hook to ${commitMsgHookPath}`);
} catch (error) {
  console.error("Failed to install git commit-msg hook:", error);
}
