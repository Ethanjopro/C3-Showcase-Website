#!/bin/bash
# Cloud sessions only: install project dependencies and the Playwright browser
# that matches the project's Playwright version. Local sessions skip this.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -f package.json ] || exit 0   # nothing scaffolded yet

LOG=/tmp/c3-session-start.log

if [ ! -d node_modules ]; then
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund >"$LOG" 2>&1
  else
    npm install --no-audit --no-fund >"$LOG" 2>&1
  fi || echo "npm install failed; see $LOG"
fi

# No-op when the matching browser is already cached by the setup script.
if [ -d node_modules/playwright ] || [ -d node_modules/@playwright/test ]; then
  npx playwright install chromium >>"$LOG" 2>&1 \
    || echo "Playwright browser download failed: allow cdn.playwright.dev in this cloud environment's network settings."
fi

exit 0
