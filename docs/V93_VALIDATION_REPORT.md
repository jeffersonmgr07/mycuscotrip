# Informe de validación V93 — My Cusco Trip

Fecha: 30 de julio de 2026

## Validaciones ejecutadas

### JavaScript

- `node --check` ejecutado sobre los 42 archivos JavaScript de `assets/js/`.
- Resultado: sin errores de sintaxis.

### JSON

- Parseo completo de 109 archivos JSON del repositorio.
- Resultado: sin errores de formato.

### Modal de pasajeros y resumen

Verificado en las ocho versiones de `product.html`:

- un solo modal `passengerReservationModal`;
- un solo título, badge de código y botón de cierre;
- ausencia del texto “RESERVA MY CUSCO TRIP” en el HTML del modal;
- fecha de generación oculta;
- bloque “Información importante” implementado con `<details>`;
- versiones de caché de CSS y JS actualizadas a `20260730-93`.

### Recuperación de reserva

Verificado en español, inglés, portugués, francés, alemán, italiano, chino y japonés:

- campo de código;
- campo de correo o apellido;
- script compartido de recuperación cargado una sola vez;
- placeholder del formato `CUZ1A2B3C`;
- compatibilidad con códigos históricos de mayor longitud.

### Páginas del footer

- 31 páginas estáticas registradas.
- Diccionario con siete idiomas adicionales para las 31 páginas.
- Cada página carga una sola vez `static-page-i18n.js`.
- Enlaces del footer apuntan a páginas existentes.
- Simulación de rutas correcta:
  - dominio propio: `/pages/...html?lang=pt`;
  - GitHub Pages: `/mycuscotrip/pages/...html?lang=pt`.

### Circuitos por Perú

- 10 circuitos en español y 10 equivalentes en inglés.
- IDs alineados para permitir cambio de idioma por producto.
- Slugs ingleses sin rutas en español.
- Cada itinerario contiene exactamente el número de días publicado.
- Días correlativos desde 1 hasta la duración final.
- Cada día incluye título, descripción y pernocte.
- Todas las imágenes referenciadas existen en el repositorio.

### Buscador del inicio

- Control visual de “Fechas flexibles” eliminado del componente.
- La función residual devuelve `false` para evitar que otras partes del código dependan de un elemento inexistente.

## Limitaciones pendientes de despliegue

1. La recuperación entre dispositivos necesita que el Apps Script/API publicado implemente `lookupReservation` con código + correo o apellido.
2. La unicidad global del código `CUZ` + 6 hexadecimales debe validarse en backend.
3. La disponibilidad y el precio de circuitos, vuelos internos, trenes, entradas y servicios de Uyuni/Amazonía deben reconfirmarse antes de una venta real.
4. La prueba definitiva de PayPal requiere publicar esta versión y ejecutar una orden sandbox o real con las URLs de retorno/cancelación del backend desplegado.
