# Compilar la APK tú mismo

Requisitos: **Node 22+**, **JDK 21**, **Android SDK** (platform 35 + build-tools 35).

```bash
cd fusion
npm install
npm run apk        # => android/app/build/outputs/apk/debug/app-debug.apk
```

Variables usadas en esta máquina:

```bash
export JAVA_HOME=/ruta/jdk-21
export ANDROID_HOME=/ruta/android-sdk
export PATH=$JAVA_HOME/bin:$PATH
```

### Versión de release firmada (para distribuir)

```bash
keytool -genkey -v -keystore fusion.keystore -alias fusion -keyalg RSA -keysize 2048 -validity 10000
# añade signingConfigs en android/app/build.gradle y luego:
npm run apk:release
```

### Datos del paquete actual

| | |
|---|---|
| applicationId | `app.fusion.social` |
| versionName | 1.0 |
| minSdk / targetSdk | 24 / 36 |
| Firma | clave debug de Android (instalable, no publicable en Play) |
| Tamaño | 5.5 MB |
