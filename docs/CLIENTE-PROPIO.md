# Fusion 2.0 — Telegram (tu cuenta real) + Mastodon en una sola app

**APK:** `Fusion-2.0.apk` · 14 MB · Android 8+ · firmada (debug) → se instala directo.

## Qué cambió respecto a la 1.0

La 1.0 era un tablero de escritorio con dos apps pegadas. La 1.1 es **una sola app móvil** rediseñada de cero:

- **Pantalla de acceso al frente.** Al abrir: logo, "Entrar con mi cuenta de Telegram", y un asistente de 4 pasos (claves → teléfono → código en casillas → contraseña 2FA) igual que cualquier fork de Telegram.
- **Una bandeja, no dos.** Chats muestra en la misma lista: **Mensajes guardados** (siempre arriba), chats personales, grupos, canales y bots — más los DM de Mastodon marcados con su insignia. Filtros arriba: Todos · Personales · Grupos · Canales · Bots · Mastodon. Buscador, contadores de no leídos, chats fijados, hora del último mensaje.
- **Canales en los dos formatos:** en **Muro** como publicaciones (con vistas y reenvíos), y en **Chats** como conversación normal — tocando "Abrir canal" en un post saltas a su chat.
- **Conversación a pantalla completa** estilo Telegram: burbujas, separadores por día, hora en cada mensaje, nombre del autor en grupos, barra de escritura que crece.
- **Muro unificado** con segmentos Todo · Canales · Fediverso, y botón flotante para componer: un texto, y eliges si va a Mastodon (con visibilidad) y/o a un chat/canal de Telegram.
- **Perfil**: tus cuentas, estadísticas, sincronizar, privacidad y cierre de sesión.

## Entrar con tu cuenta de Telegram (1.2)

1. Instala la APK y ábrela → **Continuar con mi número**.
2. Escribe tu teléfono con prefijo → llega el código a tu Telegram.
3. **Código** de 5 dígitos (avanza solo) y, si la tienes, tu **contraseña de dos pasos**.

Nada más: ya no se piden `api_id` ni `api_hash`. La app trae claves incrustadas como los demás forks y, si Telegram satura una, rota sola a la siguiente (trae 5).

Si aun así aparece *"claves saturadas"*, en la pantalla del número hay **Opciones avanzadas** para pegar las tuyas de `my.telegram.org/apps` (también en Perfil → Telegram → Claves de aplicación). Aviso honesto: las claves compartidas son zona gris del ToS de Telegram; si prefieres cero riesgo para tu cuenta, usa las tuyas.

## Añadir Mastodon

Perfil → Mastodon → escribe tu instancia → *Autorizar en el navegador* → copia el código que te muestra → *Terminar conexión*.

## Corregido en 1.3

- **"Bytes or str expected, not Buffer" al iniciar sesión.** Causa real: el empaquetado metía **dos copias distintas de la clase `Buffer`**; GramJS valida los campos MTProto con `instanceof Buffer` y la comprobación fallaba justo al serializar el `auth.sendCode`. Ahora el bundle tiene una sola copia (dedupe + `Buffer` global fijado antes de cargar MTProto) y la serialización del handshake y del envío de código se verificó en pruebas automáticas.
- **Errores completos, nunca recortados.** Caja de error con texto seleccionable, salto de línea, scroll si es largo, botón *Copiar error* y *Detalle técnico* debajo del mensaje en español. Los avisos flotantes también se copian al tocarlos.
- Traducción de los errores frecuentes de Telegram: número inválido, código incorrecto/caducado, contraseña incorrecta, `FLOOD_WAIT` con la espera en minutos, sin conexión, etc.

## Corregido en 1.4 (contraseña de dos pasos)

1. **Bug en la librería MTProto (GramJS):** al calcular la verificación SRP lee `srp_B`, pero el objeto que devuelve Telegram expone ese campo como `srpB`. Resultado: la comprobación de la contraseña reventaba siempre antes de empezar. Ahora se hace de puente entre ambos nombres — verificado con una prueba que calcula el SRP completo (`InputCheckPasswordSRP`, A de 256 bytes, M1 de 32 bytes).
2. **Al acertar la contraseña la app no entraba:** tras autenticar no se recargaba la sesión, así que la pantalla de acceso se volvía a dibujar en blanco (de ahí que "se borrara" la contraseña y no pasara nada). Ahora el login espera a que carguen tus chats y entra directo a la bandeja.
3. **Feedback visible:** el cálculo SRP tarda unos segundos (PBKDF2 de 100.000 iteraciones), así que ahora se ve *"Comprobando contraseña…"* y luego *"Cargando tus chats…"* en vez de un botón mudo.
4. El muro de canales se llena en segundo plano: entrar ya no espera a que se descarguen las publicaciones.

