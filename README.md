# Fusion — Telegram × Mastodon

Proyecto completo para seguir sacando versiones tú mismo. Tres caminos vivos, del más rápido al más definitivo.

> **La app que se distribuye es el fork del Telegram oficial** (`fork-oficial/`):
> el Telegram real tal cual —grabadora de audio, visor de archivos, llamadas,
> stickers, carpetas, temas— con el **muro de Mastodon como única añadidura**,
> firmado con la llave de Fusion. El cliente propio (`app/`) es el laboratorio
> donde se prueban ideas rápido antes de portarlas al fork.

```
proyecto/
├── app/                  cliente propio (React + Capacitor) → Fusion-x.y.apk
├── inyeccion/            inyecta el muro en el APK OFICIAL de Telegram → Telegram-Fusion-x.y.apk
├── fork-oficial/         fork del código fuente oficial (la vía definitiva)
├── ci/                   flujos de GitHub Actions para compilar sin PC
├── llaves/fusion.keystore  MISMA firma que tus APKs actuales ← no la pierdas
├── scripts/              preparar entorno y compilar
└── docs/                 esencia, historial y decisiones
```

---

## La esencia en un párrafo

Una sola app donde **Telegram y Mastodon dejan de ser dos mundos**: el muro trae el timeline del fediverso mezclado con las publicaciones de tus canales, los chats de Telegram y los mensajes directos de Mastodon comparten bandeja, y lo que escribes puede salir a las dos redes a la vez. Todo funciona **contra los servidores de ellos, sin backend propio**: MTProto real para tu cuenta personal de Telegram y la API de tu instancia de Mastodon, con la sesión guardada solo en tu teléfono. Encima de eso, las utilidades que los forks cobran: modo fantasma, anti-eliminación, reenvío sin autor, bloqueo por código, temas y visor de archivos.

---

## Los tres caminos

### 1. `app/` — el cliente propio (laboratorio, no es la app final)

React + Vite dentro de Capacitor. Habla MTProto desde el WebView con GramJS.
Sirve para iterar el muro en minutos y para el APK de laboratorio; **la app que
se instala es el fork** (apartado 3), que trae el Telegram oficial completo.

```bash
export JAVA_HOME=… ANDROID_HOME=…      # ver scripts/setup-entorno.sh
./scripts/build-fusion-apk.sh          # → Fusion-<versión>.apk
```

Sube la versión en `app/android/app/build.gradle` (`versionCode` y `versionName`) antes de compilar.

### 2. `inyeccion/` — el Telegram oficial con el muro dentro

> ⚠️ **Esta vía conserva el paquete oficial** (`org.telegram.messenger.web`), así
> que **no convive con el Telegram que ya tengas instalado** (Android la ve como
> la misma app y da conflicto). Sirve como atajo rápido; para instalar *junto* a
> tu Telegram normal usa el **fork** (apartado 3), que cambia el paquete.

Descarga el APK oficial más reciente, le añade la pantalla del muro y lo firma con **tu** llave:

```bash
export ANDROID_HOME=…
./inyeccion/build-telegram-fusion.sh   # → Telegram-Fusion-<versión de Telegram>.apk
```

Repite el comando cuando Telegram publique versión nueva: como se firma con la misma llave, se instala encima sin perder la sesión.

### 3. `fork-oficial/` — el fork por código fuente (definitivo)

```bash
cd fork-oficial && ./setup.sh
```

Clona el repositorio oficial, aplica los parches (paquete, claves, nombre, Activity del muro) y deja el flujo de compilación listo. Necesita ~8 GB de RAM y el NDK 27 → compílalo en GitHub Actions con `ci/build-telegram-fork.yml`.

---

## Compilar sin ordenador potente

Copia el flujo que quieras a `.github/workflows/` de tu repositorio:

| Archivo | Qué produce |
|---|---|
| `ci/build-fusion.yml` | APK del cliente propio |
| `ci/build-telegram-inyectado.yml` | Telegram oficial + muro (se actualiza solo cada lunes) |
| `ci/build-telegram-fork.yml` | APK del fork compilado desde el código fuente |

---

## La llave de firma

`llaves/fusion.keystore` (contraseña y alias: `android` / `androiddebugkey`) es la que firma tus APKs actuales. **Consérvala**: si firmas una actualización con otra llave, Android obligará a desinstalar y perderás la sesión y los ajustes de la app.

⚠️ **No subas la llave al repositorio** — está en `.gitignore` (`llaves/*.keystore`). Guárdala aparte (un gestor de contraseñas, un pendrive, etc.).

---

## Subir a GitHub

```bash
cd fusion
git init
git add -A
git commit -m "Fusion 2.0"
git tag v2.0
git remote add origin https://github.com/TU_USUARIO/Fusion.git
git push -u origin main --tags
```

Los artefactos (APKs, `node_modules/`, `build/`, la llave de firma) ya quedan
fuera gracias a `.gitignore`, así que el push sube solo el código fuente.

## Publicar en F-Droid

Todo está preparado en `fdroid/`: la receta de compilación
(`metadata/app.fusion.social.yml`) y las instrucciones paso a paso
(`fdroid/README.md`). En resumen: sube el repo público a GitHub, crea el tag
`v2.0` y manda la receta a `fdroiddata` (o pide la inclusión por la web).

## Licencia

**GPL-3.0** (`LICENSE`). El cliente de Telegram del que parte el fork es
GPLv2; el cliente propio (`app/`) y todo el kit de este repositorio se
publican bajo GPL-3.0 para que cualquiera pueda copiar, estudiar y mejorar.

---

## Documentación

- `docs/ESENCIA.md` — qué es esto, qué principios lo guían y a dónde va.
- `docs/HISTORIAL.md` — todas las versiones, los bugs que costaron sangre y cómo se resolvieron.
- `docs/ARQUITECTURA.md` — mapa del código, dónde tocar cada cosa.
