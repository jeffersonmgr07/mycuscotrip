# Quote Package V33 - Ajuste móvil, reserva y PayPal

## Archivos modificados

- `quote-packages.html`
- `assets/css/quote-packages.css`
- `js/pages/quote-packages.js`

## Cambios aplicados

1. **Panel inferior móvil corregido**
   - Se agregó el botón móvil `Ver más / Ver menos`.
   - En móvil, el resumen ahora se despliega como bottom sheet hacia arriba.
   - El panel inferior queda por encima del contenido y ya no es tapado por el botón flotante de WhatsApp.
   - Cuando el resumen está expandido o se abre el modal de reserva, el botón flotante de WhatsApp se oculta para evitar superposición.

2. **Botones móviles simplificados**
   - Se eliminó visualmente y del HTML el botón `Descargar PDF`.
   - Se mantiene solo `Imprimir` y `Iniciar reserva`.
   - El botón principal antes decía `Pagar`; ahora dice `Iniciar reserva` en escritorio y `Reservar` en móvil.

3. **Modal de reserva agregado al Quote Package**
   - El botón `Iniciar reserva` abre un modal nuevo similar al flujo de Peru Nature.
   - El modal genera formularios dinámicos según la cantidad de pasajeros elegida.
   - El pasajero 1 es obligatorio para habilitar PayPal.
   - Los demás pasajeros quedan colapsados y opcionales para no hacer pesado el flujo.

4. **PayPal integrado en el modal**
   - Se agregó el SDK de PayPal en modo sandbox: `client-id=sb`.
   - El pago se procesa en USD.
   - Si la cotización está en PEN, el monto a pagar se convierte a USD usando el tipo de cambio del cotizador.
   - El monto enviado a PayPal es el `advance` si el modo de pago es anticipo, o el total si el modo es pago completo.
   - Se dejó preparado soporte opcional para backend con `window.MCT_QUOTE_APPS_SCRIPT_URL` o `window.MCT_APPS_SCRIPT_URL`.

## Cómo se calcula la cotización actualmente

El archivo principal de lógica es `js/pages/quote-packages.js`.

### 1. Datos cargados

El cotizador carga estos JSON:

- `assets/data/packages-cusco.json`: configuración general del motor de paquetes, reglas de duración y tipo de cambio referencial.
- `assets/data/tours-cusco.json`: tours simples de Cusco y sus precios publicados.
- `assets/data/tours-machu-picchu.json`: tours de Machu Picchu, reglas de tren y precios por nacionalidad.
- `assets/data/trekkings-cusco.json`: trekkings o experiencias adicionales.
- `assets/data/hotels.json`: hoteles, habitaciones y tarifas por noche.
- `assets/data/trains.json`: trenes, rutas, horarios, empresas y precios por adulto/niño.
- `assets/data/discount-codes.json`: cupones manuales.

### 2. Precio base de tours

Cada tour toma precio publicado desde:

- `tour.nationalityPricing[nationality][adult/child]`, si existe.
- Si no existe, usa `tour.basePricing[adult/child]`.
- Si no existe, usa valores alternativos como `price`, `adult`, `basePrice`.

El paquete suma adultos y niños según la cantidad elegida.

### 3. Hoteles

Los hoteles se toman de `assets/data/hotels.json`, agrupados por destino.

El sistema calcula noches según el itinerario:

- Cusco.
- Aguas Calientes, cuando el paquete requiere noche previa o conexión a Machu Picchu.

Después arma combinaciones de habitaciones compatibles con la cantidad de pasajeros. El precio del hotel se calcula así:

`precio habitación por noche × número de noches`

Si el usuario elige `Sin hotel`, el costo de alojamiento es 0.

### 4. Trenes

Los trenes se toman de `assets/data/trains.json`.

El sistema filtra por:

- dirección: ida o retorno,
- ruta permitida,
- horario compatible,
- nacionalidad,
- empresa elegida en la ida para filtrar el retorno,
- reglas del tour Machu Picchu seleccionado.

El precio se calcula así:

`precio adulto tren × adultos + precio niño tren × niños`

Luego se convierte a la moneda visible del cotizador.

### 5. Extras

Los extras vienen de los tours disponibles o de servicios adicionales compatibles. Solo se suman cuando el usuario los marca.

### 6. Descuentos y modalidad de pago

El subtotal se calcula así:

`base tours + hoteles + trenes + extras`

Luego aplica:

- cupón manual, si existe;
- o descuento automático de 5% si elige pago 100% y no hay cupón manual.

El total final queda así:

`subtotal - descuentos`

Si se elige anticipo, el sistema cobra ahora:

`USD 49.90 × número de pasajeros`

convertido a la moneda visible. El saldo queda como pendiente.

## Sobre cargos ocultos

En el cálculo actual del `quote-packages.js` no se está agregando una comisión separada de PayPal ni una línea oculta adicional al final del resumen.

Pero algunos JSON sí pueden tener precios ya protegidos comercialmente. Por ejemplo, ciertos catálogos describen precios publicados pensados para cubrir descuentos o comisiones. Eso significa que el margen puede estar embebido dentro del precio publicado del tour, no agregado como una línea extra al final.

## Recomendación para pasar precios a Google Sheets

Para afinar precios manualmente, conviene migrar primero estos catálogos a Google Sheets:

1. `Tours_Precios`
   - código del tour,
   - nombre,
   - precio adulto nacional,
   - precio niño nacional,
   - precio adulto extranjero,
   - precio niño extranjero,
   - moneda,
   - activo.

2. `Hoteles_Tarifas`
   - código hotel,
   - destino,
   - categoría,
   - tipo habitación estándar,
   - tipo habitación superior,
   - precio por noche,
   - moneda,
   - vigencia desde/hasta.

3. `Trenes_Tarifas`
   - empresa,
   - servicio,
   - ruta,
   - código tren,
   - hora salida,
   - hora llegada,
   - adulto,
   - niño,
   - moneda,
   - activo.

4. `Reglas_Paquetes`
   - duración,
   - tours compatibles,
   - si requiere Machu Picchu,
   - si requiere noche en Aguas Calientes,
   - reglas de llegada/salida.

La forma más segura es crear un Apps Script que publique esos datos como JSON y que el HTML consuma ese endpoint. Así mantienes el frontend estático en GitHub Pages, pero administras precios desde Google Sheets.
