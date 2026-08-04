# My Cusco Trip — Cupones Google Sheets V8

Este parche parte de `mycuscotrip-main-v71-imagen-social.zip` y contiene dos cambios delimitados:

1. Alineación del detalle de servicios en el resumen móvil de la landing.
2. Centralización de cupones en Google Sheets mediante Google Apps Script.

## 1. Subir el parche a GitHub

Copia el contenido del ZIP sobre la raíz del repositorio y acepta el reemplazo de archivos.

Los cupones ya no se validan desde `assets/data/discount-codes.json`. Ese archivo queda vacío de forma intencional. Las landings, `product.html` y `quote-packages.html` consultan el mismo Apps Script mediante `MyCuscoTripApiClient.validateCoupon()`.

## 2. Actualizar Google Apps Script

1. Abre el Apps Script vinculado a tu Google Sheet.
2. Reemplaza el contenido de `Code.gs` por `google-apps-script/Code.gs`.
3. Guarda.
4. Ejecuta **`setupCouponSystem()` una sola vez** y acepta los permisos.
5. Ve a **Implementar > Administrar implementaciones**.
6. Edita la implementación web, elige **Nueva versión** y vuelve a implementar.

Si actualizas la implementación existente, la URL `/exec` se mantiene y no necesitas modificar `assets/data/backend-config.json`.

`setupCouponSystem()` conserva las credenciales PayPal y Mercado Pago existentes. Solo actualiza las propiedades del sistema de cupones.

## 3. Estructura de la hoja `Cupones`

El script conserva las columnas antiguas y añade las nuevas automáticamente. Las columnas principales para crear cupones manuales son:

- `CodigoCupon`: ejemplo `PROMO15`.
- `Estado`: `Vigente`, `Expirado`, `Canjeado` o `Anulado`.
- `Tipo`: `percent` o `fixed`.
- `Valor`: `15` para 15%, o `100` para USD 100.
- `Moneda`: `USD` o `PEN`; se usa principalmente con cupones `fixed`.
- `Activo`: `TRUE` o `FALSE`.
- `VigenteDesde`: fecha y hora de inicio, opcional.
- `VigenteHasta`: fecha y hora de vencimiento, opcional para cupones manuales.
- `MaxUsos`: `1` para un solo uso; `0` para uso ilimitado.
- `Usos`: empieza en `0`.
- `CorreoVinculado`: opcional. Si se completa, el cupón solo puede confirmarse con ese correo.

### Ejemplo porcentual

- `CodigoCupon`: `PROMO15`
- `Estado`: `Vigente`
- `Tipo`: `percent`
- `Valor`: `15`
- `Moneda`: `USD`
- `Activo`: `TRUE`
- `MaxUsos`: `100`
- `Usos`: `0`

### Ejemplo de monto fijo

- `CodigoCupon`: `MCT100USD`
- `Estado`: `Vigente`
- `Tipo`: `fixed`
- `Valor`: `100`
- `Moneda`: `USD`
- `Activo`: `TRUE`
- `MaxUsos`: `1`
- `Usos`: `0`

Los cupones de monto fijo solo se aplican cuando la moneda del cupón coincide con la moneda de la reserva.

## 4. Cupones generados desde el popup

Al registrar nombre, WhatsApp y correo:

- El código se genera en el servidor y se comprueba que sea único.
- Se guarda en la hoja `Cupones`.
- Se vincula al correo registrado.
- Tiene `MaxUsos = 1`.
- Tiene una vigencia mínima de 48 horas.
- La gracia se extiende hasta las 23:59:59 del día en que se cumplen las 48 horas, usando `America/Lima`.

Ejemplo: si se genera el 3 de agosto a las 20:15, las 48 horas se cumplen el 5 de agosto a las 20:15 y el cupón caduca el 5 de agosto a las 23:59:59.

## 5. Cuándo se marca como usado

El cupón no se canjea al pulsar **Pagar**. Se marca como usado únicamente después de que PayPal o Mercado Pago confirman el pago.

## 6. Pruebas recomendadas

1. Ejecutar `setupCouponSystem()`.
2. Registrarse en el popup con un correo de prueba.
3. Confirmar que se creó una fila en `Cupones`.
4. Aplicar el código en la landing.
5. Aplicarlo en un `product.html`.
6. Crear un cupón manual `fixed` de USD 10 y comprobar el descuento.
7. Intentar usar un cupón vencido.
8. Intentar confirmar un cupón personal con otro correo.
9. Completar un pago sandbox y comprobar que `Estado` cambie a `Canjeado` y `Usos` a `1`.
