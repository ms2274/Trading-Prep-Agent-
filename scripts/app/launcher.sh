#!/bin/bash
# This is Contents/MacOS/launcher inside "Trading Prep.app" — it's what runs
# when you click the app icon in Dock/Launchpad/Applications. It does NOT
# open a Terminal window.

PROJECT_DIR="$HOME/Project-1"
URL="http://localhost:3000"

open_window() {
  # Prefer a chromeless "app mode" window over a normal browser tab, if a
  # Chromium-based browser is installed. Falls back to a normal tab in the
  # user's default browser otherwise.
  for app in "Google Chrome" "Microsoft Edge" "Brave Browser" "Chromium"; do
    if osascript -e "id of application \"$app\"" >/dev/null 2>&1; then
      open -na "$app" --args --app="$URL" --new-window
      return 0
    fi
  done
  open "$URL"
}

# Fast path: the background service (scripts/service/install-service.sh) is
# already running the server — just open the window.
if curl -sf "$URL" > /dev/null 2>&1; then
  open_window
  exit 0
fi

# Slow path: background service isn't installed/running yet. Start the dev
# server directly (no Terminal window — output goes to a log file instead)
# and open the window once it's ready.
LOG_FILE="$PROJECT_DIR/scripts/app/launcher.log"
cd "$PROJECT_DIR" || {
  osascript -e 'display alert "Trading Prep" message "Could not find the project folder at ~/Project-1."'
  exit 1
}

nohup npm run dev -- -p 3000 >> "$LOG_FILE" 2>&1 &

COUNT=0
until curl -sf "$URL" > /dev/null 2>&1; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -gt 60 ]; then
    osascript -e 'display alert "Trading Prep" message "The server did not start within 60 seconds. Check scripts/app/launcher.log, or run scripts/service/install-service.sh once to fix this permanently."'
    exit 1
  fi
done

open_window
