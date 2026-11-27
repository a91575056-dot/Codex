"""Validate device packaging before offering an unsigned IPA for signing."""
import hashlib
import plistlib
import sys
from pathlib import Path
from zipfile import ZipFile

ipa = Path(sys.argv[1])
with ZipFile(ipa) as archive:
    assert archive.testzip() is None, "Corrupt IPA archive"
    root = "Payload/FinTrack.app/"
    extension = root + "PlugIns/FinTrackWidget.appex/"
    app = plistlib.loads(archive.read(root + "Info.plist"))
    widget = plistlib.loads(archive.read(extension + "Info.plist"))
    for key in ["CFBundleShortVersionString", "CFBundleVersion"]:
        assert app[key] == widget[key], f"App/widget {key} mismatch"
    assert sorted(app["UIDeviceFamily"]) == [1, 2], "iPhone and iPad support required"
    assert app["CFBundleSupportedPlatforms"] == ["iPhoneOS"], "Not a device build"
    assert widget["NSExtension"]["NSExtensionPointIdentifier"] == "com.apple.widgetkit-extension"
    assert any("fintrack" in entry["CFBundleURLSchemes"] for entry in app["CFBundleURLTypes"])
    assert widget["CFBundleIdentifier"].startswith(app["CFBundleIdentifier"] + ".")
    for folder, info in [(root, app), (extension, widget)]:
        binary = archive.read(folder + info["CFBundleExecutable"])
        assert binary[:4] in [b"\xcf\xfa\xed\xfe", b"\xca\xfe\xba\xbe", b"\xca\xfe\xba\xbf"], "Missing Mach-O binary"
    assert root + "embedded.mobileprovision" not in archive.namelist(), "Unexpected signing profile"
checksum = Path(str(ipa) + ".sha256").read_text().split()[0]
assert hashlib.sha256(ipa.read_bytes()).hexdigest() == checksum, "IPA checksum mismatch"
print("IPA verified: iPhone + iPad device binary, embedded WidgetKit, matching versions, deep link, SHA-256; unsigned.")
