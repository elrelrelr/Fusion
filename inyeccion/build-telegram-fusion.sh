#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Telegram-Fusion · reempaqueta el APK OFICIAL de Telegram con el muro dentro
#
#  Uso:   ./inyeccion/build-telegram-fusion.sh
#  Salida: Telegram-Fusion-<version>.apk  (firmado y listo para instalar)
#
#  Repite esto cada vez que Telegram saque versión nueva: descarga la última,
#  vuelve a inyectar el muro y firma con la MISMA llave, así se instala encima
#  sin perder tu sesión.
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")/.."
RAIZ="$PWD"
TRABAJO="${TMPDIR:-/tmp}/tgfusion"
KEYSTORE="${KEYSTORE:-$RAIZ/llaves/fusion.keystore}"
KS_PASS="${KS_PASS:-android}"
KS_ALIAS="${KS_ALIAS:-androiddebugkey}"

: "${ANDROID_HOME:?exporta ANDROID_HOME (SDK de Android)}"
BT="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
APKTOOL="${APKTOOL:-$TRABAJO/apktool.jar}"

mkdir -p "$TRABAJO"
cd "$TRABAJO"

echo "==> 1/6  Herramientas"
[ -f "$APKTOOL" ] || curl -sL -o "$APKTOOL" https://github.com/iBotPeaches/Apktool/releases/download/v2.11.1/apktool_2.11.1.jar

echo "==> 2/6  Descargando el Telegram oficial más reciente"
curl -sL -o telegram.apk https://telegram.org/dl/android/apk
VER=$("$BT/aapt" dump badging telegram.apk | sed -n "s/.*versionName='\([^']*\)'.*/\1/p" | head -1)
echo "    versión oficial: $VER"

echo "==> 3/6  Compilando el muro web"
( cd "$RAIZ/app" && npm install --silent && npx vite build >/dev/null )

echo "==> 4/6  Desempaquetando e inyectando"
rm -rf tgapk classesout dexout
java -Xmx1100m -jar "$APKTOOL" d -s -f -o tgapk telegram.apk >/dev/null

mkdir -p classesout dexout javasrc/app/fusion/wall
cp "$RAIZ/inyeccion/FusionWallActivity.java" javasrc/app/fusion/wall/
javac -source 8 -target 8 -nowarn -cp "$ANDROID_HOME/platforms/android-35/android.jar" \
      -d classesout javasrc/app/fusion/wall/FusionWallActivity.java 2>/dev/null
"$BT/d8" --min-api 21 --lib "$ANDROID_HOME/platforms/android-35/android.jar" \
      --output dexout classesout/app/fusion/wall/*.class

# el dex nuevo va detrás de los del oficial
N=$(ls tgapk/classes*.dex | wc -l)
cp dexout/classes.dex "tgapk/classes$((N+1)).dex"

rm -rf tgapk/assets/fusion && mkdir -p tgapk/assets/fusion
cp -r "$RAIZ/app/dist/"* tgapk/assets/fusion/

python3 - "$TRABAJO/tgapk/AndroidManifest.xml" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
if 'app.fusion.wall.FusionWallActivity' not in s:
    act = ('<activity android:name="app.fusion.wall.FusionWallActivity" android:exported="true" '
           'android:label="Fusion · Muro" android:hardwareAccelerated="true" '
           'android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode">'
           '<intent-filter><action android:name="android.intent.action.MAIN"/>'
           '<category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity>')
    open(p, 'w').write(s.replace('</application>', act + '</application>'))
    print('    activity declarada')
PY

echo "==> 5/6  Reempaquetando"
java -Xmx1100m -jar "$APKTOOL" b tgapk -o sin-firmar.apk --use-aapt2 >/dev/null

echo "==> 6/6  Firmando"
[ -f "$KEYSTORE" ] || keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -alias "$KS_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Fusion,O=Fusion,C=CO"
"$BT/zipalign" -p -f 4 sin-firmar.apk alineada.apk
"$BT/apksigner" sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
    --ks-key-alias "$KS_ALIAS" --out "$RAIZ/Telegram-Fusion-$VER.apk" alineada.apk
"$BT/apksigner" verify "$RAIZ/Telegram-Fusion-$VER.apk" >/dev/null && echo "    firma verificada"

echo
echo "  Listo: Telegram-Fusion-$VER.apk"
echo "  (Telegram oficial $VER + el muro de Fusion como segundo icono)"
