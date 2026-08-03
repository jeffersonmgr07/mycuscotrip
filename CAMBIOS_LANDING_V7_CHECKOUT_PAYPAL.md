# My Cusco Trip — Landing V7

Fecha: 3 de agosto de 2026

## Alcance

Corrección puntual del checkout de la landing `machu-picchu-y-tours-peru.html` en español, inglés y portugués. No se modificaron precios, tours, estructura del hero, cards ni lógica de selección.

## Cambios

1. **WhatsApp en una sola línea**
   - El selector de prefijo internacional y el número aparecen en la misma fila en escritorio y móvil.
   - El prefijo mantiene un ancho compacto de 76–78 px y el número usa el espacio restante.

2. **Pantalla de procesamiento al pagar**
   - El botón conserva el texto `Pagar / Pay / Pagar`.
   - Al pulsarlo se bloquea temporalmente la interfaz con un overlay, spinner y mensajes localizados:
     - Generando tu reserva.
     - Conectando de forma segura con PayPal.
   - Si ocurre un error, el overlay se cierra, el botón se reactiva y se muestra el mensaje del backend.

3. **Jerarquía y espaciado del resumen**
   - Se añadió separación entre las tarjetas de titular/recojo y el encabezado de Servicios.
   - El total final y el monto superior usan un peso medio para mejorar lectura sin verse excesivamente gruesos.
   - El código de reserva se muestra con un peso menor.

4. **Cancelación de PayPal**
   - La orden envía, además de los datos anteriores, la página de origen y URLs de retorno/cancelación.
   - Si el backend continúa enviando al usuario a `product.html`, `product.js` reconoce que la reserva nació en la landing y redirige a la landing correspondiente en ES/EN/PT.
   - La landing recupera la pre-reserva guardada en el navegador, restaura selección y pasajeros, abre directamente `Resumen de tu reserva` y deja disponible nuevamente el botón Pagar.
   - Se aceptan parámetros `payment/paypal` y `reservationCode/codigo/code` para mayor compatibilidad.

## Archivos modificados

- `assets/css/landing-reservation-modal.css`
- `assets/js/pages/landing-machu-picchu-tours.js`
- `assets/js/pages/landing-machu-picchu-tours-en.js`
- `assets/js/pages/landing-machu-picchu-tours-pt.js`
- `assets/js/pages/product.js`
- Landing HTML ES/EN/PT
- `product.html` en los ocho idiomas, únicamente para actualizar la versión de caché de `product.js`.

## Caché

Los recursos modificados usan la versión `20260803-7`.

## Validación pendiente en producción

Debe realizarse una prueba real de cancelación en PayPal con el Apps Script desplegado. El frontend contempla tanto el uso de la `cancelUrl` enviada al backend como un redireccionamiento de respaldo desde `product.html` en el mismo navegador.
