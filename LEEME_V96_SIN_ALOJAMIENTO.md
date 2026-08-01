# My Cusco Trip V96 — opción sin alojamiento por destino

Producto afectado exclusivamente:

- `pkg_peru_7d6n_humantay`
- `peru-lima-paracas-cusco-machu-picchu-humantay-7-dias-6-noches`

## Cambio aplicado

El modal de alojamientos mantiene preseleccionados los hoteles base de la V94, pero ahora permite retirar cada alojamiento de forma independiente:

- Lima: Arawi Miraflores Express, 2 noches.
- Cusco: Hotel Cusco Boutique, 3 noches.
- Machu Picchu Pueblo: Hotel Luz Garden, 1 noche.

Al elegir **Sin alojamiento**, el sistema descuenta automáticamente del precio del paquete la asignación hotelera incluida para ese destino:

| Destino | Descuento por persona |
|---|---:|
| Lima | USD 79.20 |
| Cusco | USD 76.35 |
| Machu Picchu Pueblo | USD 32.45 |
| Los tres alojamientos | USD 188.00 |

Con los tres hoteles retirados, la tarifa referencial por persona pasa de **USD 1,539.90** a **USD 1,351.90**, antes de descuentos promocionales o ajustes adicionales.

## Comportamiento

- Los tres hoteles siguen apareciendo preseleccionados al abrir el producto.
- La opción sin alojamiento aparece dentro de cada modal de destino.
- La deducción se muestra por persona y en el total de la selección.
- La selección no se pierde al cambiar la cantidad de viajeros.
- El resumen de reserva registra expresamente el destino elegido sin alojamiento.
- Los trenes preseleccionados, el itinerario y el formato de impresión no se modifican.
- Los demás productos conservan su lógica de alojamiento original.

## Archivos funcionales nuevos

- `assets/js/pages/product-v94-no-accommodation.js`
- `assets/css/product-v94-no-accommodation.css`

## Archivos enlazados/actualizados

- `product.html`
- `en/product.html`
- `pt/product.html`
- `fr/product.html`
- `de/product.html`
- `it/product.html`
- `zh/product.html`
- `ja/product.html`
- Los ocho archivos `packages-peru.json` correspondientes.

## Validaciones

- Sintaxis JavaScript verificada con `node --check`.
- Ocho archivos JSON validados.
- Prueba unitaria de la lógica de deducción:
  - Hotel base: ajuste USD 0.00.
  - Sin hotel en Lima: USD -79.20 por persona.
  - Dos pasajeros sin hotel en Lima: USD -158.40 en total.
  - Los tres hoteles retirados: USD -188.00 por persona.
- Se verificó que las funciones originales continúan operando en productos distintos al circuito 7D/6N.
