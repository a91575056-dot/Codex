#!/bin/bash
set -euo pipefail
NATIVE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v xcodebuild >/dev/null || { echo 'Compilarea iOS necesită macOS cu Xcode.' >&2; exit 1; }
command -v xcodegen >/dev/null || { echo 'Instalează XcodeGen: brew install xcodegen' >&2; exit 1; }
cd "$NATIVE_ROOT/ios"
xcodegen generate
xcodebuild -project FinTrack.xcodeproj -scheme FinTrack -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath "$NATIVE_ROOT/build" CODE_SIGNING_ALLOWED=NO build
mkdir -p "$NATIVE_ROOT/dist/Payload"
cp -R "$NATIVE_ROOT/build/Build/Products/Release-iphoneos/FinTrack.app" "$NATIVE_ROOT/dist/Payload/"
cd "$NATIVE_ROOT/dist"
/usr/bin/ditto -c -k --keepParent Payload FinTrack-unsigned.ipa
shasum -a 256 FinTrack-unsigned.ipa > FinTrack-unsigned.ipa.sha256
python3 "$NATIVE_ROOT/scripts/verify-ipa.py" "$NATIVE_ROOT/dist/FinTrack-unsigned.ipa"
printf '%s\n' 'IPA nesemnat creat. Nu se instalează direct prin Safari; trebuie semnat înainte de instalare.'
