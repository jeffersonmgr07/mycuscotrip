# V44 - Hoteles: buscador con calendario compacto + marketplace hotelero inicial

## 1. Buscador del hero

La barra del hero ahora tiene:

- Destino
- Buscar hotel
- Entrada / Salida con calendario de rango compacto
- Categoría
- Botón Buscar

El calendario del hero replica el comportamiento del modal: se abre al tocar Entrada o Salida, se elige entrada y salida en el mismo calendario y se confirma con OK.

Reglas:

- Entrada mínima: mañana.
- Salida mínima: un día después de entrada.
- Si no se eligen fechas, se muestran hoteles por destino, nombre y categoría.
- Si se eligen fechas, se filtra según disponibilidad configurada en el hotel.

## 2. Fechas del hero conectadas al modal

Cuando el cliente elige fechas en el hero y luego abre un hotel, el modal toma automáticamente esas fechas como entrada y salida inicial.

El cliente puede modificarlas dentro del modal si desea.

## 3. Carpeta Hoteles consolidada

La sección principal vive en:

```text
hoteles/index.html
hoteles/assets/css/hoteles.css
hoteles/assets/js/pages/hoteles.js
hoteles/assets/data/hotels.json
```

`hoteles.html` en la raíz queda como redirección para no romper enlaces antiguos.

## 4. Marketplace hotelero inicial

Se agregaron páginas base:

```text
hoteles/registro-hotelero.html
hoteles/login-hotelero.html
hoteles/panel-hotelero.html
hoteles/assets/js/pages/hotel-marketplace.js
```

El panel permite empezar a visualizar:

- Registro de hotelero.
- Login demo.
- Crear alojamiento: hotel, apartamento o habitación.
- Crear habitación.
- Bloquear fechas.
- Definir modo de confirmación: instantánea o manual.

## 5. Apps Script marketplace

Se amplió:

```text
hoteles/backend/google-apps-script-hoteles-marketplace.gs
```

Nuevas acciones preparadas:

- register_owner
- create_property
- create_room
- block_dates
- update_confirmation_mode
- create_order

## 6. Archivos antiguos que puedes borrar

Como Hoteles ya vive dentro de `hoteles/`, puedes borrar estos archivos antiguos de la raíz si existen:

```text
assets/css/hoteles.css
assets/js/pages/hoteles.js
google-apps-script-hoteles.gs
```

No borres todavía:

```text
assets/data/hotels.json
assets/img/hotels/
```

porque el Quote Package todavía puede seguir usando el catálogo y fotos globales.

Tampoco borres:

```text
hoteles.html
```

porque funciona como redirección hacia `/hoteles/`.

## 7. PayPal: confirmación instantánea vs manual

Para confirmación instantánea se puede usar el flujo actual de captura inmediata.

Para confirmación manual tipo Airbnb se debe usar PayPal con autorización y captura posterior:

- El cliente autoriza el pago.
- La reserva queda pendiente de confirmación.
- El hotelero confirma desde su panel o enlace.
- El backend / Apps Script captura el pago autorizado.

Esto requiere backend/AppScript con Client Secret. El Secret nunca debe estar en HTML.
