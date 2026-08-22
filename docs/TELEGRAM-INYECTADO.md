# Telegram-Fusion 2.0 — el Telegram **oficial** con el muro de Fusion dentro

**APK:** `Telegram-Fusion-2.0.apk` · 72 MB · Android 5+

Esto ya no es una imitación: es el **cliente oficial de Telegram 12.10.0** descargado de telegram.org, al que le inyecté nuestro muro del fediverso y volví a firmar.

## Qué trae

- **Telegram completo y nativo**: mensajes de voz con onda y velocidad, reproductor de música, visor de documentos, descargas y gestor de almacenamiento, cámara y editor de fotos/vídeo, llamadas y videollamadas, stickers y GIFs animados, reacciones, temas y fondos, carpetas, cuentas múltiples, borradores, encuestas, mensajes programados y temporales, chats secretos… todo, porque **es** la app oficial.
- **Fusion · Muro**: un segundo icono en tu lanzador con el muro de Mastodon (timeline, favoritos, impulsos, publicar, explorar, DMs) funcionando dentro de la misma app, sin navegador externo.

## Instalación

1. Instala `Telegram-Fusion-2.0.apk` (permite «orígenes desconocidos»).
2. Aparecerán **dos iconos**: *Telegram* (la app oficial) y *Fusion · Muro* (el fediverso).
3. Entra en Telegram con tu número como siempre.

El paquete es `org.telegram.messenger.web`, el de la descarga directa de telegram.org, así que **convive** con el Telegram de Play Store (`org.telegram.messenger`) sin desinstalar nada. Si ya tenías instalada la versión directa de telegram.org, desinstálala antes (firma distinta).

## Honestidad sobre esta vía

- Va firmada con **mi clave de depuración**, no con la de Telegram. Consecuencia práctica: **las notificaciones push de Firebase pueden no llegar** (Google las valida por firma). Todo lo demás funciona igual.
- Al ser un APK reempaquetado, **hay que rehacerlo en cada actualización** de Telegram.
- La vía limpia y duradera sigue siendo compilar el fork desde el código fuente (carpeta `fork-oficial/`): ahí el muro se integra *dentro* de la interfaz nativa como una pestaña más, se firma con tu clave y se actualiza con un `git pull`. Solo necesita compilarse en GitHub Actions porque este entorno no tiene RAM suficiente.
- Telegram es GPLv2: el fork puede distribuirse, publicando su código.

## Siguiente paso natural

Con el fork por código fuente: muro como pestaña dentro de la lista de chats, publicación cruzada desde el compositor nativo y un apartado «Fusion» dentro de Ajustes de Telegram.
