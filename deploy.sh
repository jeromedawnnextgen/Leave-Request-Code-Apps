#!/bin/bash
set -e

GITHUB_REPO="https://github.com/jeromedawnnextgen/Leave-Request-Code-Apps.git"

# Locate pac — works whether or not it's on PATH yet
PAC=$(which pac 2>/dev/null || echo "/c/Users/jerom/AppData/Roaming/Code/User/globalStorage/microsoft-isvexptools.powerplatform-vscode/pac/tools/pac.exe")

echo ""
echo "================================================"
echo "  Leave Request App — Deploy"
echo "================================================"
echo ""

# ── 1. Build ─────────────────────────────────────────
echo "▶ Building..."
npm run build
echo "✓ Build complete"
echo ""

# ── 2. Power Platform ────────────────────────────────
echo "▶ Pushing to Power Platform..."
"$PAC" code push
echo "✓ Power Platform push complete"
echo ""

# ── 3. GitHub ────────────────────────────────────────
echo "▶ Pushing to GitHub..."

# Set remote (update if already exists)
if git remote | grep -q "^origin$"; then
  git remote set-url origin "$GITHUB_REPO"
else
  git remote add origin "$GITHUB_REPO"
fi

git branch -M main

# Stage everything except dist (built output shouldn't be in source control)
git add -A

# Commit with timestamp if there are staged changes
if git diff --cached --quiet; then
  echo "  No changes to commit — skipping commit"
else
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
  git commit -m "Deploy: $TIMESTAMP"
fi

git push -u origin main
echo "✓ GitHub push complete"

echo ""
echo "================================================"
echo "  Done!"
echo "================================================"
echo ""
