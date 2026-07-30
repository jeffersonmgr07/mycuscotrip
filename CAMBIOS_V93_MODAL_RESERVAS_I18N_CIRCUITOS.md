# My Cusco Trip — Cambios V93

Fecha: 30 de julio de 2026

## 1. Modal de pasajeros y resumen

- Eliminado el rótulo lateral “RESERVA MY CUSCO TRIP”.
- Cabecera verde oscuro con títulos blancos.
- Título contextual:
  - “Datos de los pasajeros” durante el registro.
  - “Resumen de tu reserva” durante la revisión.
- Código visible con etiqueta “Código de reserva:” y badge blanco.
- Botón de cierre visible permanentemente.
- Ocultada la línea “Reserva generada”.
- Código nuevo `CUZ` + seis dígitos hexadecimales.
- Más padding en tarjetas, campos y resumen.
- Aviso largo convertido en desplegable “Información importante”.
- Botones móviles apilados y centrados para evitar cortes.

## 2. Pago cancelado y recuperación

- Mensaje de cancelación más amigable.
- Muestra el código y, cuando existe localmente, el correo enmascarado.
- Nuevo CTA “Recuperar y pagar reserva”.
- Nuevo enlace de recuperación en el footer.
- `mi-reserva.html` ahora solicita código + correo registrado o apellido.
- Recuperación local de pre-reservas pendientes y preparación para `lookupReservation` de backend.
- Documento de contrato: `docs/reservation-recovery-backend-contract-v93.md`.

## 3. Buscador del inicio

- Eliminado el check “Fechas flexibles”.
- La función residual devuelve `false` para conservar compatibilidad sin mostrar el control.

## 4. Páginas del footer e idiomas

- Las rutas `/pages/...` ya no se convierten en rutas inexistentes como `/pt/pages/...`.
- El idioma se conserva mediante `?lang=pt`, `?lang=en`, etc.
- Agregado motor `assets/js/pages/static-page-i18n.js`.
- Agregado diccionario `assets/data/static-page-translations.json` para 31 páginas y siete idiomas adicionales.
- Formularios conservan su estructura y funcionalidad durante la traducción.
- Rutas compatibles con dominio propio y con la base `/mycuscotrip/` de GitHub Pages.

## 5. Circuitos por Perú

- Completados diez itinerarios de 5, 6, 7, 8, 9, 10, 12, 14 y 15 días.
- Cada día incluye título, descripción, pernocte e imagen existente en el repositorio.
- Itinerarios completos en español e inglés.
- Corregidos slugs ingleses y contenido residual en español de los circuitos de 8 días y Perú–Bolivia de 10 días.
- Añadidas imágenes válidas para Uyuni, Amazonía y la costa sur.

## 6. Archivos principales modificados

- `product.html` y versiones `en`, `pt`, `fr`, `de`, `it`, `zh`, `ja`.
- `assets/css/product-page.css`.
- `assets/js/pages/product.js`.
- `mi-reserva.html` y versiones localizadas.
- `assets/js/pages/reservation-recovery.js`.
- `components/search-bar.html`.
- `assets/js/components/search-bar.js`.
- `components/footer.html`.
- `assets/js/components/header.js`.
- `assets/js/components/footer.js`.
- `assets/js/i18n.js`.
- `assets/data/ui-translations.json`.
- `assets/data/static-page-translations.json`.
- `assets/data/packages-peru.json`.
- `assets/data/i18n/en/packages-peru.json`.
