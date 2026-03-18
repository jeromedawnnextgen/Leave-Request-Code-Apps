$ErrorActionPreference = "Stop"

$GITHUB_REPO = "https://github.com/jeromedawnnextgen/Leave-Request-Code-Apps.git"

# Locate pac - works whether or not it is on PATH yet
$PAC = if (Get-Command pac -ErrorAction SilentlyContinue) { "pac" }
       else { "$env:APPDATA\Code\User\globalStorage\microsoft-isvexptools.powerplatform-vscode\pac\tools\pac.exe" }

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Leave Request App - Deploy" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build
Write-Host ">> Building..." -ForegroundColor Yellow
npm run build
Write-Host ">> Build complete" -ForegroundColor Green
Write-Host ""

# 2. Power Platform
Write-Host ">> Pushing to Power Platform..." -ForegroundColor Yellow
& $PAC code push
Write-Host ">> Power Platform push complete" -ForegroundColor Green
Write-Host ""

# 3. GitHub
Write-Host ">> Pushing to GitHub..." -ForegroundColor Yellow

$remotes = git remote
if ($remotes -contains "origin") {
    git remote set-url origin $GITHUB_REPO
} else {
    git remote add origin $GITHUB_REPO
}

git branch -M main
git add -A

$staged = git diff --cached --name-only
if ($staged) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "Deploy: $timestamp"
} else {
    Write-Host "  No changes to commit - skipping commit" -ForegroundColor Gray
}

git push -u origin main
Write-Host ">> GitHub push complete" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Done!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
