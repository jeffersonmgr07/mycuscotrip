Parche agencias v11 - ajustes estéticos y validaciones

Archivos incluidos:
- agencias/registro.html
- agencias/index.html
- agencias/assets/js/pages/registro-agencias.js
- agencias/assets/js/pages/agencias.js
- agencias/assets/css/agencias.css

Cambios principales:
1. Registro de agencias:
   - más espacio superior en móvil para que el recuadro no quede pegado al header.
   - validación por país para identificación fiscal: RUC, CNPJ, RFC, NIT, RUT, CUIT, EIN, etc.
   - validación por tipo de documento: DNI numérico, pasaporte alfanumérico, carné/documentos según país.
   - sanitiza el campo en tiempo real: si es numérico, no deja escribir letras.

2. Panel de agencias:
   - cabecera más limpia: Mis órdenes + botón de moneda + menú “Más opciones”.
   - moneda muestra solo PEN/USD en botón; al desplegar muestra Soles (PEN) y Dólares (USD).
   - “Mis datos” y “Cerrar sesión” pasan al menú “Más opciones”.

3. Modal de reserva:
   - evita desplazamiento lateral/tambaleo en móvil.
   - cantidad de pasajeros ahora usa botones + / -.
   - alerta visible si se elige idioma distinto de español o inglés.
   - “Datos de los demás pasajeros” queda más compacto en móvil: título, opcional y botón Ver más/Ver menos.

No incluye cambios en Apps Script, Mercado Pago ni PayPal.
