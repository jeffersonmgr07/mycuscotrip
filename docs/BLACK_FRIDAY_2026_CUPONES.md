# Black Friday 2026 — My Cusco Trip (50 cupones personales)

## Vigencia de la campaña
- Inicio: lunes **23/11/2026, 00:00:00**, zona `America/Lima`.
- Fin: domingo **29/11/2026, 23:59:59**, zona `America/Lima`.
- **50 códigos distintos**, de **un solo uso por compra** (`MaxUsos=1`), para distribuir individualmente.
- Los códigos se generan en **Google Apps Script/Sheets**, **no** en el repositorio público.
- No acumulable con otro cupón. La lógica de pago total existente mantiene el mayor de sus descuentos.
- La fecha considerada es el **inicio del viaje**, calculando días naturales desde la fecha actual en Perú.

| Anticipación desde hoy | Descuento |
|---|---:|
| 0–14 días | 10% |
| 15–29 días | 15% |
| 30–59 días | 25% |
| 60–90 días (90 incluido) | 40% |
| 91 días o más | 50% |

El tramo de 0–29 días se desglosó en dos subtramos para implementar los **10% y 15%** solicitados. Revisar esta definición comercial antes de activar.

## Instalación (NO queda activo solo por subirlo a GitHub)

1. Revisar/aceptar esta rama en GitHub y publicarla en Pages cuando se apruebe.
2. Abrir el **proyecto de Google Apps Script en producción** conectado a la hoja de My Cusco Trip.
3. Copiar el contenido completo actualizado de `google-apps-script/Code.gs` (sin borrar configuraciones propias que estén solo en producción). Guardar una copia de respaldo antes.
4. **No ejecutar `setupScriptPropertiesExample()`**, ya que podría alterar credenciales.
5. Ejecutar manualmente **`setupBlackFriday2026Coupons()`** con la cuenta autorizada. Esta rutina es idempotente: crea los códigos faltantes hasta completar 50.
6. Abrir Google Sheets → hoja **`Cupones`**, filtrar `Fuente=black_friday_2026`. Verificar 50 registros, `MaxUsos=1`, `Usos=0`, `Estado=Vigente`. Los códigos están en `CodigoCupon`.
7. Asignar **un código a cada turista**. Si debe ser estrictamente personal, rellenar `CorreoVinculado` con el correo de ese cliente **antes de distribuirlo**.
8. En Apps Script: **Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar**, conservando la misma URL `/exec`.
9. Probar primero contra una cuenta de ensayo y un pago sandbox controlado. Confirmar que luego del pago se guarde `Canjeado` y `Usos=1`, y que una segunda compra con el mismo código sea rechazada.

El script no ha sido ejecutado desde GitHub ni tiene acceso por sí mismo a la hoja de Google en vivo: **ningún cupón existe en producción hasta completar los pasos 2–8**.

## Productos y rutas conectados
- `product.html` para productos individuales, paquetes, full days y experiencias, incluidos los idiomas soportados.
- `quote-packages.html` para cotizaciones de paquetes (descuento sobre el subtotal descontable según las reglas existentes).
- Landings de Machu Picchu Full Day y Overnight en ES/EN/PT/IT/DE/FR.
- Cuatro landings de paquetes Cusco 3D2N, 4D3N, 5D4N y 6D5N, con formulario de cupón y monto final sincronizado con PayPal.

**Alcance no cubierto:** módulos independientes de **solo trenes** o **solo hoteles** con sus propios backends/checkout, y pagos gestionados íntegramente fuera del flujo de reserva principal. No afirmar que esos checkouts ya acepten BF26 sin una integración aparte.

## Reglas técnicas
- El backend usa `Fuente=black_friday_2026` para detectar campaña y calcula la tasa a partir de `travelDate` y la fecha de Perú; no confía en un porcentaje suministrado por el navegador.
- `Valor` / `Porcentaje` iniciales de la hoja muestran **10** por compatibilidad con el esquema: el porcentaje definitivo cambia de acuerdo con la fecha de viaje y se obtiene desde `validateCoupon_`.
- Al crear pre-reserva se guarda una reserva temporal de uso de código en `CodigoReserva` y `ReservadoHasta` (duración general de la pre-reserva, 72 h por defecto). No permite reservar el mismo código en dos pre-reservas vigentes.
- Se comprueba vigencia al crear pre-reserva y al abrir pago por PayPal o Mercado Pago.
- Solo se marca `Canjeado` tras confirmación de pago del proveedor; las notificaciones repetidas de la **misma reserva** no aumentan `Usos`.
- El descuento **no se acumula** con otro cupón. El cotizador conserva exclusiones de extras/tickets/vuelos definidas previamente.
- Se conserva el resto del sistema de cupones existentes (popup y planner).

## Pruebas
```bash
node tests/check_package_checkout.cjs
node --check assets/js/pages/landing-paquetes-cusco.js
node --check assets/js/pages/product.js
node --check assets/js/pages/quote-packages.js
```
Hay que completar pruebas de extremo a extremo (fecha, descuento, cierre de campaña, saldo de pago, captura real o sandbox, reversos/abandono) **antes** de publicar al cliente.

## Aviso comercial
Con 40–50% de descuento se puede vender por debajo del costo de tren, entrada o guía. La política aquí refleja el pedido, pero la rentabilidad de cada producto debe validarse antes de habilitar los 50 cupones.
