# My Cusco Trip · Black Friday 2026
## Instalación y despliegue del diseño oscuro + pagos con descuento

**Estado:** desarrollo preparado en GitHub (rama/PR). NO es una instalación de Apps Script: los archivos deben copiarse al proyecto real y desplegarse antes de publicar el nuevo frontend.

### Archivos del backend que debes pegar, exactamente

En el mismo proyecto de **Google Apps Script de My Cusco Trip** (el que ya conecta la hoja privada y las pasarelas PayPal y Mercado Pago):

1. **Reemplazar el contenido de Code.gs** con **google-apps-script/Code.gs**, previo respaldo y comparación con cualquier cambio más reciente que exista solo en Apps Script.
2. **Crear/actualizar BlackFriday2026.gs** con **google-apps-script/BlackFriday2026.gs**.
3. **Crear BlackFridayPricing2026.gs** con **google-apps-script/BlackFridayPricing2026.gs**.

Los tres archivos trabajan juntos; no reemplazar los archivos originales por piezas de Latam Expeditions, ni copiar las hojas ni los cupones de esa marca. Nunca ejecutar setupScriptPropertiesExample(): podría cambiar propiedades de pago.

**Hojas nuevas privadas**: MCT_BF26_Cupones, MCT_BF26_Registros y MCT_BF26_Panel. Los códigos legibles, correos y hashes SHA-256 permanecen exclusivamente en la hoja privada y las entregas autorizadas.

### Activación y prueba paso a paso

1. Realizar un respaldo de Apps Script y comprobar que las propiedades originales PAYPAL_MODE / PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / MERCADOPAGO_MODE / MERCADOPAGO_ACCESS_TOKEN siguen intactas.
2. Pegar los tres archivos .gs, guardar y autorizar permisos de lectura del Sheet, MailApp y UrlFetchApp según solicite Apps Script.
3. Ejecutar **prepararCampanaBlackFridayMCT()** desde el editor: debe devolver 100 códigos, 20 MANUAL y 80 AUTOMATICO. Es idempotente y no crea duplicados al repetir.
4. Ejecutar **pruebaCampanaBlackFridayMCT()**, **mctBfActualizarPanelPrivado()** y **mctBfReporteAdministrativo()**.
5. Revisar la pestaña MCT_BF26_Panel en Sheets, que solo debe compartir la agencia con sus administradores.
6. **Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar**. Mantener la URL /exec anterior utilizada en assets/data/backend-config.json.
7. Comprobar que /exec?action=health devuelve blackFriday2026Ready=true, blackFriday100Coupons=true, blackFridayPricingReady=true y blackFridayPaymentsEnabled=true.
8. Hacer prueba OTP con un correo propio (correo de seis dígitos y caducidad 10 min); recuperar el mismo código con un segundo OTP; usarlo en una cotización de ensayo; verificar que al pulsar Aplicar empieza un único contador de cinco horas.
9. Probar un checkout autorizado con **PayPal sandbox**, importe base, descuento y monto real capturado. Comprobar que el cupón queda UTILIZADO exactamente una vez en Google Sheets.
10. Probar pago rechazado/abandonado, reintentos de orden, otro correo de titular y dos reservas simultáneas. Validar márgenes operativos por producto (incluye tren/entradas/guía en Machu Picchu).
11. Solamente después de validar backend + pagos, fusionar/publicar el PR frontend. Esta es la política obligatoria para no publicar una interfaz que dependa de endpoints sin desplegar.

### Cobros con cupones: habilitados en rutas verificadas

**En esta revisión los pagos Black Friday están habilitados por defecto SOLO en rutas cuyo precio puede recalcular el servidor**. Script Property MCT_BF26_ENABLE_PAYMENTS ausente o con valor true habilita esa comprobación de checkout. Si necesitas un cierre de emergencia, definir esta propiedad como false (los pagos normales sin Black Friday no se desactivan).

El tercer archivo BlackFridayPricing2026.gs realiza una verificación independiente contra los catálogos oficiales alojados bajo https://mycuscotrip.com/assets/data/ antes de aceptar un cobro descontado. Se calcula el importe de la orden con las tarifas del servidor y el % de cupón guardado, nunca tomando el total del navegador como autoridad.

