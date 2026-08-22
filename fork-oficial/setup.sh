#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Fusion · fork del Telegram oficial para Android
#  Descarga el código oficial y le aplica nuestros cambios.
#  Uso:  ./setup.sh [carpeta-destino]
# ---------------------------------------------------------------------------
set -e

DEST="${1:-telegram-fusion}"
REPO="https://github.com/DrKLO/Telegram.git"

echo "==> 1/4  Clonando el código oficial de Telegram (≈900 MB, sólo la última versión)"
if [ ! -d "$DEST/.git" ]; then
  git clone --depth 1 "$REPO" "$DEST"
else
  echo "    ya existe $DEST, se reutiliza"
fi

echo "==> 2/4  Compilando la parte web (muro de Mastodon) si está disponible"
if [ -d "../app" ]; then
  ( cd ../app && npm install --silent && npx vite build >/dev/null 2>&1 ) || true
  if [ -d "../app/dist" ]; then
    mkdir -p "$DEST/TMessagesProj/src/main/assets/fusion"
    cp -r ../app/dist/* "$DEST/TMessagesProj/src/main/assets/fusion/"
    echo "    muro copiado a assets/fusion"
  fi
fi

echo "==> 3/4  Aplicando los parches de Fusion"
python3 patch.py "$DEST"

echo "==> 4/4  Copiando el flujo de compilación en la nube"
mkdir -p "$DEST/.github/workflows"
cp workflows/build-apk.yml "$DEST/.github/workflows/build-apk.yml"

cat <<'FIN'

  Listo. El fork está preparado.

  OPCIÓN A · compilar gratis en la nube (recomendado, no necesitas PC potente)
    1. Crea un repositorio vacío en GitHub (privado si quieres).
    2. cd telegram-fusion && git remote set-url origin TU_REPO && git push -u origin HEAD
    3. Entra en la pestaña «Actions» → el APK se compila solo (~25 min) y queda
       en «Artifacts» listo para descargar e instalar.

  OPCIÓN B · compilar en tu PC
    Android Studio + NDK 27.2.12479018 + JDK 17, y:
      ./gradlew :TMessagesProj_AppStandalone:assembleAfatDebug

FIN
