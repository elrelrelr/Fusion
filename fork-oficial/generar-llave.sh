#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Genera una llave de firma PRIVADA y propia para el fork de Fusion.
#
#  IMPORTANTE: no uses la llave debug de Android para distribuir una app.
#  Esa llave es pública e idéntica en todos los equipos (contraseña "android",
#  alias "androiddebugkey"): cualquiera podría firmar una actualización
#  maliciosa que se instale encima de la tuya.
#
#  Uso:   ./generar-llave.sh
#  Salida: llaves/fusion-release.keystore
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")/.."
RAIZ="$PWD"
SALIDA="${1:-$RAIZ/llaves/fusion-release.keystore}"
ALIAS="fusion"
NOMBRE="${FUSION_NOMBRE:-Fusion}"

mkdir -p "$(dirname "$SALIDA")"

if [ -f "$SALIDA" ]; then
  echo "  !! ya existe $SALIDA — no se sobrescribe para no romper la firma"
  exit 1
fi

echo "==> Generando llave de firma (RSA 4096, válida 30 años)"
echo "    Guarda la contraseña que pongas: sin ella no podrás firmar futuras versiones."
keytool -genkeypair -v \
  -keystore "$SALIDA" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10950 \
  -dname "CN=$NOMBRE, OU=$NOMBRE, O=$NOMBRE, C=CO"

echo
echo "  Listo: $SALIDA"
echo "  alias: $ALIAS"
echo
echo "  AHORA: guarda una copia en un sitio seguro (gestor de contraseñas,"
echo "  pendrive, etc.). Si la pierdes, no podrás publicar actualizaciones."
