# Formularios, Libro de Reclamaciones y documentos de reserva

## 1. Publicar el Apps Script actualizado

1. Abre la hoja de cálculo que utilizará My Cusco Trip.
2. Ve a **Extensiones > Apps Script**.
3. Reemplaza el código por `landing/google-apps-script-machu-picchu-alternativas.gs`.
4. Selecciona **Implementar > Administrar implementaciones > Editar**.
5. Crea una versión nueva y publícala como **Aplicación web**:
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario**.
6. Copia la URL que termina en `/exec` y colócala en:
   `assets/js/config/public-forms-config.js`.

La URL actualmente configurada es la implementación anterior. El nuevo código no funcionará en producción hasta crear una nueva versión de la implementación.

## 2. Hojas que se crean automáticamente

El primer envío crea una hoja para cada tipo de formulario:

- `Libro_Reclamaciones`
- `Delegaciones`
- `Trabaja_Con_Nosotros`
- `Cambios_Postergaciones`
- `Solicitudes_Ayahuasca`
- `Matrimonio_Andino`
- `Solicitudes_Web`

Los campos nuevos se agregan automáticamente como columnas. Los avisos se envían a:

- `contact@mycuscotrip.com`
- `reservas@mycuscotrip.com`

## 3. Datos legales pendientes antes de publicar el Libro

Completar en `pages/legales/libro-reclamaciones.html`:

- Razón social o nombre legal del proveedor.
- RUC.
- Domicilio fiscal o dirección del establecimiento.

No deben quedar visibles los textos `COMPLETAR ANTES DE PUBLICAR`.

## 4. Hoja para travel vouchers y tickets

Crea una hoja llamada exactamente `Documentos_Reserva` con esta fila de encabezados:

| reservationCode | email | documentType | title | description | url | status | updatedAt |
|---|---|---|---|---|---|---|---|
| MCT-ABC123 | cliente@correo.com | Voucher | Travel Voucher My Cusco Trip | Documento general de la reserva | https://... | Disponible | 2026-07-26 |
| MCT-ABC123 | cliente@correo.com | Ticket de tren | Tren Ollantaytambo - Machu Picchu | PeruRail Vistadome | https://... | Disponible | 2026-07-26 |
| MCT-ABC123 | cliente@correo.com | Boleto Machu Picchu | Circuito confirmado | Boleto oficial asignado | https://... | Disponible | 2026-07-26 |
| MCT-ABC123 | cliente@correo.com | Ticket Consettur | Bus subida y bajada | Ticket de bus | https://... | Disponible | 2026-07-26 |

Reglas:

- `reservationCode` y `email` deben coincidir exactamente con la reserva.
- La URL debe comenzar con `https://`.
- Para la página de voucher, `documentType` debe contener la palabra `Voucher`.
- Los demás tipos aparecerán en la página de tickets de servicio.
- Mantén los archivos de Drive con permisos de acceso adecuados para el cliente correspondiente.

## 5. Pruebas mínimas después del despliegue

1. Enviar un formulario de prueba desde cada página.
2. Confirmar que se crea la hoja correspondiente.
3. Confirmar llegada del correo administrativo y la constancia al cliente.
4. Crear una reserva de prueba en `Documentos_Reserva`.
5. Consultarla desde las páginas de voucher y tickets con el código y correo correctos.
6. Probar datos incorrectos para confirmar que no se muestran documentos de otra reserva.

## 6. Seguridad y alcance

La consulta por código de reserva más correo evita una exposición pública directa, pero no sustituye un portal autenticado. No coloques información médica, documentos de identidad completos, datos de tarjetas ni información altamente sensible dentro de enlaces públicos.
