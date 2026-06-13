# V50 · Configuración Apps Script y PayPal

## Cambios aplicados

- Se configuró la URL real del Apps Script en `hoteles/assets/js/config.js`.
- Se configuró el Client ID público de PayPal en `hoteles/assets/js/config.js`.
- Se reemplazó el `client-id=sb` del SDK de PayPal en `hoteles/index.html` por el Client ID real.
- Se actualizó la caché a `v=50` en los HTML del marketplace hotelero.
- También se reemplazó el PayPal sandbox de `quote-packages.html` por el mismo Client ID público indicado.

## Apps Script configurado

```text
https://script.google.com/macros/s/AKfycbx7zclo0SnYqT0NMP6Uph3oB9XbTGeIIoWj6hWZ7lx2s3ftWMmIpshJ-XtgjEuijsLN/exec
```

## PayPal Client ID configurado

```text
AUdRf58xVpVo-Iv_L_Je8UgE6ukF79cLynwRXUk3wU9WA4bfremVO0yRpkS3kFTUOE7O5ZOfoWMw8TlJ
```

## Archivo central

Desde ahora la conexión principal de hoteles se controla en:

```text
hoteles/assets/js/config.js
```
