# V61 - Panel de alojamientos UX

## Cambios principales

- El panel abre primero en **Administrar alojamientos** después del login.
- Registro hotelero bloquea duplicados por:
  - correo,
  - número de documento,
  - RUC.
- Crear alojamiento:
  - limpia el formulario cada vez que se abre como nuevo alojamiento,
  - elimina botón “Abrir Google Maps”,
  - mantiene “Usar mi ubicación actual”,
  - agrega vista previa de mapa embebido cuando hay ubicación,
  - elimina campo “URLs de galería”,
  - cambia texto de fotos a recomendación de 5 fotos,
  - exige mínimo 1 foto al crear,
  - muestra vista previa de imágenes seleccionadas.
- Cards de alojamientos:
  - nombre del alojamiento más visible,
  - tipo/categoría como dato secundario,
  - botones “Editar alojamiento” y “Crear habitación” dentro de cada card.
- Crear habitación:
  - se abre desde la card del alojamiento,
  - ya no pide seleccionar alojamiento,
  - título dinámico “Crear habitación - Nombre del alojamiento”,
  - tipo de habitación como desplegable,
  - capacidad adultos y niños,
  - servicios incluidos con checkboxes,
  - elimina campo URLs de fotos,
  - muestra vista previa de imágenes seleccionadas.
- Backend:
  - agrega `update_property`,
  - guarda datos por encabezado para evitar columnas desplazadas,
  - agrega columnas nuevas a `Rooms` y `Properties` sin borrar datos existentes.

## Archivos modificados

- `hoteles/panel-admin-hotel.html`
- `hoteles/assets/js/pages/hotel-marketplace.js`
- `hoteles/assets/css/hoteles.css`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `CAMBIOS_V61_PANEL_ALOJAMIENTOS_UX.md`

## Nota importante sobre imágenes

En esta versión las imágenes seleccionadas se muestran como vista previa y se guardan como conteo/nombres en la hoja. Para almacenar los archivos reales se necesita implementar subida a Google Drive o a un servicio de storage como Cloudinary/Supabase/Firebase.
