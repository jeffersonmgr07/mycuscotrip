# Paquetes fijos Cusco 3D2N, 4D3N, 6D5N y 7D6N — borrador comercial

## Referencia y límites
- URL solicitada: https://mobile.cuponatic.com.pe/descuento/vive-cusco-macchu-picchu-trasporte-estadia-y-mucho-mas?id_descuento=118443 (no se pudo recuperar).
- Publicación de referencia accesible: https://www.cuponatic.com.pe/descuento/vive-cusco-macchu-picchu-trasporte-estadia-y-mucho-mas?id_descuento=118519.
- La publicación de referencia enumera 5 modalidades; muestra un precio general desde S/499.90 pero no los importes individuales. No se debe asignar ese precio a una modalidad ni usar precios estimados.
- La publicación indica Hotel Cusco Boutique y Hotel Inka House, tarifa para turistas nacionales, mínimo 2, no incluye tickets de ingreso ni boleto turístico. El paquete independiente 5D4N existente tiene otras condiciones (Luz Garden, entrada Machu Picchu incluida, S/729.90) y queda intacto.
- Confirmar inclusiones de tren/bus, comidas de excursiones, hotel de Aguas Calientes, elegibilidad de nacionalidades, tarifas infantiles y condiciones para ventas directas independientes; Cuponatic indica que su propia promoción es exclusiva de su plataforma.
- No presentar estas páginas como un canje o compra de cupón Cuponatic.

## Archivos
- cusco-3-dias-2-noches-unico.html
- cusco-4-dias-3-noches-unico.html
- cusco-6-dias-5-noches-unico.html
- cusco-7-dias-6-noches-unico.html
- assets/js/pages/cusco-fixed-variants-data.js: catálogo de contenidos
- assets/js/pages/cusco-fixed-variants.js: formulario compartido, conversión y pago
- google-apps-script/Code.gs: configuración/validación independiente de tarifas y flujo PayPal compartido

## Activación
Cada página está marcada noindex. La tarifa no se muestra si no existe configuración, y el botón de reserva está deshabilitado. No se han fijado ni habilitado importes para las nuevas opciones.
Después de confirmar los precios por persona, configurar en Apps Script para cada clave 3D2N, 4D3N, 6D5N, 7D6N:
- MCT_CUSCO_<CLAVE>_ADULT_PRICE_PEN (decimal positivo, sin símbolo)
- MCT_CUSCO_<CLAVE>_CHILD_PRICE_PEN (solo si tarifa infantil aprobada; de lo contrario, no admite pago con niños)
- MCT_CUSCO_<CLAVE>_ENABLE_PAYMENTS (true únicamente cuando se aprueben las condiciones y pruebas)
El endpoint getFixedCuscoOffer devuelve exclusivamente las tarifas configuradas y el estado de habilitación. La cotización usa el promedio compra/venta de BCRP/SBS con tres decimales, registra una cotización temporal y la valida en el servidor antes de crear una reserva en USD. El pago emplea PayPal existente.
Los selectores de hotel y extras se mantienen ocultos como en la versión final del 5D4N. No hay un recargo de Royal Qosqo ni extras cobrables para las nuevas variantes hasta aprobación comercial.
Desplegar Code.gs en la implementación existente, comprobar navegación y checkout sandbox, confirmar disponibilidad y condiciones, revisar el PR y después activar cada paquete. No se cambiaron las credenciales ni se efectuó una compra.

## Verificación realizada
Sintaxis JavaScript del frontend y backend; comprobación de número de días y noindex para las cuatro páginas; bloqueo sin tarifa, conversión y validación PayPal con precio ficticio en memoria, rechazo de monto manipulado, bloqueo de niños sin tarifa y rechazo de nacionalidad no elegible. Verificación de que 5D4N mantiene su precio. No se ha desplegado ni ejecutado un cobro real.