Flujos habilitables:
- Cuatro landings con tarifa fija Cusco 3D2N, 4D3N, 5D4N y 6D5N (sin alojamiento adicional).
- Landings Machu Picchu Full Day y Overnight en sus idiomas existentes: coteja tarifas base de adultos/niños, circuito, extras, mejoras de tren y hotel y tours adicionales.
- Tours individuales de precio fijo cuando no hay upgrades/extras y el total coincide exactamente con la tarifa base oficial.

Los siguientes pedidos **no quedan habilitados para cobro Black Friday automático**:
- Cotizador dinámico quote-packages.html: contiene un fallback PayPal generado en el navegador. El descuento se muestra y la cotización se puede compartir, pero la captura queda bloqueada hasta que exista una cotización firmada/verificable del servidor.
- Productos dinámicos complejos o con tarifas sin catálogo verificable: deben pasar por cotización/confirmación manual antes de autorizar cobro.
- Solo vuelos, solo hoteles y solo trenes con backends separados; plataformas externas Bókun/Viator no se modifican.

**No eliminar la verificación para cobrar otros productos sin tarificación autoritativa.** La pasarela PayPal puede capturar fielmente un precio incorrecto enviado por el frontend; que el pago se complete no demuestra que la tarifa original fuera legítima.

### Reglas de cupones

Campaña 23–29 noviembre 2026, horario America/Lima. 100 códigos con formato MCT26-XXXX-XXXX-XXXX-XXXX, 20 manuales y 80 automáticos. Una sola compra pagada por código, sin límite adicional de pasajeros aparte del de cada producto.

El descuento depende del número de días entre la **primera aplicación** y el inicio del viaje: 0–30 días 10%; 31–60 días 20%; 61–75 días 30%; 76–100 días 40%; más de 100 días 50%. Se aplica únicamente a tarifa base elegible; no a vuelos, mejoras, comidas ni extras. No se acumula.

La emisión del cupón NO inicia el contador. La primera aplicación crea un vencimiento definitivo cinco horas después, sin superar las 23:59:59 del 29 de noviembre. Salir, volver a entrar o aplicar el mismo cupón no reinicia el plazo.

Los códigos manuales se asignan por correo desde el editor con **mctBfAdminAsignarManual(codigo,correo,nombre)**. El porcentaje de excepción se configura con **mctBfAdminPorcentajeFijo(codigo,porcentaje)**; un valor null restaura los tramos. El registro público pide consentimiento para privacidad (obligatorio), marketing opcional y verificación OTP. Un correo puede recuperar su código anterior pero no obtener dos. Hay límite de envíos, intentos y honeypot básico; para campañas de mayor volumen conviene verificación CAPTCHA server-side.

Un cupón pasa a UTILIZADO solo después de verificar captura/aprobación de PayPal o Mercado Pago, asociando código de reserva e ID transaccional. Una orden ya generada se reutiliza cuando se reintenta para evitar duplicidad. Para liberar manualmente una orden, primero verificar en el proveedor que no existe pago aprobado.

### Archivos del frontend actualizados en el PR

- black-friday.html — hero con foto de Machu Picchu, texto y formulario en dos columnas, reutiliza header y footer de My Cusco Trip.
- assets/css/black-friday-2026.css — negro/verde lima, overlay y animación lenta de desplazamiento del fondo; media queries y reducción de movimiento.
- assets/js/black-friday-claim.js — buscador de países con banderas, registro y verificación OTP existentes.
- google-apps-script/Code.gs — verificación y captura de orden con cupón.
- google-apps-script/BlackFridayPricing2026.gs — cálculo del subtotal y extras a partir de catálogos oficiales.
- tests/check_bf26_pricing.cjs y .github/workflows/black-friday-2026.yml — comprobaciones automáticas.
- El módulo original google-apps-script/BlackFriday2026.gs (SHA-256, OTP, emisión, estados y caducidad) permanece SIN sustituir el sistema histórico.

### Confirmaciones antes de lanzar

Las pruebas GitHub Actions son simuladas (sin dinero) y comprueban generación de 100 códigos, límites, OTP, bloqueo, expiración, comprobación de tarifas y manipulaciones. Para comprobar el éxito completo se requieren pruebas manuales con el Apps Script publicado y PayPal/Mercado Pago de prueba, revisión de correos MailApp, pantalla móvil, margen por producto y notificaciones duplicadas.

**No confundas un merge GitHub con un despliegue Apps Script.** Esta instrucción exige primero actualizar el servidor, luego activar la web.
