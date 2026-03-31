#!/bin/bash
# setup-secrets.sh
# Run this locally ONCE to prepare everything for GitHub secrets
# Usage: bash setup-secrets.sh

set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   JobAgent — GitHub Secrets Setup Helper     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 1: Save LinkedIn session ──────────────────────────────────────────────
echo "► Step 1: Saving LinkedIn session..."
echo "  This opens a browser. Log in to LinkedIn, then close the window."
echo ""
node src/saveSession.js

echo ""
echo "► Step 2: Encoding files for GitHub secrets..."

# Encode session.json
SESSION=$(cat data/session.json | base64 | tr -d '\n')
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECRET NAME:  LINKEDIN_SESSION"
echo "SECRET VALUE: (copied to clipboard)"
echo "$SESSION" | pbcopy 2>/dev/null || echo "$SESSION" | xclip -selection clipboard 2>/dev/null || true
echo "  → If clipboard didn't work, run:  cat data/session.json | base64"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Encode resume PDF
echo ""
RESUME=$(base64 -i data/Monil_Baxi_2026_Final.pdf | tr -d '\n')
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECRET NAME:  RESUME_PDF_BASE64"
echo "  → Run:  base64 -i data/Monil_Baxi_2026_Final.pdf | pbcopy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "► Step 3: Add these secrets to GitHub:"
echo ""
echo "  Go to: https://github.com/YOUR_USERNAME/job-agent/settings/secrets/actions"
echo ""
echo "  Add each of these secrets:"
echo "  ┌─────────────────────┬──────────────────────────────────┐"
echo "  │ Secret name         │ Value                            │"
echo "  ├─────────────────────┼──────────────────────────────────┤"
echo "  │ LINKEDIN_EMAIL      │ monilbaxi@gmail.com              │"
echo "  │ LINKEDIN_PASSWORD   │ your LinkedIn password           │"
echo "  │ LINKEDIN_SESSION    │ (from step above)                │"
echo "  │ RESUME_PDF_BASE64   │ (base64 of your PDF)             │"
echo "  │ ANTHROPIC_API_KEY   │ sk-ant-...                       │"
echo "  └─────────────────────┴──────────────────────────────────┘"
echo ""
echo "► Step 4: Push to GitHub and the agent runs automatically!"
echo "  git add . && git commit -m 'init job agent' && git push"
echo ""
echo "  Manual trigger: GitHub → Actions → Job Agent → Run workflow"
echo ""
echo "✅ Setup complete!"
