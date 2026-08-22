#!/usr/bin/env bash
# Instala JDK 21, Node 22 y el SDK de Android en /opt/tc (Linux x64).
set -e
DEST="${1:-/opt/tc}"
sudo mkdir -p "$DEST" && sudo chown "$USER" "$DEST"
cd "$DEST"

echo "==> JDK 21"
[ -d jdk-21* ] || { curl -sL -o jdk.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse"; tar xzf jdk.tar.gz; }

echo "==> Node 22"
[ -d node-v22* ] || { curl -sL -o node.tar.xz https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz; tar xf node.tar.xz; }

echo "==> SDK de Android"
if [ ! -d sdk/cmdline-tools ]; then
  curl -sL -o cmdline.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q cmdline.zip && mkdir -p sdk/cmdline-tools && mv cmdline-tools sdk/cmdline-tools/latest
fi
export JAVA_HOME="$DEST/$(ls -d jdk-21* | head -1)"
export PATH="$JAVA_HOME/bin:$PATH"
yes | sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root="$DEST/sdk" --licenses >/dev/null
sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root="$DEST/sdk" "platform-tools" "platforms;android-35" "platforms;android-36" "build-tools;35.0.0" >/dev/null

cat <<FIN

  Listo. Añade esto a tu shell:

    export JAVA_HOME=$DEST/$(ls -d jdk-21* | head -1)
    export ANDROID_HOME=$DEST/sdk
    export PATH=\$JAVA_HOME/bin:$DEST/$(ls -d node-v22* | head -1)/bin:\$PATH

FIN
