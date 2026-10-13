# Security Check Script for Tesla Pulse Project (PowerShell)
# Run this to verify no secrets are exposed

Write-Host "🔍 Tesla Pulse - Security Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$Errors = 0

# Check 1: Git history
Write-Host "✓ Checking Git history..." -ForegroundColor Yellow
$CommitCount = (git log --oneline | Measure-Object).Count
if ($CommitCount -eq 1) {
    Write-Host "  ✅ Clean history (1 commit only)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Multiple commits found ($CommitCount)" -ForegroundColor Yellow
    $Errors++
}

# Check 2: Look for exposed secrets
Write-Host ""
Write-Host "✓ Scanning for exposed secrets..." -ForegroundColor Yellow

# Check for Firebase API keys
$FirebaseKeys = Select-String -Path . -Pattern "AIzaSy" -Recurse -Exclude *.example,*node_modules* -ErrorAction SilentlyContinue | Where-Object { $_.Line -notmatch "YOUR_" }
if ($FirebaseKeys) {
    Write-Host "  ❌ Firebase API key found in code!" -ForegroundColor Red
    $FirebaseKeys | ForEach-Object { Write-Host "     $($_.Path):$($_.LineNumber)" -ForegroundColor DarkRed }
    $Errors++
} else {
    Write-Host "  ✅ No Firebase API keys found" -ForegroundColor Green
}

# Check for WiFi passwords
$WiFiPasswords = Select-String -Path . -Pattern "Bansal" -Recurse -Exclude *node_modules* -ErrorAction SilentlyContinue
if ($WiFiPasswords) {
    Write-Host "  ❌ WiFi password found in code!" -ForegroundColor Red
    $Errors++
} else {
    Write-Host "  ✅ No WiFi passwords found" -ForegroundColor Green
}

# Check for Telegram tokens
$TelegramTokens = Select-String -Path . -Pattern "8848176047|AAEX1gTH" -Recurse -Exclude *node_modules* -ErrorAction SilentlyContinue
if ($TelegramTokens) {
    Write-Host "  ❌ Telegram bot token found in code!" -ForegroundColor Red
    $Errors++
} else {
    Write-Host "  ✅ No Telegram bot tokens found" -ForegroundColor Green
}

# Check 3: .env files
Write-Host ""
Write-Host "✓ Checking .env file protection..." -ForegroundColor Yellow

try {
    git check-ignore tesla-pulse/.env 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ tesla-pulse/.env is in .gitignore" -ForegroundColor Green
    } else {
        Write-Host "  ❌ tesla-pulse/.env NOT in .gitignore!" -ForegroundColor Red
        $Errors++
    }
} catch {
    Write-Host "  ⚠️  Could not check .env status" -ForegroundColor Yellow
}

try {
    git check-ignore functions/.env.local 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ functions/.env.local is in .gitignore" -ForegroundColor Green
    } else {
        Write-Host "  ❌ functions/.env.local NOT in .gitignore!" -ForegroundColor Red
        $Errors++
    }
} catch {
    Write-Host "  ⚠️  Could not check .env.local status" -ForegroundColor Yellow
}

# Check 4: Example files exist
Write-Host ""
Write-Host "✓ Checking example files..." -ForegroundColor Yellow
if (Test-Path "tesla-pulse/.env.example") {
    Write-Host "  ✅ .env.example exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  .env.example not found" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
if ($Errors -eq 0) {
    Write-Host "✅ All security checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Rotate Telegram bot token via @BotFather"
    Write-Host "2. Change WiFi password (if it was your main network)"
    Write-Host "3. Check Firebase security rules"
    Write-Host ""
    Write-Host "See SECURITY-ACTION-REQUIRED.md for details" -ForegroundColor Yellow
} else {
    Write-Host "❌ $Errors security issue(s) found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the issues above before pushing to GitHub" -ForegroundColor Yellow
}

exit $Errors
