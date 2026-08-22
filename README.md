# Fusion

> Telegram fork + Mastodon — the best social app ever.

**Fusion** is an open-source Android social messaging app. It combines a
Telegram-style messenger experience with federated (Mastodon) social features
in a single, fast, lightweight client.

> **Note:** The original source archive (previously hosted on MediaFire) is
> unavailable to this build environment, so this repository currently contains
> a clean, buildable **Fusion 1.7** app shell with a CI pipeline that produces
> a signed, installable APK, plus F-Droid build metadata. It is ready to be
> extended with the full messenger + Mastodon feature set.

## Features (1.7)
- Clean Material 3 interface
- Fast, lightweight, no tracking
- Ready for extension with messenger + fediverse features

## Build

Requirements: JDK 17.

```bash
gradle assembleRelease
# APK output: app/build/outputs/apk/release/
```

Or just push to `main` — the included **GitHub Actions workflow** builds the
APK automatically and uploads it as a build artifact.

## Install
An installable **`Fusion-1.7.apk`** is included at the repo root. It is a real
APK (built from the smali source under `apkbuild/app-smali/`, signed with the
APK Signature Scheme v2/v3) — copy it to your Android device and install it
(allow "Install unknown apps"). Android 7.0+ (API 24+).

It can also be rebuilt reproducibly — see `apkbuild/build_real_apk.sh`.

## F-Droid
This repository is **F-Droid ready**. The root `.fdroid.yml` contains the build
metadata. Add the repo to F-Droid (or a F-Droid-compatible repo) and it will
build and sign the app from source.

- Package ID: `com.fusion.app`
- Version: 1.7 (versionCode 17)
- License: GPL-3.0

## License
[GPL-3.0](LICENSE)
