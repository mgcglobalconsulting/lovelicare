#!/usr/bin/env bash
#
# Builds a clean, shareable copy of this project for the business owner.
#
#   ./scripts/prepare-handoff.sh [target-dir]       (default: ../lovelicare-handoff)
#
# Exports to a NEW directory rather than re-initialising this one, so your own
# git history, your Vercel link (.vercel/) and your local .env stay intact.
# The copy gets a fresh git history with a single commit and no remote.
#
# It refuses to finish if any credential pattern is found in the output.

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-$(dirname "$SRC")/lovelicare-handoff}"

cyan()  { printf '\033[36m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*"; }

[ -f "$SRC/package.json" ] || { red "✗ $SRC does not look like the project root."; exit 1; }

if [ -e "$DEST" ]; then
  red "✗ $DEST already exists. Remove it or pass a different path."
  exit 1
fi

cyan "→ Exporting to $DEST"
mkdir -p "$DEST"

# ── What ships ──────────────────────────────────────────────────────────────
# Application code and assets only. Everything personal, generated, or
# internal to the agency is excluded by omission rather than by deletion.
RSYNC_EXCLUDES=(
  # never transfer: secrets, local state, personal tooling
  --exclude '.git'            --exclude '.env'          --exclude '.env.local'
  --exclude '.vercel'         --exclude '.claude'       --exclude '.obsidian'
  --exclude '.superpowers'    --exclude '.DS_Store'     --exclude 'node_modules'
  # generated or oversized
  --exclude '_originals'      --exclude 'site-content.md'
  # internal working notes — not the owner's concern
  --exclude 'docs/PICKUP.md'        --exclude 'docs/SESSION-HANDOFF.md'
  --exclude 'docs/CLAUDE-CLI-BRIEF.md' --exclude 'docs/cloud.md'
  --exclude 'docs/NEXT-SESSION-PLAN.md'
  # agency deliverables and tooling, not site code
  --exclude 'docs/VIDEO-PROMPTS.md' --exclude 'public/typography.html'
  --exclude 'scripts/prepare-handoff.sh'
  # QA harness: hardcodes local paths and a dev port, so it would only confuse
  --exclude 'docs/testing'
)

rsync -a "${RSYNC_EXCLUDES[@]}" "$SRC/" "$DEST/"

# ── Required files must be present ──────────────────────────────────────────
# These are untracked in the source repo but the app cannot run without them.
cyan "→ Verifying required files"
MISSING=0
for f in server.js package.json vercel.json lib/supabase.js \
         supabase/migrations/0001_contact_and_subscribers.sql \
         public/index.html public/assets/js/liquid-glass.js \
         public/assets/css/liquid-glass.css .env.example; do
  if [ ! -f "$DEST/$f" ]; then red "   missing: $f"; MISSING=1; fi
done
[ "$MISSING" -eq 0 ] || { red "✗ Required files are missing. Nothing was committed."; exit 1; }
green "   all required files present"

# ── Refuse to ship credentials ──────────────────────────────────────────────
cyan "→ Scanning for credentials"
# Match real key VALUES, not the words. A bare mention like "publishable key"
# in the owner's guide is documentation; a 40-character token is a leak.
PATTERN='sk_(live|test)_[A-Za-z0-9]{16,}|sb_(secret|publishable)_[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|eyJhbGciOiJIUzI1[A-Za-z0-9._-]{30,}'
# This script states the patterns it hunts for, so it must exempt itself.
SCAN_EXCLUDES=(--exclude-dir=node_modules --exclude-dir=.git --exclude=prepare-handoff.sh)
if grep -rIE "${SCAN_EXCLUDES[@]}" "$PATTERN" "$DEST" >/dev/null 2>&1; then
  red "✗ Credential-shaped strings found in the export:"
  grep -rIEn "${SCAN_EXCLUDES[@]}" "$PATTERN" "$DEST" | head -20
  red "  Aborting. Remove them, delete $DEST, and run this again."
  exit 1
fi
green "   clean — no credentials found"

# ── Fresh history, no remote ────────────────────────────────────────────────
cyan "→ Initialising a fresh git repository"
cd "$DEST"
git init -q -b main
git add -A
git -c user.name="LoveLi Care" -c user.email="lovelicaresvcs@gmail.com" \
    commit -q -m "LoveLi Care website — initial commit"

green ""
green "✓ Clean copy ready at: $DEST"
green ""
cat <<EOF
  Tracked files: $(git ls-files | wc -l | tr -d ' ')
  Remotes:       none (deliberately)

  To publish it to a fresh GitHub repo:

    cd "$DEST"
    gh repo create lovelicare-website --private --source=. --remote=origin --push

  Or, without the gh CLI — create an empty repo on github.com first, then:

    cd "$DEST"
    git remote add origin https://github.com/<OWNER>/<REPO>.git
    git push -u origin main

  Then send the owner docs/OWNER-DEPLOY.md.
EOF
