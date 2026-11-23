# My Cusco Trip · Black Friday 2026 · Instalación y administración

**ESTADO: SOLO RAMA DRAFT. No está desplegado ni activo en producción.**

## Reglas y alcance
- Campaña: 23–29 noviembre 2026, hora America/Lima, hasta las 23:59:59 del domingo.
- 100 códigos privados: 20 manuales y 80 automáticos.
- Formato MCT26-XXXX-XXXX-XXXX-XXXX, 16 caracteres aleatorios de un alfabeto sin ambiguos, hash SHA-256.
- 1 compra pagada por cupón, sin limitar la cantidad de pasajeros admitidos por cada tour.
- Anticipación desde la PRIMERA APLICACIÓN hasta el inicio del viaje: 0–30 días 10%; 31–60 días 20%; 61–75 días 30%; 76–100 días 40%; más de 100 días 50%. Criterios internos no visibles en la web pública.
- Cinco horas a partir del primer clic en Aplicar, con reloj definitivo del servidor. Caduca antes si termina la campaña.
- No acumulable. La tarifa base elegible no incluye vuelos, mejoras hoteleras, trenes adicionales ni extras.
- Los cupones de la campaña no se mezclan con la hoja Cupones existente ni los cupones de popup y planificador.

## ARCHIVOS DEL BACKEND: instalar ambos en el mismo Apps Script de My Cusco Trip
1. Hacer respaldo de todo el script actual y comparar la última versión desplegada con GitHub.
2. REEMPLAZAR el contenido de Code.gs por el archivo **google-apps-script/Code.gs** de esta rama.
3. CREAR un segundo archivo llamado **BlackFriday2026.gs** y pegar **google-apps-script/BlackFriday2026.gs**.
4. No copiar archivos de Latam Expeditions, no tocar variables ni propiedad privada de esa plataforma y NO ejecutar setupScriptPropertiesExample() porque puede sobrescribir claves de pago.
5. Guardar los dos archivos. Ejecutar **prepararCampanaBlackFridayMCT()** una vez desde el editor autorizado. Debe retornar total=100, manual=20 y automaticos=80. Repetir devuelve creadosAhora=0.
6. Ejecutar **pruebaCampanaBlackFridayMCT()**, **mctBfActualizarPanelPrivado()** y **mctBfReporteAdministrativo()**.
7. Revisar Google Sheets privado, en las hojas MCT_BF26_Cupones, MCT_BF26_Registros y MCT_BF26_Panel. Solo allí se guardan los códigos legibles. Prohibido publicar esas hojas.
8. Apps Script: Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar. Mantener la misma URL /exec del backend-config.json.
9. Verificar /exec?action=health: blackFriday2026Ready=true y blackFriday100Coupons=true.
10. SOLO DESPUÉS se puede revisar/fusionar el PR de frontend. Ninguna modificación frontend que dependa de las funciones nuevas debe llegar a main antes que el backend.

**IMPORTANTE: LOS 100 CÓDIGOS NO EXISTEN EN PRODUCCIÓN HASTA EJECUTAR LA FUNCIÓN EN APPS SCRIPT.** GitHub solo guarda el generador; ningún código real se incluye en el repositorio.

## Administración exclusivamente privada
La pestaña MCT_BF26_Panel es el panel de administración. El sistema contiene estados disponible, asignado, activo, reservado, utilizado, vencido y bloqueado, con emisión, primera aplicación, fin, correo, cliente, reserva, orden y transacción.

Desde el editor de Apps Script:
- **mctBfReporteAdministrativo()** muestra números, no códigos.
- **mctBfActualizarPanelPrivado()** regenera el panel en Google Sheets.
- **mctBfActualizarEstados()** actualiza estados caducados.
- **mctBfAdminAsignarManual(codigo,correo,nombre)** vincula un código MANUAL a un turista. Nunca entregar sin vincularlo primero.
- **mctBfAdminPorcentajeFijo(codigo,35)** fija 35% para ese cupón. Con null vuelve a porcentaje automático.
- **mctBfAdminLiberarReserva(codigo,reserva,'PAGO_NO_APROBADO_VERIFICADO')** solo tras verificar con la pasarela que esa orden no se ha cobrado. Conserva el reloj y vencimiento original.

