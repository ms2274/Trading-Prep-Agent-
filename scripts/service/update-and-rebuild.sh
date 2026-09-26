#!/bin/bash
# Run this whenever you want to update to the latest code — NOT automatically
# on every launch, since the server now runs continuously in the background.
set -e

PROJECT_DIR="$HOME/Project-1"
cd "$PROJECT_DIR"

BRANCH="claude/nextjs-trading-prep-build-2j3pfe"
UPDATE_OK=true

echo "Checking for updates..."
git fetch origin "$BRANCH" || UPDATE_OK=false
git checkout "$BRANCH" || UPDATE_OK=false
if [ "$UPDATE_OK" = true ]; then
  git merge --ff-only "origin/$BRANCH" || UPDATE_OK=false
fi

if [ "$UPDATE_OK" = false ]; then
  echo ""
  echo "############################################################"
  echo "# UPDATE FAILED - you are running OLD code, not the latest #"
  echo "# Tell Claude this happened and paste everything above.    #"
  echo "############################################################"
  read -p "Press Enter to close..."
  exit 1
fi

echo "Current version: $(git log -1 --format='%h %ci %s')"
echo ""
echo "Installing dependencies..."
npm install

echo "Building for production..."
npm run build

echo "Restarting the background server..."
launchctl kickstart -k "gui/$(id -u)/com.tradingprep.server"

echo ""
echo "Waiting for it to come back up..."
COUNT=0
until curl -sf http://localhost:3000 > /dev/null 2>&1; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -gt 30 ]; then
    echo ""
    echo "############################################################"
    echo "# IT DIDN'T COME BACK UP. Check the log for errors:         #"
    echo "# $PROJECT_DIR/scripts/service/server.log"
    echo "############################################################"
    read -p "Press Enter to close..."
    exit 1
  fi
done

echo "Done. Updated and running at http://localhost:3000"
read -p "Press Enter to close..."
