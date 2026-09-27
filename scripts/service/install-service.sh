#!/bin/bash
# Run this ONCE to set Trading Prep up as an always-on background service and
# build the Trading Prep app. After this, the server starts automatically
# every login — you never need to run this again unless you uninstall it.
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

echo "Installing dependencies..."
npm install

echo "Building for production (first run, may take a minute)..."
npm run build

PLIST_SRC="$PROJECT_DIR/scripts/service/com.tradingprep.server.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.tradingprep.server.plist"

mkdir -p "$HOME/Library/LaunchAgents"
sed "s|PROJECT_DIR_PLACEHOLDER|$PROJECT_DIR|g" "$PLIST_SRC" > "$PLIST_DEST"

echo "Registering the background service..."
launchctl bootout "gui/$(id -u)" "$PLIST_DEST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST"
launchctl enable "gui/$(id -u)/com.tradingprep.server"

echo ""
echo "Waiting for it to come up..."
COUNT=0
until curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -gt 30 ]; then
    echo ""
    echo "############################################################"
    echo "# IT DIDN'T START. Check the log for errors:                #"
    echo "# $PROJECT_DIR/scripts/service/server.log"
    echo "############################################################"
    exit 1
  fi
done

bash "$PROJECT_DIR/scripts/app/build-app.sh"

echo ""
echo "############################################################"
echo "# Done. Trading Prep now runs in the background and starts  #"
echo "# automatically every time you log in.                      #"
echo "#                                                            #"
echo "# Open it from the Trading Prep app in your Dock/Applications#"
echo "#                                                            #"
echo "# To update the code later, run:                             #"
echo "# bash scripts/service/update-and-rebuild.sh                 #"
echo "############################################################"
