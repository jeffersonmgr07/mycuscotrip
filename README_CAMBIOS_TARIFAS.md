# My Cusco Trip - Fix tarifas quote-packages v80

Archivos modificados:

- `quote-packages.html`
- `assets/js/pages/quote-packages.js`
- `assets/css/quote-packages.css`

Cambios principales:

1. Tours base se calculan desde costos operativos en PEN x 1.5.
2. Machu Picchu se desglosa en guía + entrada + bus, según nacionalidad, sin incluir tren.
3. Recojo aeropuerto y traslado final se agregan al precio base por pasajero.
4. Hoteles usan `room.netCost` x 1.2 cuando el dato existe.
5. Extras/tickets se cobran separados, sin 1.5 general y sin descuentos.
6. Boleto turístico general reemplaza los boletos parciales cuando hay más de un tour que lo requiere.
7. Se evita que cupones y descuento de pago total afecten extras/tickets.
8. Se redondean importes comerciales hacia arriba a múltiplos de 0.50.

Nota:
El archivo activo del cotizador raíz es `quote-packages.html` (plural). El usuario lo mencionó como `quote-package.html`, pero en el proyecto existe como `quote-packages.html`.
