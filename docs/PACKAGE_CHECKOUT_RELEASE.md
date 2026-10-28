# Paquetes Cusco: precios y pago directo

| Paquete | Adulto USD | Niño USD |
| --- | ---: | ---: |
| 3 días / 2 noches | 499 | 479 |
| 4 días / 3 noches | 569 | 539 |
| 5 días / 4 noches | 629 | 599 |
| 6 días / 5 noches | 699 | 669 |

Precios por persona, paquete completo, sin alojamiento. Las noches describen la duración del viaje. El alojamiento se coordina por WhatsApp y se cotiza aparte; no se agrega al total automáticamente. La tarifa infantil aplica de 3 a 11 años cumplidos a la fecha del viaje. Desde los 12 años se aplica la tarifa de adulto. Los menores de 3 años se coordinan por WhatsApp; no se les asigna automáticamente una tarifa gratuita.

## Flujo

Las cuatro URLs existentes conservan sus rutas. La página calcula adulto × cantidad + niño × cantidad, solicita fecha y contacto del titular y muestra las condiciones antes de abrir PayPal. No enlaza al cotizador. Los demás pasajeros se registran pendientes para completar con el equipo.

Se reutiliza assets/js/core/api-client.js y el backend existente: validación de tarifa de solo lectura → createPreReservation → createPayPalOrder → enlace de aprobación PayPal. paypal-retorno.html continúa capturando y verificando el pago con el backend; la landing nunca emite Purchase por abrir PayPal. Los reintentos sin cambios conservan la pre-reserva. No se guardan contactos ni documentos en el navegador desde estas páginas.

## Paso necesario de publicación

1. Actualizar el proyecto Google Apps Script con google-apps-script/Code.gs y publicar una nueva versión del despliegue web existente. GitHub Pages no actualiza Apps Script. Mantener la URL /exec del despliegue actual o actualizar backend-config.json si cambia.
2. Publicar/mergear los cambios del sitio. La comprobación validatePackageFare falla sin crear reservas cuando Apps Script aún no reconoce la nueva acción. El cliente verá un mensaje para contactar al equipo.
3. Probar en un entorno sandbox el total, aprobación, retorno/captura y cancelación. No se han realizado cobros reales ni llamadas de escritura al backend durante el desarrollo.
4. Confirmar el detalle comercial definitivo de servicios incluidos (tren/circuito/ingresos/comidas). La disponibilidad debe confirmarse con el operador antes de pagar; no hay inventario en tiempo real.

El backend comprueba las tarifas fijas de este flujo al registrar y al crear la orden; rechaza alteraciones del total y cantidades. El retorno de cancelación acepta únicamente las cuatro rutas internas nuevas. No se cambia la política de precios del cotizador ni de otros productos.

## Validación

- python3 scripts/build_package_landings.py --check --require-catalog
- python3 tests/check_package_landings.py
- python3 tests/check_meta_catalog.py
- node tests/check_package_checkout.cjs
- node --check assets/js/pages/landing-paquetes-cusco.js
- node --check < google-apps-script/Code.gs
- Pruebas DOM con JSDOM en las cuatro páginas: importes mixtos, no duplicar envíos, bloqueo ante backend antiguo antes de escribir, fallo de PayPal y reintento sin duplicar reserva.

No se ha probado un pago de extremo a extremo en PayPal, ni se ha desplegado Apps Script. Pendiente revisión visual en navegador real.
