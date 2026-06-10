# Cambios V35 - Navegación, Hoteles y Quote Package

## Navegación principal
Se reestructuró el menú principal para dejar solo cinco opciones visibles:

1. Experiencias
   - Tours a Machu Picchu → `machu-picchu-tours.html`
   - Tours en Cusco → `cusco-tours.html`
   - Paquetes completos Cusco → `paquetes-cusco.html`
   - Paquetes completos Perú → `explora-peru.html`
2. Trekking
   - Camino Inca
   - Ruta Machu Picchu
   - Inca Jungle
3. Restaurantes → `/restaurantes/`
4. Hoteles → `hoteles.html`
5. Trenes → `/trenes/`

También se corrigió el comportamiento del dropdown en móvil para que al tocar Experiencias o Trekking se abra el submenú en lugar de navegar de inmediato.

## Nuevo HTML de hoteles
Se creó `hoteles.html` con vitrina de hoteles tipo cards. La información se carga desde:

`assets/data/hotels.json`

Cada hotel permite:
- Filtrar por destino.
- Buscar por nombre, destino, dirección o ubicación.
- Abrir un modal de detalle.
- Elegir fecha de entrada y salida.
- Elegir adultos, niños y tipo de habitación.
- Enviar solicitud de disponibilidad por WhatsApp.

Archivos nuevos:

- `hoteles.html`
- `assets/css/hoteles.css`
- `assets/js/pages/hoteles.js`

## Quote Package
Cambios realizados:

- El botón principal ahora dice solo `Reservar` tanto en escritorio como en móvil.
- Se cambió el verde del botón a un tono más claro.
- En móvil, el botón Imprimir queda con fondo gris claro, borde verde oscuro y letras verde oscuro.
- En el modal de hoteles, la opción sin hotel ahora es compacta y dice solo `Opción sin hotel` con precio `0.00` según la moneda seleccionada.
- Se redujeron las etiquetas/gadgets de características de hoteles en móvil.
- Se eliminó la repetición `Desayuno: Desayuno semi buffet`; ahora queda solo `Desayuno semi buffet`.
- En las tarjetas de tren del modal se quitaron textos de notas/capturas/rutas largas. Ahora quedan solo título, logo, salida, llegada y precio.
- En el recuadro de tren seleccionado, el logo de PeruRail/IncaRail ocupa todo el espacio asignado, sin padding blanco innecesario.

## Archivos modificados principales

- `components/header.html`
- `assets/js/components/header.js`
- `assets/css/header.css`
- `quote-packages.html`
- `assets/js/pages/quote-packages.js`
- `assets/css/quote-packages.css`
- `assets/data/ui-translations.json`
- `assets/data/i18n/*/ui-translations.json`
