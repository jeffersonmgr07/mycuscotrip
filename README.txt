PARCHE - Proveedores + Registro agencias premium

Archivos incluidos:
1. components/footer.html
   - Footer mantiene Conviértete en proveedor hacia /pages/socios/proveedores.html
   - Extranet agencias / proveedores hacia /pages/socios/extranet-agencias.html

2. assets/css/provider-portal.css
   - Estilos para las dos páginas selectoras de proveedores.

3. pages/socios/proveedores.html
   - Nueva página selector: Registro de proveedores.
   - Orden de cards: Agencias, Hoteles, Restaurantes, Artesanos.

4. pages/socios/extranet-agencias.html
   - Nueva página selector: Login de proveedores.
   - Orden de cards: Agencias, Hoteles, Restaurantes, Artesanos.

5. agencias/registro.html
   - Registro de agencias rediseñado con estética similar a hoteles.
   - Tipo de registro: Persona natural / Empresa.
   - Datos de representante, documento, país, WhatsApp, web y datos de acceso.

6. agencias/assets/css/agencias.css
   - Nuevos estilos del registro premium con fondo Machu Picchu + overlay verde claro.

7. agencias/assets/js/pages/registro-agencias.js
   - Lógica para alternar Persona natural / Empresa.
   - Etiqueta fiscal dinámica por país: RUC, CNPJ, RFC, RUT, NIT, etc.
   - Validación de nombres, WhatsApp, correo y contraseña.
   - Payload compatible con el Apps Script actual.

No se modificó Mercado Pago ni PayPal en este parche.
