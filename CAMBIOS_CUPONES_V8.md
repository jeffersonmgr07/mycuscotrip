# Cambios técnicos V8

## Resumen móvil de la landing

- Nombre del servicio en la primera línea.
- Fecha debajo del nombre.
- Precio alineado a la derecha en una sola línea.
- `USD` aparece en un tamaño menor que el importe.
- El cambio se limita a `.mpt-payment-review__services`.

## Cupones

- Google Sheets pasa a ser la única fuente de validación en producción.
- Se elimina el fallback público hacia `discount-codes.json`.
- Compatibilidad con `percent` y `fixed`.
- Validación central en landings ES/EN/PT, `product.js` y `quote-packages.js`.
- Generación única con `LockService`.
- Vigencia de 48 horas más gracia hasta el final del día.
- Correo personalizado en español, inglés y portugués.
- Validación por correo al confirmar una reserva personal.
- Revalidación antes de crear la orden PayPal.
- Canje únicamente después del pago confirmado.
- Regreso de una cancelación PayPal a la landing de origen cuando corresponda.
