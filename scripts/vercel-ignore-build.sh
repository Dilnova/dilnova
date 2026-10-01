#!/usr/bin/env bash
set -e

# scripts/vercel-ignore-build.sh
# Gating script for Vercel builds triggered via Git commits.
#
# Production deployments are exclusively managed by GitHub Actions CI (.github/workflows/ci.yml)
# only AFTER all tests, linters, typechecks, and Playwright E2E suites have passed.
#
# Exit code 0 = SKIP build on Vercel
# Exit code 1 = PROCEED with build on Vercel

echo "=========================================================="
echo "🛡️  Dilnova Vercel Deployment Gating Evaluation"
echo "=========================================================="
echo "Commit Ref (Branch): ${VERCEL_GIT_COMMIT_REF:-unknown}"
echo "Environment:         ${VERCEL_ENV:-unknown}"
echo "----------------------------------------------------------"

# If the commit is pushed directly or merged to the production branch ('main'):
if [ "${VERCEL_GIT_COMMIT_REF}" = "main" ]; then
  echo "🛑 Auto-deployment on 'main' is blocked at the git level."
  echo "Production releases must be verified by the CI pipeline (test:e2e)."
  echo "GitHub Actions will build and deploy via Vercel CLI upon E2E verification."
  exit 0
fi

# Allow Preview deployments on feature/fix branches so PRs can be smoke-tested:
echo "✅ Non-production branch detected. Proceeding with Preview build."
exit 1
