# Llave de firma

`fusion.keystore` firma todos los APKs del proyecto.

| dato | valor |
|---|---|
| contraseña del almacén | `android` |
| alias | `androiddebugkey` |
| contraseña de la clave | `android` |

**Consérvala.** Android sólo deja instalar una actualización encima si va firmada con la misma llave; con otra distinta habría que desinstalar, y se pierden la sesión de Telegram y los ajustes.

Es una clave de depuración: sirve para instalar por tu cuenta, no para publicar en Google Play. Para la tienda, genera una propia:

```bash
keytool -genkeypair -keystore play.keystore -alias fusion -keyalg RSA -keysize 2048 -validity 10000
```
