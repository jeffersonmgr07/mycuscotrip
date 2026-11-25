# Programa único Cusco 5 días / 4 noches — revisión previa a publicación

## Archivos
- Página exclusiva: /cusco-5-dias-4-noches-unico.html
- Lógica de reservas: /assets/js/pages/cusco-5d4n-unico.js
- Estilos: /assets/css/cusco-5d4n-unico.css
- Backend con validación: /google-apps-script/Code.gs
- Pruebas: node tests/check_cusco_5d4n_unico.cjs

La página usa estilos y DOM de product.html, pero no cambia product.html ni el paquete dinámico original. Se mantiene con meta noindex mientras se confirma su contenido y se activa el cobro seguro.

## Programa y precios actualmente parametrizados
- S/ 729.90 por persona, provisional hasta decidir entre S/ 729.90 y S/ 719.90.
- Mínimo 2 viajeros, máximo 9, default 2 adultos y 0 niños.
- Precio de niño temporalmente igual al adulto: no se inventó una tarifa infantil.
- 3 noches Hotel Cusco Boutique sin extra. Hotel Royal Qosqo: +US$ 10 por persona por noche durante las 3 noches.
- Conversión USD/PEN 3.75 (tipo de cambio manual en assets/data/currency-config.json): +S/ 112.50 por viajero en Royal Qosqo.
- 1 noche Hotel Luz Garden fija, con desayuno, sin cambio desde el modal.
- Habitaciones dobles y triples cuya capacidad sumada corresponde al total de viajeros.
- Solo extra ya especificado: bus panorámico día 5 (+S/ 30 por persona). El selector se ampliará con la lista definitiva.
- Pago completo PEN con Mercado Pago. Sin descuento automático ni pago parcial.

## Antes de habilitar cobros
1. Confirmar precio final (S/ 729.90 o S/ 719.90) y tarifa de niños.
2. Confirmar con operaciones entradas, trenes, boleto general, bus, desayuno, hotel y traslados incluidos. Confirmar si entrada a salineras de Maras se paga aparte; no figura expresamente como incluida.
3. Verificar tarifa y disponibilidad de Royal Qosqo; su tarifa de referencia está pendiente en el catálogo.
4. Si cambia el tipo de cambio, actualizar frontend y backend a la vez, no solo currency-config.json.
5. Actualizar Apps Script con Code.gs y desplegar una nueva versión web. Un commit en GitHub NO despliega Apps Script.
6. Después de verificar la tarifa y credenciales de Mercado Pago, configurar propiedad de Apps Script: MCT_CUSCO5D4N_ENABLE_PAYMENTS=true. Por defecto false.
7. Probar checkout sandbox, retorno de Mercado Pago y responsive antes de activar live. Revisar la confirmación de disponibilidad y políticas de cambios.
8. Quitar meta noindex y fusionar rama a main después de revisión.

## Seguridad
El frontend ejecuta validateCusco5d4nFare en Apps Script antes de registrar reserva o solicitar cobro. Si Apps Script no está desplegado o el flag no está activado, detiene el checkout. El backend verifica viajeros, habitaciones, hotel, extra, moneda y montos tanto antes de crear la pre-reserva como antes de crear la preferencia de Mercado Pago. No se almacenan secretos en GitHub.

## Prueba con dos adultos
- Cusco Boutique: S/ 1,459.80.
- Royal Qosqo: S/ 1,684.80.
- Royal Qosqo + bus panorámico: S/ 1,744.80.

Horarios de tren, ingresos y hoteles sujetos a disponibilidad. Una preferencia de pago no confirma cupos turísticos.
