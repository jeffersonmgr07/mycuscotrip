PARCHE — Mis datos + Registro de agencias v8

Archivos incluidos:

1) agencias/mis-datos.html
2) agencias/assets/js/pages/mis-datos.js
3) agencias/registro.html
4) agencias/assets/js/pages/registro-agencias.js
5) agencias/assets/css/agencias.css
6) agencias/google-apps-script-agencias-v8-perfil-registro.gs

Qué cambia:
- En Mis datos, el texto superior queda más claro y comercial.
- Los datos se muestran primero en modo lectura.
- Botón “Editar información” habilita solo los campos permitidos.
- Empresa: no permite editar razón social ni identificación fiscal.
- Persona natural: no permite editar nombres, nacionalidad ni documento.
- Correo de acceso no es editable.
- Agrega botón WhatsApp para cambios sensibles.
- Cambiar contraseña queda oculto hasta presionar el botón “Cambiar contraseña”.
- Checklist de contraseña ahora valida coincidencia.
- Registro de agencias distingue mejor Persona natural / Empresa.
- Empresa pide país fiscal, razón social/nombre fiscal, identificación fiscal, nombre comercial y datos completos del representante.
- Persona natural pide nacionalidad, documento, nombres y apellidos.
- Listas de países completas/priorizadas en registro.

IMPORTANTE Apps Script:
- Si ya actualizaste el Apps Script v7 anterior, reemplázalo por el archivo:
  agencias/google-apps-script-agencias-v8-perfil-registro.gs
- Luego ejecuta setupAgencySheets() una vez.
- Publica una nueva versión del Web App.

No se toca PayPal ni Mercado Pago.
