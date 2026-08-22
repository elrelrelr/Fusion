#!/usr/bin/env python3
"""Package and v1-sign a minimal Fusion APK."""
import os, subprocess, base64, hashlib, zipfile, tempfile, shutil

def b64(b):
    return base64.b64encode(b).decode()

def jar_digest(data):
    # JAR uses base64 of raw digest
    return b64(data)

def build_manifest(entries):
    # entries: list of (name, content_bytes)
    out = b"Manifest-Version: 1.0\r\n"
    out += b"Created-By: 1.0 (Fusion)\r\n\r\n"
    for name, content in entries:
        out += b"Name: " + name.encode() + b"\r\n"
        out += b"SHA-256-Digest: " + jar_digest(hashlib.sha256(content).digest()).encode() + b"\r\n"
        out += b"SHA1-Digest: " + jar_digest(hashlib.sha1(content).digest()).encode() + b"\r\n\r\n"
    return out

def build_sf(manifest_bytes, entries):
    out = b"Signature-Version: 1.0\r\n"
    out += b"Created-By: 1.0 (Fusion)\r\n"
    out += b"SHA-256-Digest-Manifest: " + jar_digest(hashlib.sha256(manifest_bytes).digest()).encode() + b"\r\n\r\n"
    # per-entry: digest of the manifest section
    idx = 0
    for name, content in entries:
        # find the section in manifest_bytes for this name
        marker = b"Name: " + name.encode() + b"\r\n"
        start = manifest_bytes.find(marker)
        end = manifest_bytes.find(b"\r\n\r\n", start) + 4
        section = manifest_bytes[start:end]
        out += b"Name: " + name.encode() + b"\r\n"
        out += b"SHA-256-Digest: " + jar_digest(hashlib.sha256(section).digest()).encode() + b"\r\n\r\n"
        idx += 1
    return out

def sign_sf(sf_bytes, key, cert, out_rsa):
    with tempfile.NamedTemporaryFile("wb", delete=False, suffix=".sf") as f:
        f.write(sf_bytes); sf_path = f.name
    subprocess.run(
        ["openssl", "smime", "-sign", "-binary", "-in", sf_path,
         "-out", out_rsa, "-outform", "DER", "-inkey", key, "-signer", cert,
         "-noattr"],
        check=True, capture_output=True)
    os.unlink(sf_path)

def main():
    # 1. generate key + self-signed cert (if not present)
    key, cert = "fusion.key.pem", "fusion.cert.pem"
    if not (os.path.exists(key) and os.path.exists(cert)):
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048",
                        "-keyout", key, "-out", cert, "-days", "10000",
                        "-nodes", "-subj", "/CN=Fusion/O=Fusion/C=US"],
                       check=True, capture_output=True)

    # 2. entries (content files, stored)
    files = {
        "AndroidManifest.xml": open("AndroidManifest.xml", "rb").read(),
        "classes.dex": open("classes.dex", "rb").read(),
    }
    entries = sorted(files.items(), key=lambda kv: kv[0])

    manifest = build_manifest(entries)
    sf = build_sf(manifest, entries)
    sign_sf(sf, key, cert, "CERT.RSA.tmp")

    # 3. write apk zip
    apk = "Fusion-1.7-improved.apk"
    with zipfile.ZipFile(apk, "w", zipfile.ZIP_STORED) as z:
        for name, content in entries:
            z.writestr(name, content)
        z.writestr("META-INF/MANIFEST.MF", manifest)
        z.writestr("META-INF/CERT.SF", sf)
        with open("CERT.RSA.tmp", "rb") as f:
            z.writestr("META-INF/CERT.RSA", f.read())
    os.unlink("CERT.RSA.tmp")
    print("Wrote", apk, os.path.getsize(apk), "bytes")

if __name__ == "__main__":
    main()
