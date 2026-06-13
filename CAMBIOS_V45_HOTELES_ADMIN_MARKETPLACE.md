# V45 - Hoteles: hero, registro hotelero y panel marketplace

## Cambios visuales del index de hoteles

- Se corrigió el z-index del calendario del hero para que aparezca por encima de las cards de hoteles.
- Los campos Entrada y Salida ahora tienen el label fuera del botón, igual que Destino y Buscar hotel.
- En Categoría, el texto por defecto ahora es “Todas”.
- Se mantuvo el botón Buscar.

## Nuevas rutas profesionales

Se crearon nuevas rutas dentro de la carpeta hoteles:

- `hoteles/register-manager-hotel.html`
- `hoteles/login-admin-hotel.html`
- `hoteles/panel-admin-hotel.html`

Las rutas antiguas quedan como redirección para no romper enlaces:

- `hoteles/registro-hotelero.html` → `register-manager-hotel.html`
- `hoteles/login-hotelero.html` → `login-admin-hotel.html`
- `hoteles/panel-hotelero.html` → `panel-admin-hotel.html`

## Registro de administradores

El registro ahora permite elegir:

- Persona natural
- Empresa

Si se elige persona natural, se solicitan:

- Tipo de documento
- Número de documento
- Nacionalidad

Si se elige empresa, se solicitan:

- Razón social
- RUC

Nombres y apellidos se mantienen como datos del representante.

## Validaciones agregadas

- Nombres y apellidos: solo letras.
- DNI: solo números y 8 dígitos.
- RUC: solo números y 11 dígitos.
- Otros documentos: alfanuméricos.
- WhatsApp: solo números.
- Correo: formato válido de correo.
- Nacionalidad: lista desplegable de países.
- Celular: selector de código de país dentro del mismo campo.

## Login hotelero

- Nueva ruta: `login-admin-hotel.html`.
- Título: “Acceso para hoteles”.
- Fondo con imagen y overlay verde.
- Se eliminó texto informativo innecesario.
- Botón “Crear cuenta” alineado.

## Panel de administración

- Nueva ruta: `panel-admin-hotel.html`.
- Secciones por botones, no una debajo de otra:
  - Mi cuenta
  - Alojamientos
  - Bloquear fechas
  - Confirmación
- Mi cuenta muestra datos principales y botón para editar información.
- Crear alojamiento y crear habitación ahora abren modales.
- Bloquear fechas permite elegir alojamiento, habitación y motivo.
- Motivos disponibles:
  - Bloqueado por solicitud especial
  - Reserva confirmada
  - Mantenimiento programado

## Fotos

Las fotos no pueden guardarse directamente en GitHub desde el navegador. Opciones recomendadas:

1. Subirlas a Google Drive vía Apps Script y guardar la URL pública en Google Sheets.
2. Usar Cloudinary, Supabase Storage o Firebase Storage.
3. Usar URLs públicas manuales durante el MVP.

## Google Sheet recomendado

Hojas:

- `Hotel_Users`
- `Properties`
- `Rooms`
- `Availability`
- `Hotel_Orders`
- `Payments`
- `Photo_Assets`

## Disponibilidad

La hoja `Availability` debe guardar una fila por fecha bloqueada. Ejemplo:

- propertyId
- roomId
- date
- status
- source
- orderId

Cuando un cliente reserva desde Hoteles, Quote Package o un paquete, se debe insertar bloqueo de fechas con `source` distinto:

- `hoteles`
- `quote_package`
- `manual_owner`
- `package_booking`

