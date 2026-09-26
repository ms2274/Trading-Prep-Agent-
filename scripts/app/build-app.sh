#!/bin/bash
# Run this ONCE (and again any time icon-source.png or launcher.sh changes)
# to build/rebuild "Trading Prep.app" — a real macOS app with its own icon,
# installed to your Applications folder and Dock.
set -e

PROJECT_DIR="$HOME/Project-1"
APP_DIR="$HOME/Applications/Trading Prep.app"
SRC="$PROJECT_DIR/scripts/app"

echo "Building Trading Prep.app..."

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"

cp "$SRC/Info.plist" "$APP_DIR/Contents/Info.plist"
cp "$SRC/launcher.sh" "$APP_DIR/Contents/MacOS/launcher"
chmod +x "$APP_DIR/Contents/MacOS/launcher"

echo "Generating icon..."
ICONSET="$SRC/AppIcon.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

sips -z 16 16     "$SRC/icon-source.png" --out "$ICONSET/icon_16x16.png"      > /dev/null
sips -z 32 32     "$SRC/icon-source.png" --out "$ICONSET/icon_16x16@2x.png"   > /dev/null
sips -z 32 32     "$SRC/icon-source.png" --out "$ICONSET/icon_32x32.png"      > /dev/null
sips -z 64 64     "$SRC/icon-source.png" --out "$ICONSET/icon_32x32@2x.png"   > /dev/null
sips -z 128 128   "$SRC/icon-source.png" --out "$ICONSET/icon_128x128.png"    > /dev/null
sips -z 256 256   "$SRC/icon-source.png" --out "$ICONSET/icon_128x128@2x.png" > /dev/null
sips -z 256 256   "$SRC/icon-source.png" --out "$ICONSET/icon_256x256.png"    > /dev/null
sips -z 512 512   "$SRC/icon-source.png" --out "$ICONSET/icon_256x256@2x.png" > /dev/null
sips -z 512 512   "$SRC/icon-source.png" --out "$ICONSET/icon_512x512.png"    > /dev/null
cp "$SRC/icon-source.png" "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$APP_DIR/Contents/Resources/AppIcon.icns"
rm -rf "$ICONSET"

# Clear icon caches so Finder/Dock/Launchpad pick up the new icon immediately.
touch "$APP_DIR"
killall Finder > /dev/null 2>&1 || true
killall Dock > /dev/null 2>&1 || true

echo ""
echo "############################################################"
echo "# Done. 'Trading Prep' is now in ~/Applications.            #"
echo "# Open it once from there, then drag it to your Dock to     #"
echo "# pin it — from then on, click the Dock icon to launch.     #"
echo "############################################################"
read -p "Press Enter to close..."
