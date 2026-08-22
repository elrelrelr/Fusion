# Historial

## Cliente propio

| Versión | Qué trajo |
|---|---|
| 1.0 | Primer APK. Login de Mastodon por OAuth y de Telegram por Bot API. Interfaz de escritorio en tres columnas. |
| 1.1 | Rediseño total a app móvil: acceso al frente, bandeja única (guardados, chats, grupos, canales, bots + DMs del fediverso), conversación a pantalla completa, muro con filtros. |
| 1.2 | Fuera `api_id`/`api_hash`: claves incrustadas como los demás forks, con rotación automática entre cinco si Telegram satura una. Errores traducidos. |
| 1.3 | **Bug del login**: el bundle tenía dos clases `Buffer` y GramJS falla al validar `instanceof`. Dedupe + `Buffer` global único. Errores completos, copiables, nunca recortados. |
| 1.4 | **Verificación en dos pasos**: GramJS lee `srp_B` y el servidor manda `srpB`; puente entre ambos. Y tras acertar la contraseña faltaba recargar la sesión, por eso "no pasaba nada". |
| 1.5 | Funciones de fork: menú por mensaje (responder, copiar, reenviar, editar, fijar, eliminar para todos), selección múltiple, menú por chat, carpetas reales, búsqueda global, modo fantasma, anti-eliminación, almacenamiento, sesiones, bloqueo con código, temas. |
| 1.6 | Adjuntos, reacciones, información del chat con multimedia y miembros, chat nuevo con búsqueda global y creación de grupos y canales, exportar chat, editar perfil. |
| 1.7 | **"n is not a constructor"**: `EditedMessage`/`DeletedMessage` no se exportan desde `telegram/events`. Visor de archivos integrado (fotos con zoom, vídeo, audio, PDF con pdf.js, texto). |
| 1.8 | Notas de voz (grabar manteniendo pulsado) y reproductor con onda, salto y velocidad. |
| 1.9 | Chats y Perfil con la organización del Telegram oficial. Navegador integrado: enlaces y login de Mastodon sin salir de la app. |
| 2.0 | **Pantalla negra**: un `useEffect` colocado después de los `return` condicionales rompía las reglas de los hooks. Barrera de errores para que nunca más quede una pantalla muerta. Modo "solo muro" cuando la app va incrustada. |

## Ingeniería de lanzamiento (2.0)

| Qué | Detalle |
|---|---|
| **Decisión de producto** | La app que se distribuye es el **fork del Telegram oficial** (todo el Telegram real + muro de Mastodon como única añadidura, firmado con la llave de Fusion). El cliente propio queda como laboratorio. |
| **Conflicto de paquetes (bug clave)** | La inyección conserva el paquete oficial (`org.telegram.messenger.web`) y Android la ve como "la misma app": conflicto al instalar junto al Telegram normal. El fork lo resuelve cambiando `APP_PACKAGE` → paquete final `app.fusion.messenger.web`, que convive con cualquiera. |
| **Por qué el renombrado no rompe nada** | El JNI nativo se enlaza por el paquete de las clases Java (`org.telegram.messenger`), que no cambia; sólo cambia el `applicationId`. Mismo mecanismo que usa Telegram para publicar `.messenger` y `.messenger.web`. Verificado contra Telegram 12.9.2. |
| **Entorno de compilación** | El daemon de Gradle moría por falta de RAM (1,9 GB). Solución: swap + `-Xmx1024m` + Kotlin `in-process`. El cliente propio compila en ~1-2 min; el fork oficial sigue exigiendo la nube (8 GB de RAM + NDK 27). |
| **Firma del fork** | `generar-llave.sh` crea una llave privada propia (no la debug pública); `firmar.sh` firma local; el CI firma con secretos de GitHub. |
| **Preparado para GitHub** | `.gitignore` sin secretos ni artefactos, `LICENSE`, tag y script de subida. |
| **Preparado para F-Droid** | Receta en `fdroid/metadata/app.fusion.social.yml` + guía en `fdroid/README.md`. |

## Telegram-Fusion (APK oficial inyectado)

| Versión | Qué trajo |
|---|---|
| 2.0 | Telegram oficial 12.10.0 descargado de telegram.org, con el muro añadido como segunda Activity y firmado de nuevo. Todas las funciones nativas intactas; el paquete `org.telegram.messenger.web` convive con el Telegram de Play. |

## Fork por código fuente

Preparado y verificado contra Telegram 12.9.2: cinco parches limpios (paquete, claves, nombre, Activity del muro, archivo Java) que **no tocan la interfaz interna**, de modo que el repositorio oficial se puede seguir actualizando con `git pull`. Pendiente: compilarlo en GitHub Actions.

## Cosas que se probaron y se descartaron

- **Reconstruir Telegram desde cero.** Audios, llamadas, visor de documentos y stickers animados son años de trabajo; el resultado siempre sería peor que el original.
- **Compilar el fork oficial en el entorno de desarrollo remoto.** Necesita NDK de 3 GB y ~8 GB de RAM; ahí sólo había 1,5 GB y el demonio de Gradle moría.
- **Usar la Bot API como vía principal para Telegram.** Sólo ve canales donde el bot es administrador; se mantiene como extra opcional, no como base.
