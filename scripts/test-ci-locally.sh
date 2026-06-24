#!/bin/bash
# test-ci-locally.sh

echo "========================================="
echo "1. Testing Secrets Scan (Gitleaks)"
echo "========================================="
# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo "gitleaks could not be found. Please install it (e.g. brew install gitleaks)"
    exit 1
fi

# The CI scans the commits in the PR. To simulate this, we scan the history.
# We will just scan the entire history like the CI does on 'fetch-depth: 0'
# If this returns 0 leaks, then our config is working locally.
gitleaks detect -v
if [ $? -eq 0 ]; then
    echo "✅ Gitleaks passed locally."
else
    echo "❌ Gitleaks failed locally."
fi

echo ""
echo "========================================="
echo "2. Testing E2E Database & Build"
echo "========================================="
# Set up CI-like environment variables
export CI=true
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dummy_public_key_for_testing"
export CLERK_SECRET_KEY="dummy_secret_key_placeholder"
export NEXT_PUBLIC_APP_URL="http://localhost:3005"
export PLAYWRIGHT_PORT=3005

# Note: To fully test db:migrate, you need a fresh Postgres database running locally.
# If you don't have one running, this part might fail connecting to localhost:5432.
# You can start one using Docker: 
# docker run --name ci-db -e POSTGRES_USER=ci -e POSTGRES_PASSWORD=ci -e POSTGRES_DB=ci -p 5432:5432 -d postgres:15

export DATABASE_URL="postgresql://ci:ci@localhost:5432/ci"

# Simulate the CI Steps:
echo "-> Creating 'service_role' (simulating what we added to CI)"
psql "$DATABASE_URL" -c "CREATE ROLE service_role NOLOGIN;" || echo "Warning: Could not create role (is DB running?)"

echo "-> Running db:migrate"
pnpm run db:migrate
if [ $? -ne 0 ]; then
    echo "❌ db:migrate failed!"
fi

echo "-> Running build"
pnpm run build
if [ $? -ne 0 ]; then
    echo "❌ build failed!"
fi

echo "-> Running E2E tests"
pnpm run test:e2e
if [ $? -ne 0 ]; then
    echo "❌ E2E tests failed!"
else
    echo "✅ E2E tests passed locally!"
fi

echo ""
echo "========================================="
echo "3. Testing CodeQL"
echo "========================================="
echo "CodeQL is a GitHub-specific static analysis tool."
echo "Since it found 4 high severity alerts, we can check for them using our local linter or by reviewing the GitHub Actions 'Security' tab."
echo "Run 'pnpm run lint' to see if ESLint catches any of them locally."
pnpm run lint
