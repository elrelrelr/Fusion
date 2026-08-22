# La esencia de Fusion

## De qué va

Telegram y Mastodon resuelven mitades distintas de lo mismo. Telegram tiene la mejor mensajería —chats, grupos, canales, bots— pero no tiene muro público federado. Mastodon tiene el muro abierto del fediverso, pero su mensajería es un parche. **Fusion los cose en una sola app**: Telegram gana muro, Mastodon gana chat y bots.

## Principios que no se negocian

1. **Sin backend propio.** El teléfono habla directo con los servidores de Telegram (MTProto) y con la instancia de Mastodon del usuario. Nadie en medio, nada que mantener, nada que espiar.
2. **Las llaves se quedan en el dispositivo.** Sesión de Telegram y token de Mastodon viven en el almacenamiento local. Cerrar sesión los borra.
3. **Nada de salir de la app.** Enlaces, perfiles del fediverso y hasta el login OAuth se abren en el navegador integrado. Si el usuario tiene que ir a Chrome, hemos fallado.
4. **Todo gratis.** Lo que otros forks cobran (modo fantasma, anti-eliminación, temas, reenvío sin autor, bloqueo con código) aquí va incluido.
5. **Los errores se muestran, no se esconden.** Mensaje completo, copiable, con traducción al español y detalle técnico debajo. Nunca una pantalla negra.
6. **El usuario manda sobre sus claves.** Vienen incrustadas para que entrar sea sólo teléfono + código, pero siempre hay una puerta para poner las propias.

## Las tres capas

```
   ┌───────────────────────────────────────────────┐
   │  Interfaz  ·  muro unificado, chats, ajustes  │
   ├───────────────────────────────────────────────┤
   │  Puente    ·  normaliza Telegram y Mastodon   │
   │              a un mismo formato de post/chat  │
   ├───────────────────────────────────────────────┤
   │  Redes     ·  MTProto (GramJS)  |  REST Masto │
   └───────────────────────────────────────────────┘
```

La clave del proyecto es la **capa puente**: cualquier mensaje de canal de Telegram y cualquier publicación de Mastodon se convierten al mismo objeto (`{ id, network, author, html, createdAt, media, stats }`), y cualquier conversación —chat de Telegram, grupo, canal, bot, mensaje directo del fediverso— al mismo objeto de conversación. Por eso el muro puede mezclarlos por hora y la bandeja puede mostrarlos juntos sin casos especiales repartidos por la interfaz.

## Por qué existen tres caminos de compilación

Reescribir Telegram entero es un error: audios, llamadas, visor de documentos, stickers animados y editor de fotos son años de trabajo. La estrategia madura es la de los forks conocidos (iMe, Turrit, Nicegram): **partir del cliente oficial**. Mientras ese fork se termina de integrar, la inyección en el APK oficial da hoy todas las funciones nativas, y el cliente propio sirve de laboratorio rápido donde probar ideas antes de portarlas a Java.

| Camino | Fuerte | Débil |
|---|---|---|
| Cliente propio | itera en minutos, mismo código en web y móvil | nunca igualará al oficial en funciones nativas |
| APK inyectado | Telegram completo hoy mismo | hay que rehacerlo en cada versión; push de Firebase puede fallar por la firma |
| Fork del código | integración real y actualizable con `git pull` | necesita compilarse en la nube (8 GB de RAM) |

## Hacia dónde va

1. Muro como **pestaña nativa** dentro de la lista de chats del fork.
2. **Publicación cruzada** desde el compositor nativo: un mensaje → canal + fediverso.
3. Apartado **«Fusion»** dentro de los Ajustes de Telegram con las utilidades del cliente propio portadas a Java.
4. Conversaciones de Mastodon integradas en la misma lista de chats.
5. Notificaciones push propias para el fediverso.
