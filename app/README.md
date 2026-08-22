# Fusion — Mastodon × Telegram

Cliente web que **mezcla ambas redes en una sola interfaz**: el muro del fediverso y los posts de tus canales de Telegram en el mismo timeline, más chats, bots y publicación cruzada.

Funciona **100% en el navegador**. No hay backend, ni servidor mío, ni configuración de tu parte más allá de iniciar sesión: la app habla directo con tu instancia de Mastodon y con `api.telegram.org`.

## Cómo conectarlo (2 minutos)

**Mastodon** — Ajustes → escribe tu instancia (ej. `mastodon.social`) → Entrar.
La app se registra sola como aplicación OAuth en esa instancia, te manda a autorizar y vuelve con sesión iniciada. Nada que crear a mano.

**Telegram** — Ajustes → pega el token de tu bot de [@BotFather](https://t.me/BotFather) (`/newbot`).
- Añade el bot como **administrador** de tus canales → sus publicaciones entran al muro unificado.
- `/setprivacy → Disable` para que lea mensajes de grupo.
- El token se guarda solo en el `localStorage` de tu navegador.

## Qué hace

| Sección | Mastodon | Telegram |
|---|---|---|
| **Muro** | timeline de inicio, favoritos, impulsos, responder | posts de canales en tiempo real (long polling) |
| **Compositor** | publicar con visibilidad (público/no listado/seguidores/directo) | enviar al canal o chat elegido — o **a las dos redes a la vez** |
| **Chats** | mensajes directos (conversaciones) | chats y grupos del bot, con envío |
| **Bots** | — | consola: vincular canales, difundir, registro de actividad |
| **Explorar** | línea federada + búsqueda de cuentas/etiquetas/posts | — |
| **Actividad** | menciones, favoritos, impulsos, seguidores | — |

Sin cuentas conectadas arranca en **modo demostración** con contenido de ejemplo para que veas la interfaz.

## Límites honestos

La Bot API de Telegram es la única vía sin backend: por eso Telegram entra **a través de un bot**, no de tu cuenta personal. Ves los canales donde el bot es admin y los chats que hablan con él. Leer tu cuenta personal de Telegram exigiría MTProto y un servidor — justo lo que quisiste evitar.

## Ejecutar

```bash
cd fusion
npm install
npm run dev      # desarrollo
npm run build    # dist/ estático, súbelo a cualquier hosting (Netlify, Pages, etc.)
```

Al desplegarlo en tu propio dominio, el redirect OAuth se ajusta solo a esa URL.

## Estructura

```
src/
  lib/mastodon.js     OAuth dinámico + API REST + normalización al muro
  lib/telegram.js     Bot API, caché local, unificación de posts
  lib/useTelegram.js  long polling de getUpdates → muro y chats
  components/         Post, Composer
  views/              Chats, Bots, Settings (+ Explorar en App.jsx)
  index.css           tema oscuro glass, aurora animada, responsive
```
