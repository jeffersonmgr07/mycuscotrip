# V57 - Verificación por redirección segura y estable

## Problema detectado
La URL del Apps Script respondía correctamente al probar manualmente:

```js
test({"ok":false,"error":"Enlace no válido o ya usado."});
```

Eso confirma que el Apps Script estaba bien desplegado. El fallo estaba en la forma en que `verify-owner.html` intentaba leer la respuesta desde el dominio público.

## Corrección definitiva
Se reemplazó el intento de verificación por JSONP/iframe por un flujo de redirección:

1. El correo abre `https://www.mycuscotrip.com/hoteles/verify-owner.html?token=...`.
2. Esa página muestra “Verificando tu cuenta”.
3. Redirige al Apps Script con `action=verify_owner_redirect`.
4. Apps Script verifica el token en Google Sheet.
5. Apps Script redirige de vuelta a MyCuscoTrip con `status=success` o `status=error`.
6. `verify-owner.html` muestra el resultado final en el dominio propio.

## Archivos modificados

- `hoteles/verify-owner.html`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `hoteles/assets/js/config.js`
- `CAMBIOS_V57_VERIFICACION_REDIRECT.md`

## Importante
Después de copiar el nuevo Apps Script, se debe implementar una nueva versión del Web App.