## Nuevo en 1.5 — funciones de fork completo (inspirado en iMe y Turrit, todo gratis)

**En un mensaje** (mantén pulsado o clic derecho):
responder · copiar · reenviar a cualquier chat · guardar en Mensajes guardados · editar los tuyos · fijar/desfijar · seleccionar · descargar adjunto · eliminar (para mí o **para todos**).

**Selección múltiple:** toca *Seleccionar* y marca varios → copiar todos, reenviar en bloque o eliminar en bloque desde la barra superior.

**En la conversación:** buscador dentro del chat, barra de mensaje fijado, cita al responder, marca de *editado*, aviso de *reenviado de*, fotos y stickers que se descargan solos, archivos con botón de descarga, y menú del chat con: marcar leído · fijar · silenciar · archivar · recargar historial · vaciar historial (para mí o para todos) · salir/eliminar.

**En la lista de chats:** mantén pulsado para fijar, silenciar, marcar leído, archivar, vaciar o salir. Filtros Todos/Personales/Grupos/Canales/Bots/**No leídos**/**Archivados**/Mastodon + **tus carpetas reales de Telegram**. La búsqueda con Enter hace **búsqueda global de mensajes** en toda la cuenta.

**Ajustes del fork:**
- *Apariencia*: 6 colores de acento, tamaño de texto, burbujas on/off, modo compacto, Enter envía.
- *Privacidad*: **modo fantasma** (no marca como leído), **anti-eliminación** (conserva mensajes borrados y ediciones), confirmar antes de borrar, descarga automática.
- *Almacenamiento*: cuánto ocupa la caché de medios y botón para vaciarla.
- *Sesiones activas*: lista de dispositivos con su app, país e IP, y botón para cerrarlos.
- *Bloqueo con código*: PIN de 4 dígitos con teclado propio al abrir la app.

**Reenvío avanzado:** al reenviar puedes activar *Ocultar el remitente* (sin la etiqueta "reenviado de"), como en los forks de pago.

## Nuevo en 1.6 — segundo nivel de funciones

- **Adjuntos**: botón de clip en la barra de escritura → envía fotos, vídeos y archivos desde el teléfono (con pie de foto si escribes antes).
- **Reacciones**: en el menú del mensaje hay fila de emojis (👍❤️🔥😂😮😢🎉👏); tocar de nuevo la quita. La reacción se ve bajo la burbuja.
- **Información del chat**: foto grande, @usuario, teléfono, biografía/descripción, nº de miembros y en línea, accesos rápidos (mensaje, silenciar, fijar, archivar), **galería de multimedia compartida**, **lista de miembros** y bloquear usuario / salir.
- **Chat nuevo** (botón flotante en Chats): busca cualquier @usuario del directorio global de Telegram, abre tus contactos, o **crea grupos, supergrupos y canales** desde la app.
- **Exportar chat a .txt** desde el menú del chat (incluye los mensajes rescatados por anti-eliminación).
- **Marcar como no leído** y **papelera anti-eliminación** en Perfil: registro de lo que te borraron o editaron, con chat, fecha y texto original.
- **Editar tu perfil de Telegram**: nombre, apellido, biografía y @usuario desde Perfil.

## Corregido y nuevo en 1.7

**El error “n is not a constructor”.** Causa: `telegram/events` solo exporta `NewMessage`; `EditedMessage` y `DeletedMessage` viven en sus propios módulos. Al hacer `new undefined()` el arranque fallaba y el aviso se quedaba pegado en todas las pantallas. Ahora se importan de su módulo correcto (verificado: los tres eventos construyen bien) y, si algún día faltara uno, la app sigue funcionando sin eventos en vez de romperse.

**Visor de archivos integrado — sin descargar nada:**
- **Fotos** a pantalla completa con zoom (+/− o doble toque).
- **Vídeo** y **audio** con reproductor propio.
- **PDF** paginado renderizado dentro de la app con pdf.js (navegación página a página y zoom).
- **Texto, código, JSON, CSV, Markdown, logs…** en visor monoespaciado.
- Formatos sin vista previa (zip, docx, xlsx…) muestran ficha con tamaño y botón *Guardar en el teléfono*.
- Los adjuntos en el chat ahora son **tarjetas** con icono por tipo y nombre; las fotos se ven en marco con botón *Ver*. La multimedia compartida de un chat también abre en el visor.

