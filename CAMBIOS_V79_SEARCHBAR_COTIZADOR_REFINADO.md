# CAMBIOS V79 - Search bar refinado y conectado al cotizador

## Archivos modificados

- `components/search-bar.html`
- `assets/js/components/search-bar.js`
- `assets/js/pages/quote-packages.js`
- `assets/js/pages/product.js`
- `assets/data/ui-translations.json`

## Cambios principales

### 1. Pestaña Tours

Se reemplazó la lista corta por una lista comercial enfocada:

- Machu Picchu Full Day Clásico
- Machu Picchu Full Day Express
- Machu Picchu Overnight 2D/1N
- Machu Picchu Panorámico
- Machu Picchu Luxury Hiram Bingham
- Bienvenida a Cusco
- Todos los tours de Machu Picchu
- Todos los tours de Cusco

Cada producto directo abre `product.html` con parámetros de búsqueda:

```txt
product.html?slug=...&source=home-search&intent=...&adultos=2&ninos=0&fecha=YYYY-MM-DD
```

Las opciones “Todos los tours” abren `all-experiences.html` con filtro por destino:

```txt
all-experiences.html?destino=machu-picchu&tipo=tour
all-experiences.html?destino=cusco&tipo=tour
```

### 2. Carga de fecha y pasajeros en producto

`assets/js/pages/product.js` ahora lee desde la URL:

- `fecha` / `fechaInicio`
- `adultos` / `adults`
- `ninos` / `niños` / `children`
- `departureTime` / `horaSalida`

Y precarga el calendario, adultos, niños y precios del producto.

### 3. Pestaña Paquetes completos

Se agregaron estas opciones:

- Machu Picchu 2 días / 1 noche
- Cusco Machu Picchu 3 días / 2 noches
- Cusco Valle Machu Picchu 4 días / 3 noches
- Cusco Valle Machu Picchu 5 días / 4 noches
- Cusco Valle Machu Picchu 6 días / 5 noches
- Paquete personalizado Cusco Machu Picchu
- Unión Ancestral en los Andes / Matrimonio Andino

### 4. Fechas inteligentes

Para paquetes con duración fija, el usuario elige solo la fecha de inicio.
La fecha final se calcula automáticamente:

- 2D/1N: +1 noche
- 3D/2N: +2 noches
- 4D/3N: +3 noches
- 5D/4N: +4 noches
- 6D/5N: +5 noches

Para `Paquete personalizado Cusco Machu Picchu` y `Unión Ancestral en los Andes / Matrimonio Andino`, el calendario se mantiene como rango para que el cliente elija fecha de llegada y fecha de salida.

### 5. Cotizador `quote-packages.html`

`quote-packages.js` ahora reconoce más intenciones comerciales desde el home:

- `machu-picchu-2d1n`
- `cusco-machu-picchu-3d2n`
- `cusco-valle-machu-picchu-4d3n`
- `cusco-valle-machu-picchu-5d4n`
- `cusco-valle-machu-picchu-6d5n`

También se agregó un respaldo mínimo para Machu Picchu 2D/1N si el generador automático no devuelve una ruta compatible.

## Notas

- Se corrigió una duplicación de variable `baseAdult` en `quote-packages.js`.
- Se agregaron traducciones nuevas en `ui-translations.json`.
