#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Fusion · compila la app propia (cliente Capacitor) y deja el APK firmado
#  Uso: ./scripts/build-fusion-apk.sh
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")/../app"

: "${ANDROID_HOME:?exporta ANDROID_HOME}"
: "${JAVA_HOME:?exporta JAVA_HOME (JDK 21)}"

echo "==> Dependencias"
npm install --silent

echo "==> Web"
npx vite build

echo "==> Sincronizando con Android"
npx cap sync android

echo "==> Compilando APK"
cd android
chmod +x gradlew
./gradlew --no-daemon --max-workers=1 assembleDebug

VER=$(grep versionName app/build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')
cp app/build/outputs/apk/debug/app-debug.apk "../../Fusion-$VER.apk"
echo
echo "  Listo: Fusion-$VER.apk"
