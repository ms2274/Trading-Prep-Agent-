#!/bin/bash
# Invoked by launchd (com.tradingprep.server.plist) to run the production
# server in the background. Not meant to be run by hand day-to-day —
# use install-service.sh once, and update-and-rebuild.sh to update.
set -e

PROJECT_DIR="$HOME/Project-1"
cd "$PROJECT_DIR"

# launchd runs with a minimal environment (no shell PATH), so locate node/npm
# explicitly rather than assuming they're on PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
if [ -d "$HOME/.nvm/versions/node" ]; then
  NVM_BIN=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)
  if [ -n "$NVM_BIN" ]; then
    export PATH="$NVM_BIN:$PATH"
  fi
fi

# Clear a stuck port from a previous crash/run before (re)starting, same
# defensive logic as the old dev launcher — launchd's KeepAlive will restart
# this script if it dies, so a lingering process here would otherwise wedge
# every future restart.
for round in 1 2 3; do
  PIDS=$(lsof -ti:3000 -sTCP:LISTEN 2>/dev/null || true)
  if [ -z "$PIDS" ]; then break; fi
  if [ "$round" -lt 3 ]; then kill $PIDS 2>/dev/null || true; else kill -9 $PIDS 2>/dev/null || true; fi
  sleep 1
done

exec npm start -- -p 3000
