import fs from 'node:fs';
import path from 'node:path';

function findGitDir(startDir) {
  let current = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(current, '.git');
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
  console.log('.git directory not found (searched up to 5 parent directories), skipping git hook installation.');
  process.exit(0);
}

// If .git is a file (e.g. in a worktree or git submodule), we resolve the real git dir path
let hooksDir = path.join(gitDir, 'hooks');
try {
  const stat = fs.statSync(gitDir);
  if (stat.isFile()) {
    const content = fs.readFileSync(gitDir, 'utf8');
    const match = content.match(/^gitdir:\s*(.+)$/m);
    if (match && match[1]) {
      const gitRefPath = match[1].trim();
      const resolvedGitDir = path.isAbsolute(gitRefPath) 
        ? gitRefPath 
        : path.resolve(path.dirname(gitDir), gitRefPath);
      hooksDir = path.join(resolvedGitDir, 'hooks');
    }
  }
} catch (e) {
  // Fall back to standard gitDir/hooks if resolution fails
}

if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

const hookPath = path.join(hooksDir, 'pre-commit');
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
  // Ensure correct permission is set even if writeFileSync mode isn't fully applied by OS
  fs.chmodSync(hookPath, 0o755);
  console.log(`Successfully installed gitleaks pre-commit hook to ${hookPath}`);
} catch (error) {
  console.error('Failed to install git pre-commit hook:', error);
}
