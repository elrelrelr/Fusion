#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Sube el proyecto a GitHub, listo para que Actions compile el fork.
#
#  Uso:   ./subir-a-github.sh https://github.com/TU_USUARIO/TU_REPO.git
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")"

REPO="${1:?uso: ./subir-a-github.sh https://github.com/TU_USUARIO/TU_REPO.git}"
TAG="${2:-v1.0-fusion}"

# Llave de firma: nunca al repo (ya está en .gitignore, doble comprobación)
if ls llaves/*.keystore >/dev/null 2>&1; then
  echo "  (la llave de firma queda FUERA del repo — la excluye .gitignore)"
fi

git init -q
git config user.name  "Fusion"
git config user.email "fusion@localhost"
git add -A
git commit -q -m "Fusion: fork del Telegram oficial + muro de Mastodon" || true
git tag -f "$TAG"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"
git push -u origin main --tags --force

echo
echo "  Subido a $REPO"
echo "  Tag: $TAG"
echo "  Ahora entra en la pestaña Actions y lanza el flujo «Compilar y firmar»."
