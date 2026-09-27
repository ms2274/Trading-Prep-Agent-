#!/bin/bash
# This is Contents/MacOS/launcher inside "Trading Prep.app" — it's what runs
# when you click the app icon. It does NOT open a Terminal window.
# build-app.sh replaces PROJECT_DIR_PLACEHOLDER with the real project path.

PROJECT_DIR="PROJECT_DIR_PLACEHOLDER"
URL="http://127.0.0.1:3000"
SERVICE_PLIST="$HOME/Library/LaunchAgents/com.tradingprep.server.plist"

# Apps opened from the Dock get a bare PATH that doesn't include Homebrew/nvm,
# so npm wouldn't be found without this.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
if [ -d "$HOME/.nvm/versions/node" ]; then
  NVM_BIN=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)
  if [ -n "$NVM_BIN" ]; then
    export PATH="$NVM_BIN:$PATH"
  fi
fi

open_window() {
  # Prefer a chromeless "app mode" window over a normal browser tab, if a
  # Chromium-based browser is installed; otherwise a normal tab.
  for app in "Google Chrome" "Microsoft Edge" "Brave Browser" "Chromium"; do
    if osascript -e "id of application \"$app\"" >/dev/null 2>&1; then
      open -na "$app" --args --app="$URL" --new-window
      return 0
    fi
  done
  open "$URL"
}

if curl -sf "$URL" > /dev/null 2>&1; then
  open_window
  exit 0
fi

# Server isn't answering. If the background service is installed, restart it;
# otherwise start a dev server directly (output goes to a log, no Terminal).
if [ -f "$SERVICE_PLIST" ]; then
  launchctl kickstart -k "gui/$(id -u)/com.tradingprep.server" 2>/dev/null
  LOG_HINT="scripts/service/server.log"
else
  cd "$PROJECT_DIR" || {
    osascript -e "display alert \"Trading Prep\" message \"Could not find the project folder at $PROJECT_DIR.\""
    exit 1
  }
  nohup npm run dev -- -p 3000 -H 127.0.0.1 >> "$PROJECT_DIR/scripts/app/launcher.log" 2>&1 &
  LOG_HINT="scripts/app/launcher.log"
fi

COUNT=0
until curl -sf "$URL" > /dev/null 2>&1; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -gt 60 ]; then
    osascript -e "display alert \"Trading Prep\" message \"The server did not start within 60 seconds. Check $LOG_HINT in the project folder.\""
    exit 1
  fi
done

open_window
