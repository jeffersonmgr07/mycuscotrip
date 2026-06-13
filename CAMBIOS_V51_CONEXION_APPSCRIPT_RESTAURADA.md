# V51 · Conexión Apps Script restaurada

Se comparó V48, V49 y V50. La V49/V50 centralizó la URL en `hoteles/assets/js/config.js`, pero eliminó la variable inline que antes era fácil de verificar en los HTML.

En esta versión se aplican ambas formas para evitar fallos:

- `hoteles/assets/js/config.js` contiene la URL `/exec`.
- `register-manager-hotel.html`, `login-admin-hotel.html` y `panel-admin-hotel.html` vuelven a declarar la URL inline antes de cargar `config.js` y `hotel-marketplace.js`.
- `hoteles/index.html` también usa la URL para reservas de hoteles.
- Se actualizó la caché a `?v=51`.

URL configurada:

```text
https://script.google.com/macros/s/AKfycbx7zclo0SnYqT0NMP6Uph3oB9XbTGeIIoWj6hWZ7lx2s3ftWMmIpshJ-XtgjEuijsLN/exec
```

PayPal Client ID configurado:

```text
AUdRf58xVpVo-Iv_L_Je8UgE6ukF79cLynwRXUk3wU9WA4bfremVO0yRpkS3kFTUOE7O5ZOfoWMw8TlJ
```

Archivos clave:

```text
hoteles/assets/js/config.js
hoteles/assets/js/pages/hotel-marketplace.js
hoteles/register-manager-hotel.html
hoteles/login-admin-hotel.html
hoteles/panel-admin-hotel.html
hoteles/index.html
```
