#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Firma un APK del fork con la llave de Fusion.
#
#  Uso:   ./firmar.sh ruta/al.apk [ruta/llave.keystore]
#  Salida: el APK firmado y verificado (mismo nombre + -firmado.apk)
#
#  Variables de entorno opcionales:
#    KS_PASS   contraseña del almacén   (por defecto se pide)
#    KEY_PASS  contraseña de la clave   (por defecto = KS_PASS)
#    KS_ALIAS  alias                    (por defecto "fusion")
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")/.."
RAIZ="$PWD"

APK="${1:?uso: ./firmar.sh ruta/al.apk}"
KEYSTORE="${2:-$RAIZ/llaves/fusion-release.keystore}"
KS_ALIAS="${KS_ALIAS:-fusion}"

: "${ANDROID_HOME:?exporta ANDROID_HOME (SDK de Android)}"
BT="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"

if [ ! -f "$KEYSTORE" ]; then
  echo "  !! no existe $KEYSTORE — ejecuta ./generar-llave.sh primero"
  exit 1
fi

if [ -z "$KS_PASS" ]; then
  read -rsp "  contraseña del almacén: " KS_PASS; echo
fi
KEY_PASS="${KEY_PASS:-$KS_PASS}"

SALIDA="${APK%.apk}-firmado.apk"

echo "==> Alineando"
"$BT/zipalign" -p -f 4 "$APK" /tmp/fusion-aligned.apk

echo "==> Firmando"
"$BT/apksigner" sign --ks "$KEYSTORE" \
  --ks-pass "pass:$KS_PASS" --key-pass "pass:$KEY_PASS" \
  --ks-key-alias "$KS_ALIAS" \
  --out "$SALIDA" /tmp/fusion-aligned.apk

echo "==> Verificando"
"$BT/apksigner" verify --print-certs "$SALIDA" | head -4

echo
echo "  Listo: $SALIDA"
