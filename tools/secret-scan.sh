#!/usr/bin/env bash
# Fails if anything that looks like a secret or a machine-specific/personal file is in the repo.
# Runs in CI on every push and pull request; run it locally before committing too.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo "$(dirname "$0")/..")"
files() { if git rev-parse --git-dir >/dev/null 2>&1; then git ls-files; else find . -type f -not -path './.git/*' | sed 's|^\./||'; fi; }
fail=0
report() { echo "::error::$1"; fail=1; }

# 1) files that should never be committed
while IFS= read -r f; do
  case "$f" in
    *.env|.env|.env.*|*/.env|*/.env.*|*.pem|*.key|*.pfx|*.p12|id_rsa*|*/id_rsa*|id_ed25519*|settings.json|*/settings.json)
      report "sensitive-looking file is tracked: $f";;
  esac
done < <(files)

# 2) token formats (everywhere, including vendored code)
strict='-----BEGIN ([A-Z]+ )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|xox[abprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|-----BEGIN PGP PRIVATE'
if files | grep -v -E '\.(png|ico|syso|jpg|gif)$' | xargs -d '\n' grep -nIE "$strict" 2>/dev/null; then report "token-like string found (see above)"; fi

# 3) assignments of credentials and personal paths in our own code (vendored libraries excluded)
generic='(api[_-]?key|secret|passwd|password|access[_-]?token|client[_-]?secret)["'"'"']?\s*[:=]\s*["'"'"'][^"'"'"' ]{8,}|[A-Za-z]:\\\\Users\\\\[A-Za-z]|/home/[a-z][a-z0-9_-]+/|/Users/[A-Za-z][A-Za-z0-9_-]+/'
if files | grep -v '^third_party/' | grep -v -E '\.(png|ico|syso|jpg|gif)$' | grep -v '^tools/secret-scan.sh$' | xargs -d '\n' grep -nIE "$generic" 2>/dev/null; then report "credential or personal path found (see above)"; fi

if [ "$fail" = 0 ]; then echo "secret scan: clean ($(files | wc -l) files checked)"; fi
exit $fail
