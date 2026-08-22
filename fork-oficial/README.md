# Fusion · fork del Telegram **oficial** para Android

> **Esta es la app.** El cliente propio (`app/`) es sólo el laboratorio donde
> se prueban ideas rápido; lo que se distribuye e instala es este fork: el
> Telegram oficial **tal cual** —su grabadora de audio, su visor de archivos,
> sus llamadas, stickers, carpetas, temas, TODO— con el **muro de Mastodon como
> única añadidura**, firmado con la llave de Fusion.

Tienes razón: reconstruir Telegram desde cero (audios, reproductor, gestor de archivos, llamadas, stickers, temas, carpetas, borradores, encuestas, edición de fotos, cifrado local…) es meses de trabajo para acabar peor que el original. La vía correcta —la que usan **iMe, Turrit, Nicegram, Owlgram o Nagram**— es **partir del código oficial** (es de código abierto, GPLv2) y añadir cosas encima.

Este kit hace exactamente eso.

---

## Por qué éste sí convive con tu Telegram (y la inyección no)

La **inyección** (`inyeccion/`) reempaqueta el APK oficial y **conserva su paquete**
(`org.telegram.messenger.web`). Android lo interpreta como *la misma app*, por
eso entra en **conflicto** al instalarlo junto a tu Telegram.

El **fork** cambia el identificador en `gradle.properties` (`APP_PACKAGE`) antes
de compilar. El paquete final queda en **`app.fusion.messenger.web`**, distinto
de `org.telegram.messenger` (Play Store) y de `org.telegram.messenger.web`
(descarga directa), así que **se instala al lado de cualquiera de los dos sin
conflicto**.

> **Cómo es que no se rompe nada:** el código nativo (C++) se enlaza por el
> paquete de las *clases Java* (`org.telegram.messenger`), que **no cambia**;
> sólo cambia el `applicationId` (el nombre visible del paquete). Es el mismo
> mecanismo que usa el propio Telegram para publicar `org.telegram.messenger`
> y `org.telegram.messenger.web` como dos apps aparte. Verificado contra el
> código real de Telegram 12.9.2.

---

## Qué obtienes

**Todo el Telegram oficial, sin recortes:** mensajes de voz y música con su reproductor, cámara y editor de fotos/vídeo, visor de documentos, descargas y gestor de almacenamiento real, llamadas y videollamadas, stickers y GIFs animados, reacciones completas, respuestas y citas, temas y fondos, carpetas, cuentas múltiples, borradores, encuestas, programación de mensajes, mensajes temporales, chats secretos, notificaciones push… la app entera.

**Más lo de Fusion encima:** el muro unificado Mastodon + canales, que entra como pantalla propia dentro del mismo APK (`Fusion · Muro`) y desde ahí seguimos integrándolo dentro de la interfaz nativa.

---

## Cómo se compila (no necesitas PC potente)

Este proyecto necesita **NDK 27 (~3 GB)** y unos **6-8 GB de RAM** para Gradle:
no compila en una máquina pequeña. GitHub compila gratis con runners de 16 GB,
y el kit ya trae el flujo listo **con firma incluida**.

```bash
cd fork-oficial
./setup.sh                 # clona el Telegram oficial y aplica los parches
cd telegram-fusion
git remote set-url origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin HEAD
```

Antes del push, configura la firma (una sola vez):

```bash
# 1) Llave de firma PRIVADA propia (no uses la debug de Android: es pública)
cd fork-oficial && ./generar-llave.sh          # → llaves/fusion-release.keystore

# 2) Súbela como secreto de GitHub (Settings → Secrets → Actions)
base64 -w0 llaves/fusion-release.keystore      # pega el resultado en KEYSTORE_BASE64
#    y crea también: KEYSTORE_PASSWORD, KEY_ALIAS (="fusion"), KEY_PASSWORD
```

Entra en la pestaña **Actions** → el APK se compila (~25 min) **y se firma solo**,
quedando en **Artifacts** listo para instalar.

¿Prefieres tu PC? Android Studio + JDK 17 + NDK `27.2.12479018`:

```bash
./gradlew :TMessagesProj_AppStandalone:assembleAfatDebug
../firmar.sh ruta/al.apk          # para firmarlo con tu llave
```

---

## Qué toca el parche (y por qué es seguro)

**El resto queda intacto: es el Telegram oficial, sin recortes.** El parche sólo
añade el muro y cambia la identidad; no entra en la grabadora de audio, el
visor de archivos, los chats, ni ninguna otra función interna.

| Archivo | Cambio |
|---|---|
| `gradle.properties` | paquete `app.fusion.messenger`, versión propia, memoria de Gradle |
| `BuildVars.java` | `api_id` / `api_hash` (por defecto los incrustados; los tuyos con `FUSION_API_ID=… FUSION_API_HASH=… python3 patch.py`) |
| `strings.xml` | nombre visible **Fusion** |
| `AndroidManifest.xml` | añade la Activity del muro |
| `FusionWallActivity.java` | pantalla nueva, aislada del resto |

Verificado contra el código real de Telegram **12.9.2** (la versión actual):
los cinco parches se aplican limpios.

Ningún parche entra en la UI interna de Telegram, así que `git pull` del repo oficial sigue funcionando y no se rompe nada al actualizar. Verificado contra el código real (Telegram 12.9.2): los cinco parches se aplican limpios.

---

## Orden de trabajo propuesto

1. **Base oficial compilando** con tu nombre y tus claves ← *este kit*
2. **Muro Fusion como pestaña nativa** dentro de la lista de chats (en vez de pantalla aparte)
3. **Publicación cruzada** desde el compositor nativo de Telegram: un mensaje → canal + Mastodon
4. **Ajustes «Fusion»** dentro de Ajustes de Telegram: modo fantasma, anti-eliminación, reenvío sin autor, bloqueo con PIN, acentos de color — lo que ya funciona en la app web, portado a Java
5. **Chats de Mastodon** integrados en la misma lista de conversaciones

---

## Aviso legal, en corto

El cliente de Telegram es **GPLv2**: puedes forkear y distribuir, pero tu fork también debe publicar su código fuente. Usa un nombre y un icono distintos de Telegram, y para publicarlo en Play Store necesitarás tus propias `api_id`/`api_hash` de [my.telegram.org](https://my.telegram.org/apps).

---

## Mientras tanto

`Fusion-1.7.apk` (el cliente propio) sigue instalado y funcionando para el muro unificado y la mensajería básica. En cuanto el fork oficial compile en tu repositorio, esa APK pasa a ser sólo el módulo del muro.
