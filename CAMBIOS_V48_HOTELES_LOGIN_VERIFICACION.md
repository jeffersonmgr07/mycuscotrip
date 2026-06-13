# V48 - Hoteles: login real, verificación por correo y panel sin datos demo

## Correcciones aplicadas

### Registro de administrador de alojamientos
- Se corrigió el botón de ver/ocultar contraseña en:
  - Contraseña
  - Confirmar contraseña
- Al registrar una cuenta, el mensaje ahora indica:
  "Hemos enviado un correo de verificación a tu bandeja. Revisa ese correo para activar tu cuenta."
- El Apps Script ahora genera un token de verificación y envía un correo al usuario.
- Cuando el usuario abre el enlace del correo, la cuenta cambia a estado aprobado.

### Login hotelero
- Se corrigió el botón de ver/ocultar contraseña.
- El login ya no usa datos demo cuando existe Apps Script configurado.
- El login valida correo, contraseña y estado de cuenta contra Google Sheet.
- Si la cuenta no está aprobada/verificada, muestra advertencia.

### Panel de administración
- El panel ahora carga los datos reales del usuario logueado desde Google Sheet.
- Se eliminó el texto de placeholder que decía que al conectar Google Sheet aparecerían los hoteles.
- Si no existen alojamientos, se muestra solamente:
  "Aún no hay alojamientos registrados. Crea tu primer alojamiento para que aparezca en este panel."
- Se agregó botón Cerrar sesión.
- Al cerrar sesión se limpia localStorage y se vuelve al login.

### Apps Script
- Se agregaron acciones:
  - login_owner
  - get_owner
  - get_properties
  - verify_owner
- Se ampliaron cabeceras de Hotel_Users:
  - verificationToken
  - verifiedAt
  - sessionToken
  - lastLoginAt
- Se añadió envío de correo con MailApp.

## Instrucción importante
Después de copiar el nuevo Apps Script, ejecutar una vez:

setupHotelMarketplaceSheets()

Esto agregará columnas faltantes sin borrar datos existentes.
