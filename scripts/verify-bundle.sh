#!/bin/bash
# scripts/verify-bundle.sh
# Post-build verification: hard-fail if forbidden Safari 12-incompatible patterns found in bundle
# Run automatically via: npm run build (chained after rollup)
# Run standalone: bash scripts/verify-bundle.sh

set -e
set -u

BUNDLE="dist/calendar-card-pro.js"
FAIL=0

# Skip if production bundle doesn't exist (e.g., dev build)
if [ ! -f "$BUNDLE" ]; then
  echo "=== verify-bundle: $BUNDLE not found, skipping (dev build?) ==="
  exit 0
fi

echo "=== Post-build bundle verification ==="
echo "Bundle: $BUNDLE"

# 1. Optional chaining — esbuild safari12 target should downlevel all occurrences
if grep -qP '\?\.' "$BUNDLE" 2>/dev/null; then
  echo "FAIL: Optional chaining (?.) found in bundle — esbuild target may not be safari12"
  FAIL=1
else
  echo "PASS: No optional chaining (?.)"
fi

# 2. Nullish coalescing — exclude ??= (nullish assignment) and ??? edge cases
if grep -qP '[^?]\?\?[^?=]' "$BUNDLE" 2>/dev/null; then
  echo "FAIL: Nullish coalescing (??) found in bundle — esbuild target may not be safari12"
  FAIL=1
else
  echo "PASS: No nullish coalescing (??)"
fi

# 3. Private class fields — detect actual syntax: access (e.#field) or declaration ({ #field, ; #field)
# Excluded false positives: CSS hex colors (#f44336) and URL anchors (#static-link) which are inside strings
# Pattern 1: .#identifier — private field access via property notation
# Pattern 2: [{ ;]#[a-zA-Z_$] — private field declaration in class body
if grep -qP '\.(#[a-zA-Z_$])' "$BUNDLE" 2>/dev/null || grep -qP '[{;]\s*#[a-zA-Z_$]' "$BUNDLE" 2>/dev/null; then
  echo "FAIL: Private class fields (#field) found in bundle — Lit 3 may still be in the bundle"
  FAIL=1
else
  echo "PASS: No private class fields (#field)"
fi

# 4. Unicode property escapes — esbuild never transforms these; must be fixed in source
if grep -qF '\p{' "$BUNDLE" 2>/dev/null; then
  echo "FAIL: Unicode property escapes (\\p{...}) found in bundle — fix in source required"
  FAIL=1
else
  echo "PASS: No Unicode property escapes (\\p{...})"
fi

# 5. Bundle size check
ACTUAL_SIZE_KB=$(du -k "$BUNDLE" | cut -f1)
MAX_SIZE_KB=312  # Calibrated: first successful build was 260KB; ceiling = ceil(260 * 1.2) = 312KB
if [ "$MAX_SIZE_KB" -eq 9999 ]; then
  echo "INFO: Bundle size: ${ACTUAL_SIZE_KB}KB (size ceiling not yet calibrated — update MAX_SIZE_KB after first build)"
elif [ "$ACTUAL_SIZE_KB" -gt "$MAX_SIZE_KB" ]; then
  echo "FAIL: Bundle size ${ACTUAL_SIZE_KB}KB exceeds ceiling ${MAX_SIZE_KB}KB"
  FAIL=1
else
  echo "PASS: Bundle size ${ACTUAL_SIZE_KB}KB within ceiling ${MAX_SIZE_KB}KB"
fi

echo "======================================="
if [ "$FAIL" -eq 0 ]; then
  echo "RESULT: All checks passed — bundle is Safari 12 compatible (syntax)"
  exit 0
else
  echo "RESULT: Bundle verification FAILED — do not deploy to iOS 12"
  exit 1
fi
