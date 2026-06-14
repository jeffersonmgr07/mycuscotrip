# V56 - Verificación JSONP y confirmación de registro limpia

- `verify-owner.html` deja de usar iframe/postMessage y verifica con JSONP directo al Apps Script.
- Esto usa el mismo mecanismo que ya funciona para registrar usuarios desde GitHub Pages.
- Al registrar correctamente, el formulario se limpia y se oculta.
- Se muestra una pantalla amable: “Revisa tu correo y verifica tu cuenta”.
- Se mantiene botón para ir al acceso y botón para registrar otra cuenta.
- Se actualizó caché a `?v=56`.
