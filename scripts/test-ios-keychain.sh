#!/bin/bash
# Runs disposable Keychain checks in a booted simulator; never touches member sessions.
set -euo pipefail
cd "$(dirname "$0")/.."
CHECK_DIR="$(mktemp -d /tmp/timebank-keychain.XXXXXX)"
trap 'rm -rf "$CHECK_DIR"' EXIT
mkdir "$CHECK_DIR/Check.app"
cat > "$CHECK_DIR/Check.app/Info.plist" <<'PLIST'
<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>community.neighbour.keychaincheck</string><key>CFBundleExecutable</key><string>Check</string><key>CFBundleName</key><string>Keychain Check</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1</string><key>LSRequiresIPhoneOS</key><true/></dict></plist>
PLIST
sed 's/$(PRODUCT_BUNDLE_IDENTIFIER)/community.neighbour.keychaincheck/g' ios/App/App/Simulator.entitlements > "$CHECK_DIR/Entitlements.plist"
xcrun --sdk iphonesimulator swiftc -target arm64-apple-ios18.0-simulator -sdk "$(xcrun --sdk iphonesimulator --show-sdk-path)" -parse-as-library tests/ios-keychain.swift -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __entitlements -Xlinker "$CHECK_DIR/Entitlements.plist" -o "$CHECK_DIR/Check.app/Check"
codesign --force --sign - "$CHECK_DIR/Check.app"
xcrun simctl install booted "$CHECK_DIR/Check.app"
xcrun simctl launch --console booted community.neighbour.keychaincheck > "$CHECK_DIR/result.txt" 2>&1
cat "$CHECK_DIR/result.txt"
grep -q 'KEYCHAIN_CHECK empty=-25300 add=0 read=0 update=0 remove=0' "$CHECK_DIR/result.txt"
xcrun simctl uninstall booted community.neighbour.keychaincheck
