# V46 - Hoteles: registro, login y panel marketplace

## Registro `register-manager-hotel.html`

- Corregido el cambio dinámico entre Persona natural y Empresa.
- Persona natural muestra: tipo de documento, número de documento y nacionalidad.
- Empresa muestra: razón social y RUC.
- Agregada subsección `Datos de inicio de sesión`.
- Correo, contraseña y confirmar contraseña quedan al final del formulario.
- Contraseña con botón para ver/ocultar.
- Requisitos visuales de contraseña:
  - mínimo 8 caracteres,
  - una mayúscula,
  - un número,
  - un carácter especial,
  - confirmación coincidente.
- Validaciones:
  - nombres/apellidos solo letras,
  - RUC solo números de 11 dígitos,
  - DNI solo números de 8 dígitos,
  - WhatsApp solo números,
  - correo con formato válido.
- Fondo cambiado a imagen de Machu Picchu con overlay verde.

## Login `login-admin-hotel.html`

- Fondo cambiado a imagen de Machu Picchu con overlay verde.
- Contraseña con botón para ver/ocultar.
- Botón Crear cuenta centrado.

## Panel `panel-admin-hotel.html`

- Crear alojamiento ahora tiene destino como menú desplegable restringido a destinos operativos.
- Agregado campo de enlace de Google Maps.
- Cambiado `URL de portada` por `Página web del alojamiento`.
- Fotos del alojamiento exige mínimo 5 fotos o 5 URLs de galería.
- Agregada sección de Confirmación y comisión:
  - confirmación instantánea,
  - confirmación manual,
  - comisión My Cusco Trip: 10%, 15%, 20% o 30%.
- Crear habitación ahora incluye cantidad disponible y fotos/URLs de habitación.
- Confirmación del panel ahora muestra resumen y botón `Editar modo` en modal.

## Backend Apps Script

Actualizado `google-apps-script-hoteles-marketplace.gs` para guardar nuevos campos:

- mapUrl,
- website,
- commissionRate,
- photoCount,
- stock,
- roomGalleryJson,
- roomPhotoCount.

