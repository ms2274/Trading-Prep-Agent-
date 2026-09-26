#!/bin/bash
# Stops and removes the background service, if you ever want to go back to
# running it manually (or stop it entirely).
set -e

PLIST_DEST="$HOME/Library/LaunchAgents/com.tradingprep.server.plist"

if [ -f "$PLIST_DEST" ]; then
  echo "Stopping and removing the background service..."
  launchctl bootout "gui/$(id -u)" "$PLIST_DEST" 2>/dev/null || true
  rm -f "$PLIST_DEST"
  echo "Done. The server will no longer start automatically."
else
  echo "No background service found — nothing to do."
fi

read -p "Press Enter to close..."