**Interfaz más moderna:** publicaciones y ajustes en tarjetas redondeadas con borde suave, cabecera con sombra sutil, burbujas con el color de acento y sombra, filas de chat con feedback al pulsar, y botón **⋮ visible** en cada mensaje y cada chat (ya no hay que adivinar la pulsación larga), más una pista la primera vez que abres un chat.

## Nuevo en 1.8 — audio

- **Notas de voz**: mantén pulsado el micrófono de la barra de escritura (aparece cuando no hay texto), suelta para enviar, o pulsa *Cancelar*. Se envían como nota de voz real de Telegram (opus).
- **Reproductor propio** para notas de voz y archivos de audio: onda visual, barra arrastrable para saltar, tiempo transcurrido y **velocidad 1× / 1,5× / 2×**.
- Las notas de voz se descargan solas al abrir el chat; los audios largos, al pulsar play.
- Permiso de micrófono declarado y concedido al WebView (`RECORD_AUDIO`).

## Corregido en 2.0 — pantalla negra al abrir

Un `useEffect` (el que abre los enlaces dentro de la app) había quedado **después** de los `return` condicionales del componente principal. React exige que todos los hooks se ejecuten siempre en el mismo orden: al cambiar el número de hooks entre renders, el árbol reventaba y la pantalla quedaba en negro sin mensaje. Movido arriba con el resto de hooks.

Además, para que no vuelva a pasar en silencio: **barrera de errores** que muestra el fallo con botón de *Copiar*, *Reiniciar* y *Borrar datos locales*, y un capturador previo por si algo falla antes de que React arranque.

## Nuevo en 1.9 — organización del Telegram oficial y fediverso sin salir de la app

**Chats como en el Telegram oficial:** barra de búsqueda redondeada, **pestañas superiores con subrayado** (Todos · Personales · Grupos · Canales · Bots · No leídos · Archivados · tus carpetas reales), filas con avatar de 54 px, nombre en negrita, vista previa en gris, hora a la derecha, **doble check** en los mensajes que enviaste, icono de silencio, chincheta de fijado y globo azul de no leídos.

**Perfil = Ajustes del Telegram oficial:** cabecera con degradado y tu foto, número y @usuario, y las secciones en el mismo orden con sus cuadros de color — Editar perfil · Cuenta · **Notificaciones y sonidos** · **Privacidad y seguridad** · **Datos y almacenamiento** · **Apariencia** · **Carpetas de chats** · **Dispositivos** · **Idioma**, más un bloque «Fusion» con muro, bot, papelera anti-eliminación, bloqueo por código y claves.

**Todo ocurre dentro de la app:** navegador integrado a pantalla completa. Los enlaces de las publicaciones, los perfiles del fediverso, my.telegram.org y **el inicio de sesión de Mastodon** ya no te sacan a Chrome: autorizas dentro de Fusion y la app captura el retorno `fusion://oauth` sola, sin copiar códigos a mano (queda el pegado manual como respaldo si tu instancia no redirige).

> Nota: el navegador integrado exige Android 8 (antes 7). Si tu teléfono es anterior, dímelo y compilo una variante sin ese componente.

## Sobre compilar el fork del Telegram oficial

Lo intenté en este entorno y **no cabe**: el proyecto oficial pide NDK 27 (~3 GB) y del orden de 6 GB de RAM para Gradle. Aquí hay 2 núcleos y ~1,5 GB libres — de hecho la compilación de esta app, que es diminuta en comparación, ya necesitó ajustar el heap a 1,1 GB y falló varias veces por falta de memoria. El kit `fork-oficial/` deja todo listo para compilarlo gratis en GitHub Actions (runners de 16 GB) en unos 25 minutos.

## Límites actuales

- Adjuntos de Telegram: se marcan como `📎 Adjunto` (la descarga cifrada por MTProto es lo siguiente).
- Sin llamadas ni notificaciones push nativas.
- El entorno de compilación bloquea WebSockets salientes, así que el handshake MTProto no pudo probarse aquí de extremo a extremo; en un teléfono con red normal funciona. Cualquier error aparece en pantalla con su mensaje exacto.

## Compilar

`fusion/BUILD-APK.md` → `npm run apk`.
