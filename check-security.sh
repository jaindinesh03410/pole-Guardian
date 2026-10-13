#!/bin/bash
# Security Check Script for Tesla Pulse Project
# Run this to verify no secrets are exposed

echo "🔍 Tesla Pulse - Security Check"
echo "================================"
echo ""

ERRORS=0

# Check 1: Git history
echo "✓ Checking Git history..."
COMMIT_COUNT=$(git log --oneline | wc -l)
if [ "$COMMIT_COUNT" -eq 1 ]; then
    echo "  ✅ Clean history (1 commit only)"
else
    echo "  ⚠️  Multiple commits found ($COMMIT_COUNT)"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Look for exposed secrets
echo ""
echo "✓ Scanning for exposed secrets..."

if grep -r "AIzaSy" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -v ".example" | grep -v "YOUR_"; then
    echo "  ❌ Firebase API key found in code!"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No Firebase API keys found"
fi

if grep -r "Bansal" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null; then
    echo "  ❌ WiFi password found in code!"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No WiFi passwords found"
fi

if grep -r "8848176047\|AAEX1gTH" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null; then
    echo "  ❌ Telegram bot token found in code!"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ No Telegram bot tokens found"
fi

# Check 3: .env files
echo ""
echo "✓ Checking .env file protection..."
if git check-ignore tesla-pulse/.env >/dev/null 2>&1; then
    echo "  ✅ tesla-pulse/.env is in .gitignore"
else
    echo "  ❌ tesla-pulse/.env NOT in .gitignore!"
    ERRORS=$((ERRORS + 1))
fi

if git check-ignore functions/.env.local >/dev/null 2>&1; then
    echo "  ✅ functions/.env.local is in .gitignore"
else
    echo "  ❌ functions/.env.local NOT in .gitignore!"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: Example files exist
echo ""
echo "✓ Checking example files..."
if [ -f "tesla-pulse/.env.example" ]; then
    echo "  ✅ .env.example exists"
else
    echo "  ⚠️  .env.example not found"
fi

# Summary
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All security checks passed!"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Rotate Telegram bot token via @BotFather"
    echo "2. Change WiFi password (if it was your main network)"
    echo "3. Check Firebase security rules"
    echo ""
    echo "See SECURITY-ACTION-REQUIRED.md for details"
else
    echo "❌ $ERRORS security issue(s) found!"
    echo ""
    echo "Please fix the issues above before pushing to GitHub"
fi

exit $ERRORS
