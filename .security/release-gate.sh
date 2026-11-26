#!/usr/bin/env bash
# Security baseline: execute from a complete, trusted clone using bash.
# This read-only gate does not deploy, install dependencies, or access production.
# Required: git, an independently verified modern Gitleaks CLI, and npm for npm lockfiles.
# All failures (including missing tools) block release.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
if [ "$(git rev-parse --is-shallow-repository)" != false ]; then
  echo "NO-GO: full Git history required" >&2
  exit 1
fi
if ! command -v gitleaks >/dev/null 2>&1; then
  echo "NO-GO: verified Gitleaks CLI required" >&2
  exit 1
fi
# Never print secret values. Use a trusted configuration and review exclusions.
gitleaks git --redact=100 --log-opts="--all" .
gitleaks dir --redact=100 .
if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
  command -v npm >/dev/null 2>&1 || { echo "NO-GO: npm required" >&2; exit 1; }
  npm audit --ignore-scripts --audit-level=high
elif [ -f package.json ]; then
  echo "NO-GO: JavaScript dependency audit requires review of the package manager and lockfile" >&2
  exit 1
fi
echo "Automated baseline passed; this is NOT production approval."
echo "All 18 checks, project-specific tests, live verification and owner approval remain mandatory."
