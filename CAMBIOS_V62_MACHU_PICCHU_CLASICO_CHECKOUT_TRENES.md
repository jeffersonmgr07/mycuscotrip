# Cambios V62 - Machu Picchu Full Day Clásico: checkout, trenes y contenido comercial

## Archivos modificados
- `assets/data/tours-machu-picchu.json`
- `assets/js/pages/product.js`
- `assets/css/product-page.css`
- `product.html`
- `en/product.html`, `pt/product.html`, `fr/product.html`, `de/product.html`, `it/product.html`, `zh/product.html`, `ja/product.html`

## Cambios principales

### 1. Recuperación de reserva cuando PayPal se cancela
- Si PayPal devuelve a `product.html?payment=cancelled&reservationCode=...` sin `slug`, la página ahora intenta recuperar la pre-reserva desde `localStorage`/`sessionStorage` usando el código.
- Si encuentra la reserva, reconstruye el `slug`, actualiza la URL y muestra la experiencia correcta.
- Se muestra un aviso dentro del panel de reserva indicando que el pago no se completó, pero que la pre-reserva se mantiene guardada en ese navegador.
- Antes de redirigir a PayPal, se guarda una copia local de la reserva y otra copia de pago pendiente.

### 2. Modal de pasajeros mejorado
- El modal ahora usa el título “Detalles de reserva”.
- El código de reserva y la fecha de generación se mantienen, con fecha en tamaño pequeño.
- El campo WhatsApp ahora tiene selector de código de país.
- Antes de enviar a PayPal, el usuario pasa por un paso de revisión: experiencia, fecha, pasajeros, trenes, extras, total, monto a pagar ahora y saldo pendiente.
- Si hay pasajeros adicionales pendientes, el resumen lo indica claramente.

### 3. Machu Picchu Full Day Clásico afinado
- Nuevo resumen comercial solicitado.
- Capacidad actualizada a máximo 12 viajeros por grupo.
- Idiomas: español, inglés y otros idiomas bajo consulta.
- “Reserva online con cálculo automático” cambiado a “Reserva online y confirmación instantánea”.
- Se eliminó visualmente la sección de “Aspectos destacados” para este producto.
- Incluye, no incluye, recojo, punto de encuentro e información importante actualizados.
- Itinerario full day con horas aproximadas y estilo de timeline.

### 4. Upgrade de trenes por modal
- En el summary ya no se muestran selects cargados ni texto repetido de tren turístico.
- Se muestran solo tren de ida, tren de retorno y botón “Upgrade de trenes”.
- Al hacer clic se abre un modal con logo de compañía, horario, estación, ruta y excedente por persona.
- Trenes de ida filtrados entre 05:00 y 08:00.
- Trenes de retorno filtrados entre 18:00 y 22:00.
- Excluidos: Hiram Bingham, First Class y tren local.
- Si se elige ida Inca Rail, el retorno muestra Inca Rail; si se elige ida PeruRail, el retorno muestra PeruRail.
- El excedente se calcula por diferencia positiva contra el tren base, sin descontar si un tramo más barato compensa otro más caro.

### 5. Extras de almuerzo excluyentes
- Solo se puede elegir una opción de almuerzo:
  - Tinkuy buffet lunch by Belmond Sanctuary Lodge: USD 48.90 p/p.
  - Almuerzo turístico en Full House Machu Picchu: USD 25.90 p/p.
- Se agregó opción “Sin almuerzo adicional”.
