#!/usr/bin/env python3
"""
Parches de Fusion sobre el código oficial de Telegram Android.
Idempotente: se puede ejecutar varias veces sin duplicar cambios.

Qué toca (y por qué es seguro):
  1. gradle.properties  -> nombre de paquete y versión propios
  2. BuildVars.java     -> api_id / api_hash de la app
  3. strings.xml        -> nombre visible "Fusion"
  4. AndroidManifest    -> añade la Activity del muro de Mastodon
  5. copia MastodonActivity.java

No toca la UI interna de Telegram, así que sobrevive a las actualizaciones
del código oficial: todas las funciones nativas (audios, archivos, llamadas,
stickers, carpetas, temas…) siguen intactas.
"""
import os, re, shutil, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'telegram-fusion'
HERE = os.path.dirname(os.path.abspath(__file__))

APP_ID = os.environ.get('FUSION_API_ID', '2496')
APP_HASH = os.environ.get('FUSION_API_HASH', '8da85b0d5bfe62527e5b244c209159c3')
PACKAGE = os.environ.get('FUSION_PACKAGE', 'app.fusion.messenger')
APP_NAME = os.environ.get('FUSION_NAME', 'Fusion')


def edit(path, fn, label):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        print(f'    !! no encontrado: {path} (se omite {label})')
        return False
    src = open(full, encoding='utf-8').read()
    out = fn(src)
    if out is None or out == src:
        print(f'    ·  {label}: sin cambios (ya aplicado)')
        return True
    open(full, 'w', encoding='utf-8').write(out)
    print(f'    ✓  {label}')
    return True


# 1 ── identidad del paquete -------------------------------------------------
def gradle_props(s):
    s = re.sub(r'APP_PACKAGE=.*', f'APP_PACKAGE={PACKAGE}', s)
    s = re.sub(r'APP_VERSION_NAME=.*', 'APP_VERSION_NAME=1.0-fusion', s)
    if 'org.gradle.jvmargs' not in s:
        s += '\norg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m\n'
    return s


# 2 ── claves de la API ------------------------------------------------------
def buildvars(s):
    s = re.sub(r'public static int APP_ID = \d+;',
               f'public static int APP_ID = {APP_ID};', s)
    s = re.sub(r'public static String APP_HASH = "[^"]*";',
               f'public static String APP_HASH = "{APP_HASH}";', s)
    return s


# 3 ── nombre visible --------------------------------------------------------
def strings(s):
    return re.sub(r'(<string name="AppName">)[^<]*(</string>)',
                  rf'\1{APP_NAME}\2', s)


# 4 ── Activity del muro en el manifiesto ------------------------------------
ACTIVITY_XML = '''
        <!-- Fusion: muro de Mastodon -->
        <activity
            android:name="org.telegram.ui.FusionWallActivity"
            android:label="Fusion · Muro"
            android:exported="true"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
            android:theme="@style/Theme.TMessages.Start">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
'''


def manifest(s):
    if 'FusionWallActivity' in s:
        return s
    return s.replace('</application>', ACTIVITY_XML + '    </application>')


def main():
    print(f'    destino: {ROOT}')
    edit('gradle.properties', gradle_props, 'paquete y versión')
    edit('TMessagesProj/src/main/java/org/telegram/messenger/BuildVars.java',
         buildvars, f'api_id {APP_ID}')
    edit('TMessagesProj/src/main/res/values/strings.xml', strings, f'nombre «{APP_NAME}»')
    edit('TMessagesProj/src/main/AndroidManifest.xml', manifest, 'Activity del muro')

    dst = os.path.join(ROOT, 'TMessagesProj/src/main/java/org/telegram/ui/FusionWallActivity.java')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy(os.path.join(HERE, 'java', 'FusionWallActivity.java'), dst)
    print('    ✓  FusionWallActivity.java copiada')

    assets = os.path.join(ROOT, 'TMessagesProj/src/main/assets/fusion/index.html')
    print('    ·  muro web:', 'presente' if os.path.exists(assets) else 'FALTA (ejecuta setup.sh completo)')


if __name__ == '__main__':
    main()
