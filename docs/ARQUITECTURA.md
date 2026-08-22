# Mapa del código

## `app/src`

| Archivo | Responsabilidad |
|---|---|
| `main.jsx` | Fija **una sola clase `Buffer`** global (crítico para GramJS) y monta la barrera de errores |
| `App.jsx` | Estado global, navegación por pestañas, unificación de muro y conversaciones, reenvío, bloqueo con código |
| `lib/tgUser.js` | MTProto: login, diálogos, historial, envío, borrado, reenvío, reacciones, adjuntos, voz, sesiones, contactos, grupos |
| `lib/useTgUser.js` | Hook que expone todo lo anterior a la interfaz con actualizaciones optimistas y eventos en vivo |
| `lib/mastodon.js` | OAuth dinámico (web y `fusion://` en móvil), API REST y normalización al formato del muro |
| `lib/telegram.js` | Bot API opcional (canales donde el bot es admin) |
| `lib/inapp.js` | Navegador integrado: enlaces y OAuth **sin salir de la app** |
| `lib/settings.js` | Preferencias locales y aplicación del tema |
| `screens/` | `Login`, `Chats`, `Chat`, `ChatInfo`, `NewChat`, `Wall`, `Compose`, `Profile`, `MediaViewer` |
| `ui/` | `icons.jsx` (SVG en línea), `bits.jsx` (avatar, fechas, vacíos, error), `audio.jsx` (reproductor y grabadora), `boundary.jsx` |

## Reglas aprendidas a golpes

1. **Hooks siempre antes de cualquier `return` condicional.** Un `useEffect` colado después provocó la pantalla negra de la 1.9.
2. **Una única copia de `buffer` en el bundle.** GramJS valida con `instanceof Buffer`; dos copias rompen el login ("Bytes or str expected").
3. **`telegram/events` sólo exporta `NewMessage`.** `EditedMessage` y `DeletedMessage` se importan de su propio módulo, o sale "n is not a constructor".
4. **La verificación en dos pasos necesita `srp_B`.** GramJS lee ese nombre pero el servidor devuelve `srpB`: hay que puentearlos.
5. **Tras iniciar sesión hay que recargar la sesión** (`tgu.reload()`), o la app se queda en la pantalla de acceso aunque el login haya ido bien.
6. **Nada de `top-level await`** en el punto de entrada: rompe WebViews antiguos.
7. **`/tmp` es memoria RAM** en entornos pequeños: un clon grande ahí mata las compilaciones.

## Añadir una función nueva

1. Método en `lib/tgUser.js` (llamada MTProto pura, sin React).
2. Envoltorio en `lib/useTgUser.js` con actualización optimista del estado.
3. Interfaz en la pantalla correspondiente.
4. Prueba de humo: renderiza la pantalla con `react-dom/server` para cazar errores antes de compilar el APK.

## Versionado

`app/android/app/build.gradle` → `versionCode` (entero, +1) y `versionName`. Firma siempre con `llaves/fusion.keystore` para que la actualización se instale encima.
