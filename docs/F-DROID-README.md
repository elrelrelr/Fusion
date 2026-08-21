# Fusion — F-Droid & APK build guide

This repository is **ready for F-Droid**. Here is everything you need to
publish the app and/or produce an installable APK.

## 1. Get an APK (GitHub Actions) — recommended

The CI workflow is included in this repo at
[`docs/ci/build-apk-workflow.yml`](ci/build-apk-workflow.yml) (it could not be
committed into `.github/workflows/` directly from the agent session because the
GitHub App needs the **`workflows`** permission).

To enable automatic APK builds:

1. **Grant the app `workflows` permission**, *or* simply add the workflow
   yourself. To add it yourself, copy `docs/ci/build-apk-workflow.yml` into
   `.github/workflows/build-apk.yml` and commit it:

   ```bash
   mkdir -p .github/workflows
   cp docs/ci/build-apk-workflow.yml .github/workflows/build-apk.yml
   git add .github/workflows/build-apk.yml
   git commit -m "Enable APK CI build"
   git push
   ```

2. Every push (and every manual "Run workflow") then builds the release APK and
   uploads it as a **build artifact** named `Fusion-1.7-apk`.
   Download it from: **Actions → the run → Artifacts**.

3. (Optional) Push a tag `v1.7` to also attach the APK to a **GitHub Release**.

## 2. Publish to F-Droid

The root `.fdroid.yml` is the F-Droid build metadata. To submit:

- Go to the F-Droid repo request page
  (`https://f-droid.org/` → "Submit an app"), or open a request at
  `https://gitlab.com/fdroid/fdroiddata/-/issues`.
- Give them the source URL: **https://github.com/elrelrelr/Fusion**
- F-Droid builds and signs the app from source on their servers — no APK
  upload needed from you.

## 3. Build locally

Requirements: **JDK 17**.

```bash
gradle assembleRelease
# APK: app/build/outputs/apk/release/app-release-unsigned.apk
```

## Package info

- Package ID: `com.fusion.app`
- Version: **1.7** (versionCode **17**)
- Min Android: API 26 · Target: API 34
- License: GPL-3.0

> **Note about the original MediaFire archive:** the original `Fusion-Proyecto.zip`
> (and `Fusion-1.7.apk`) are hosted on MediaFire, which is blocked from this
> build sandbox, and the GitHub App used here cannot enable GitHub Actions on
> its own. So the APK has to be produced from this source via one of the methods
> above (CI, local Gradle, or F-Droid).
