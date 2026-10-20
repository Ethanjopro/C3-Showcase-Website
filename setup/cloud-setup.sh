#!/bin/bash
# Paste this into your cloud environment's "Setup script" field at claude.ai/code.
#
# Network access for that environment: choose "Custom", keep
# "Also include default list of common package managers" checked, and add:
#   cdn.playwright.dev
#   playwright.download.prss.microsoft.com
#
# What it does: installs a Chromium build plus its system libraries so Claude can
# screenshot the site (npm run shots) and drive it with /verify. The result is
# cached with the environment, so later sessions skip this step.
set -x
npx -y playwright@latest install --with-deps chromium || true
