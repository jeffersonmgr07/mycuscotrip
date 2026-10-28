# Paquetes Cusco: precios y pago directo

| Paquete | Adulto USD | Niño USD |
| --- | ---: | ---: |
| 3 días / 2 noches | 499 | 479 |
| 4 días / 3 noches | 569 | 539 |
| 5 días / 4 noches | 629 | 599 |
| 6 días / 5 noches | 699 | 669 |

Precios por persona, paquete completo, sin alojamiento. Las noches describen la duración del viaje. El alojamiento se coordina por WhatsApp y se cotiza aparte; no se agrega al total automáticamente. La tarifa infantil aplica de 3 a 11 años cumplidos a la fecha del viaje. Desde los 12 años se aplica la tarifa de adulto. Los menores de 3 años se coordinan por WhatsApp; no se les asigna automáticamente una tarifa gratuita.

## Flujo actual

El panel muestra precio por adulto, llegada, adultos y niños en filas con controles −/+, total y desglose. La tarifa de 3 días es USD499 por adulto. El calendario Flatpickr está configurado en español, con disableMobile para mantener el estilo MCT también en teléfonos. Si no carga, se muestra un mensaje y no se abre una reserva sin fecha.

Registrar reserva abre el mismo HTML del modal de product.html, insertado por el generador, y usa landing-reservation-modal.css y passenger-modal-scroll-fix.css. El adaptador package-passenger-fields.js reutiliza los campos y nacionalidades del modal de experiencias. El titular, los pasajeros y una revisión del total se completan antes de iniciar el pago.

La secuencia usa el contrato existente del cliente API: createPreReservation → createPayPalOrder → aprobación PayPal → paypal-retorno.html. Se elimina la dependencia de validatePackageFare como llamada adicional: esa acción nueva bloqueaba el flujo contra despliegues anteriores. Las validaciones de tarifa que incluye Code.gs se mantienen dentro del servidor al registrar y crear la orden cuando se despliega esa versión. No se modifica ni se publica Apps Script en esta corrección.

Los errores de pre-reserva impiden crear órdenes. Un error posterior de PayPal permite reintentar con la misma reserva si los datos no cambian. El modal no emite Purchase ni considera pagada una reserva al abrir PayPal. Los datos personales se envían al backend al continuar al pago; no se almacenan en localStorage desde este adaptador.

## Publicación y validación

Publicar los archivos del sitio mediante la PR. La actualización de Code.gs sigue siendo necesaria para disponer de la validación de tarifas del lado del servidor y del retorno de cancelación a las cuatro URLs. La compra ya no exige que exista la acción adicional validatePackageFare. Probar en sandbox la aprobación, captura y cancelación antes de dar por verificado un cobro completo.

Comprobaciones realizadas:
- Generación estática --check --require-catalog y tests/check_package_landings.py.
- Regresión de microdatos Full Day / Overnight.
- node tests/check_package_checkout.cjs: importes y validaciones del servidor.
- NODE_PATH=/ruta/a/node_modules node tests/check_package_modal.cjs (requiere jsdom): cuatro páginas, calendario personalizado, controles de cantidades, total mixto, modal, titular/pasajeros, revisión, doble envío, errores y reintentos.
- Sintaxis JavaScript y git diff --check.

No se han realizado cobros ni llamadas de escritura al backend real. La prueba completa en PayPal y la revisión visual en navegador real siguen pendientes.
