# Publicar Fusion en F-Droid

Este directorio deja **listo** lo necesario para meter Fusion en F-Droid. Sólo
falta el paso final, que es tuyo: enviar el `metadata/app.fusion.social.yml` al
repositorio `fdroiddata`.

> **Qué se publica en F-Droid:** el fork del Telegram oficial (`fork-oficial/`),
> con el muro de Mastodon como única añadidura. El cliente propio (`app/`) se
> queda fuera: es el laboratorio.

## Qué exige F-Droid (y cómo lo cumple Fusion)

| Requisito | Estado |
|---|---|
| **Código fuente público y con licencia libre** | ✅ Telegram es GPLv2 (`LICENSE` en la raíz) |
| **Compilable desde el código** | ✅ `setup.sh` clona Telegram + aplica parches + Gradle (receta incluida) |
| **Sin secretos en el repo** | ✅ `.keystore`, `google-services.json`, `*.apk` en `.gitignore` |
| **Versiones etiquetadas (tags)** | ✅ hay que crear el tag `v1.0-fusion` (ver abajo) |

## Pasos para enviarlo

```bash
# 1) Genera el fork y súbelo a un repo PÚBLICO de GitHub
cd fork-oficial
./setup.sh                          # clona Telegram y aplica los parches
cd telegram-fusion
git tag v1.0-fusion
git remote add origin https://github.com/TU_USUARIO/Fusion-fork.git
git push -u origin main --tags
```

```bash
# 2) Sustituye la URL del repo en metadata/app.fusion.social.yml
#    (aparece como https://github.com/USUARIO/Fusion)
```

```bash
# 3) Fork de fdroiddata y merge request
git clone https://gitlab.com/fdroid/fdroiddata.git
cp metadata/app.fusion.social.yml fdroiddata/metadata/
# commit + push + MR a https://gitlab.com/fdroid/fdroiddata
```

Alternativa sin MR: pide la inclusión en **Request For Packaging**
(https://f-droid.org/es/contribute/) con la URL del repo y esta receta.

## Puntos delicados a tener en cuenta

1. **El fork es pesado.** La compilación necesita NDK 27 y ~8 GB de RAM. Los
   servidores de F-Droid lo manejan, pero el build tarda bastante (~1 h). Avisa
   en el MR si el `timeout` por defecto se queda corto.

2. **Telegram descarga bibliotecas nativas en el build.** F-Droid exige builds
   reproducibles sin red; Telegram precompila y empaqueta sus `.so` en el
   propio repo, pero conviene revisar que el build no descargue nada externo
   (si lo hace, habrá que incluir esas dependencias en la receta).

3. **api_id / api_hash**: la app incrusta las claves públicas del cliente
   oficial. Para una publicación impecable, genera las tuyas en
   https://my.telegram.org/apps y pásalas en la receta (o en `patch.py`).

4. **Firma**: F-Droid re-firma el APK con su propia clave. Si el usuario ya
   tiene Fusion instalado desde otra fuente, tendrá que desinstalar. Normal.

5. **Nombre y marca**: usa un nombre e icono distintos de Telegram (ya lo hace:
   `Fusion`). F-Droid rechaza apps que se hagan pasar por la marca original.

## Qué NO va en F-Droid

La **inyección del APK oficial** (`inyeccion/`) no se publica en F-Droid:
reempaqueta un APK binario ajeno y no es build reproducible. Se distribuye
aparte, en GitHub Releases, igual que el APK firmado del fork.
