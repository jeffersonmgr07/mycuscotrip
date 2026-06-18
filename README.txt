Parche: loader y pantalla post-registro para agencias

Archivos incluidos:
- agencias/assets/js/pages/registro-agencias.js
- agencias/assets/css/agencias.css

Qué hace:
1. Replica en agencias el loader visual usado en hoteles:
   - fondo suave verde/transparente
   - tarjeta blanca
   - spinner circular
   - texto: "Un momento, por favor..."
   - durante el registro muestra: "Enviando registro..."

2. El loader solo aparece cuando el usuario envía el formulario.

3. Después de un registro exitoso:
   - oculta el formulario
   - muestra una pantalla visual de éxito
   - indica que se envió el correo de verificación
   - recomienda revisar spam/promociones
   - deja botón "Ir al acceso"
   - redirige automáticamente a login.html después de 8 segundos

No toca:
- Apps Script
- PayPal
- Mercado Pago
- login
- órdenes