El OTP se genera por correo, 6 cifras y 10 minutos de validez, hash del OTP en la hoja, máximo 5 intentos, 60 segundos entre envíos, 5 envíos por correo al día y límite global del envío. Un correo verificado recibe un solo código; al solicitar nuevamente y verificar, recupera el MISMO.

La reserva inicial bloquea el cupón 25 minutos. Una vez generada una orden en el proveedor, permanece exclusivo hasta el vencimiento o liberación tras comprobar la cancelación. Se consume definitivamente solo después de una captura PayPal o aprobación Mercado Pago que el servidor valide.

## ACTIVACIÓN DE COBROS: SEGURIDAD COMERCIAL
La Script Property **MCT_BF26_ENABLE_PAYMENTS** debe permanecer false o ausente durante pruebas y hasta la revisión de rentabilidad. Mientras esté false, se permite registrar usuarios y aplicar cupones, pero se rechaza pre-reserva pagada BF.

Para habilitar pagos, hace falta contrastar los importes base contra un catálogo autoritativo de servidor, los márgenes de cada tour y las comisiones, probar los proveedores PayPal y Mercado Pago en un entorno controlado y certificar que ningún flujo del navegador puede modificar el valor a pagar. Después establecer MCT_BF26_ENABLE_PAYMENTS=true y desplegar nueva versión. **NO activar true sin esas verificaciones.**

**Limitación actual de integración:** El cotizador de paquetes tiene un fallback de PayPal creado en el navegador. Con cupón Black Friday ese camino se bloquea y debe confirmarse la cotización por asesor hasta que se implemente su pago seguro y tarificación verificable. Las cuatro páginas de paquetes de Cusco con pago directo poseen tarifas fijas verificadas por el servidor. Otros productos dinámicos aún necesitan validación autoritativa del precio. Los flujos separados de solo trenes u hoteles no están incluidos. No se modifica Bókun, Viator ni otras OTAs.

## PRUEBAS EXIGIDAS ANTES DEL LANZAMIENTO
- Pruebas unitarias GitHub Actions: tests/check_bf26_100.cjs y tests/check_package_checkout.cjs.
- Generación de 100, re-ejecución sin duplicar, 20 manuales/80 automáticos, hashes únicos.
- Registro y recuperación del mismo correo, OTP incorrecto y vencido, límites de reenvío.
- Descuentos en todos los límites de días y porcentaje fijo.
- Cinco horas desde Aplicar, reaplicación sin reinicio, vencimiento absoluto al final de la campaña.
- Dos pre-reservas simultáneas, correo diferente, bloqueo y liberación verificable.
- Confirmación de PayPal/Mercado Pago y consumo único con ID de transacción, reintentos idempotentes y abandono.
- Reserva de 1 o más viajeros dentro de las capacidades originales.
- Pruebas de PC/móvil y español, inglés, portugués.
- Validez real de entradas Machu Picchu, trenes incluidos, operativa local y rentabilidad del 40%-50%.

## Archivos del frontend
- black-friday.html
- assets/js/black-friday-claim.js
- assets/css/black-friday-2026.css
- assets/js/components/black-friday-badge.js y assets/css/black-friday-badge.css
- assets/js/pages/product.js y assets/js/pages/quote-packages.js
- assets/js/pages/landing-paquetes-cusco.js y su CSS
- Landings Full Day y Overnight ES/EN/PT/IT/DE/FR y fichas/productos ES/EN/PT (además de otros idiomas ya existentes).
- Cuatro landings de paquetes Cusco 3D2N–6D5N.
- google-apps-script/Code.gs y nuevo google-apps-script/BlackFriday2026.gs.

No cambiar credenciales ni URL backend a ciegas. Los códigos y hashes auténticos residen en las hojas privadas, no en GitHub.

**El PR se mantiene Draft y NO fusionado.**