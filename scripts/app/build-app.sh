#!/bin/bash
# Builds/rebuilds "Trading Prep.app" in ~/Applications — a real macOS app with
# its own icon. update-and-rebuild.sh re-runs this automatically, so you only
# need to run it by hand the first time.
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$HOME/Applications/Trading Prep.app"
SRC="$PROJECT_DIR/scripts/app"

echo "Building Trading Prep.app..."

# Replace only Contents/, not the .app folder itself, so a Dock pin keeps
# pointing at the same app across rebuilds.
mkdir -p "$APP_DIR"
rm -rf "$APP_DIR/Contents"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"

cp "$SRC/Info.plist" "$APP_DIR/Contents/Info.plist"
sed "s|PROJECT_DIR_PLACEHOLDER|$PROJECT_DIR|g" "$SRC/launcher.sh" > "$APP_DIR/Contents/MacOS/launcher"
chmod +x "$APP_DIR/Contents/MacOS/launcher"

echo "Generating icon..."
ICONSET="$(mktemp -d)/AppIcon.iconset"
mkdir -p "$ICONSET"

for size in 16 32 128 256 512; do
  double=$((size * 2))
  sips -z "$size" "$size"     "$SRC/icon-source.png" --out "$ICONSET/icon_${size}x${size}.png"    > /dev/null
  sips -z "$double" "$double" "$SRC/icon-source.png" --out "$ICONSET/icon_${size}x${size}@2x.png" > /dev/null
done

iconutil -c icns "$ICONSET" -o "$APP_DIR/Contents/Resources/AppIcon.icns"
rm -rf "$(dirname "$ICONSET")"

# Clear icon caches so Finder/Dock/Launchpad pick up the new icon immediately.
touch "$APP_DIR"
killall Finder > /dev/null 2>&1 || true
killall Dock > /dev/null 2>&1 || true

echo ""
echo "############################################################"
echo "# Done. 'Trading Prep' is in ~/Applications.                #"
echo "# If it isn't in your Dock yet, open it once from there     #"
echo "# and drag it to the Dock to pin it.                        #"
echo "############################################################"
