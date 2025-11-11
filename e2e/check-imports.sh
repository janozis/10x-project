#!/bin/bash
# Check which test files use old imports (without auto-cleanup)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Checking E2E test imports..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

OLD_IMPORTS=$(grep -l 'from "@playwright/test"' e2e/*.spec.ts 2>/dev/null)
NEW_IMPORTS=$(grep -l 'from "./fixtures"' e2e/*.spec.ts 2>/dev/null)

if [ -z "$OLD_IMPORTS" ]; then
  echo "✅ All test files use new fixtures (with auto-cleanup)!"
  echo ""
  echo "Files using fixtures:"
  echo "$NEW_IMPORTS" | while read file; do
    echo "  ✓ $file"
  done
else
  echo "⚠️  Some test files still use old imports (NO auto-cleanup):"
  echo ""
  echo "$OLD_IMPORTS" | while read file; do
    echo "  ❌ $file"
  done
  echo ""
  echo "To fix, change the import in these files:"
  echo "  from \"@playwright/test\""
  echo "  to"
  echo "  from \"./fixtures\""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

