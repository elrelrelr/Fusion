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
Grab the APK from the latest CI build artifact (or from a GitHub Release) and
install it on your Android device (allow "Install unknown apps").

## F-Droid
This repository is **F-Droid ready**. The root `.fdroid.yml` contains the build
metadata. Add the repo to F-Droid (or a F-Droid-compatible repo) and it will
build and sign the app from source.

- Package ID: `com.fusion.app`
- Version: 1.7 (versionCode 17)
- License: GPL-3.0

## License
[GPL-3.0](LICENSE)
