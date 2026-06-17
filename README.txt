Parche: ajuste fino registro de agencias

Archivos incluidos:
- agencias/registro.html
- agencias/assets/css/agencias.css
- agencias/assets/js/pages/registro-agencias.js

Cambios:
1. Registro de agencias más parecido al registro de hoteles:
   - franja superior delgada,
   - título compacto: Registro de agencias de viajes,
   - se elimina el exceso de aire superior,
   - card blanca con overlay/fondo Machu Picchu igual al registro hotelero.

2. Tipo de registro funcional:
   - Persona natural muestra Tipo de documento, Número de documento y Nacionalidad.
   - Empresa muestra Razón social, número fiscal según país y Nombre comercial.
   - El nombre comercial solo aparece en Empresa.

3. Número fiscal dinámico por país:
   - Perú: RUC
   - México: RFC
   - Chile: RUT
   - Brasil: CNPJ
   - Colombia/Bolivia: NIT
   - Argentina: CUIT
   - Ecuador: RUC
   - Estados Unidos: EIN / Tax ID
   - España: NIF / CIF

4. No se toca PayPal, Mercado Pago, órdenes ni login.

Instalación:
Copiar estos archivos sobre la raíz del proyecto respetando las rutas.
