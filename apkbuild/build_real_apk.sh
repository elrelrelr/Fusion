#!/usr/bin/env bash
# Build a real, installable Fusion APK from smali source.
#
# Uses a self-contained toolchain (no Android SDK required):
#   - JRE: jdk4py (PyPI)            -> java
#   - apktool.jar  (npm @postar/apktool-node) -> smali assembler
#   - apksigner.jar (npm @postar/apktool-node) -> v1/v2/v3 signing
#   - keytool (jdk4py)              -> generates the signing keystore
#
# Also builds the binary AndroidManifest.xml from build_axml.py
# (minSdk 24, targetSdk 33, com.fusion.app, launcher activity).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JAVA="${JAVA:-}"
if [ -z "$JAVA" ]; then
  JAVA="$(python3 -c "import jdk4py, os; print(os.path.join(os.path.dirname(jdk4py.__file__), 'java-runtime', 'bin', 'java'))" 2>/dev/null || true)"
fi
: "${JAVA:?Set JAVA to a java binary (e.g. pip install jdk4py)}"
KEYTOOL="${KEYTOOL:-$(dirname "$JAVA")/keytool}"

APKTOOL_JAR="${APKTOOL_JAR:?Set APKTOOL_JAR to apktool.jar}"
APKSIGNER_JAR="${APKSIGNER_JAR:?Set APKSIGNER_JAR to apksigner.jar}"

WORK="${SCRIPT_DIR}/_build"
rm -rf "$WORK"; mkdir -p "$WORK/smali/com/fusion/app"
cp -r "${SCRIPT_DIR}/app-smali/com/fusion/app/"*.smali "$WORK/smali/com/fusion/app/"

# 1. Build binary AndroidManifest.xml
python3 "${SCRIPT_DIR}/build_axml.py"
cp "${SCRIPT_DIR}/AndroidManifest.xml" "$WORK/AndroidManifest.xml"

cat > "$WORK/apktool.yml" <<EOF
!!brut.androlib.meta.MetaInfo
apkFileName: fusion.apk
compressionType: false
isFrameworkApk: false
packageInfo:
  forcedPackageId: '127'
  renameManifestPackage: null
versionInfo:
  versionCode: '17'
  versionName: '1.7'
EOF

# 2. Assemble smali -> classes.dex + package APK
"$JAVA" -jar "$APKTOOL_JAR" b "$WORK" -o "$WORK/fusion.apk"

# 3. Sign (v1+v2+v3)
STORE="$WORK/fusion.keystore"
"$KEYTOOL" -genkeypair -keystore "$STORE" -alias fusion -keyalg RSA \
  -keysize 2048 -validity 10000 -storepass fusion123 -keypass fusion123 \
  -dname "CN=Fusion, O=Fusion, C=CO" >/dev/null 2>&1

"$JAVA" -jar "$APKSIGNER_JAR" sign \
  --ks "$STORE" --ks-key-alias fusion --ks-pass pass:fusion123 \
  --key-pass pass:fusion123 \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$WORK/Fusion-1.7.apk" "$WORK/fusion.apk"

echo "Built: $WORK/Fusion-1.7.apk"
"$JAVA" -jar "$APKSIGNER_JAR" verify --verbose "$WORK/Fusion-1.7.apk" 2>/dev/null | grep -E "v2 scheme|v3 scheme" || true
