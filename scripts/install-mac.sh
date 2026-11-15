#!/bin/bash
# Installs or updates OrderTrack from the latest GitHub release.
# Your orders and settings are kept: they live in ~/Library/Application Support/OrderTrack.
set -euo pipefail

case "$(uname -m)" in
  arm64) FILE="OrderTrack-arm64.dmg" ;;
  *)     FILE="OrderTrack-x64.dmg" ;;
esac
URL="https://github.com/Zebra0723/OrderTrack/releases/download/latest/$FILE"
DMG="$(mktemp -d)/OrderTrack.dmg"

echo "Quitting OrderTrack if it is open..."
osascript -e 'quit app "OrderTrack"' >/dev/null 2>&1 || true
sleep 2
pkill -x OrderTrack >/dev/null 2>&1 || true

echo "Downloading $FILE..."
curl -fL --progress-bar -o "$DMG" "$URL"

echo "Installing..."
MOUNT="$(hdiutil attach -nobrowse -noautoopen "$DMG" | tail -1 | awk -F'\t' '{print $NF}')"
rm -rf /Applications/OrderTrack.app
cp -R "$MOUNT/OrderTrack.app" /Applications/
hdiutil detach "$MOUNT" -quiet || true
rm -f "$DMG"
xattr -cr /Applications/OrderTrack.app

VERSION="$(defaults read /Applications/OrderTrack.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null || echo unknown)"
echo "Done. Installed OrderTrack version $VERSION. Opening it now."
open /Applications/OrderTrack.app
