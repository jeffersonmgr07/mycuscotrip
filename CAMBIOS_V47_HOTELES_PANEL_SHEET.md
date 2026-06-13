# V47 - Panel hotelero + plantilla Google Sheet

## Cambios visuales y funcionales

### Panel de administración / Mi cuenta
- Se amplió la sección **Mi cuenta** para mostrar datos completos:
  - Tipo de cuenta
  - Nombres del representante
  - Apellidos del representante
  - Tipo y número de documento
  - Nacionalidad
  - Celular / WhatsApp
  - Correo
  - Página web
  - Razón social y RUC cuando aplique empresa
- Se agregó botón **Cambiar contraseña** con modal independiente.

### Crear alojamiento
- Se resaltó en negrita solamente la instrucción **Sube mínimo 5 fotos generales del alojamiento**.
- El texto de comisión quedó en estilo normal.
- Se agregó apoyo para ubicación:
  - campo de enlace de Google Maps,
  - botón **Usar mi ubicación** con geolocalización del navegador,
  - botón **Abrir Google Maps** para copiar/pegar enlace.

> Nota técnica: para elegir el punto dentro de un mapa embebido hace falta Google Maps Platform / Places API con API Key. Para MVP se deja enlace manual + geolocalización del navegador.

### Confirmación
- Se mejoró el texto de recomendación en la sección Confirmación.
- Se separó visualmente el bloque explicativo del resumen de alojamientos.
- El modal de edición de modo de confirmación ahora incluye la misma recomendación con texto ordenado.

### Apps Script
- Se agregó acción base `change_password`.
- Se mantiene la estructura de hojas:
  - Hotel_Users
  - Properties
  - Rooms
  - Availability
  - Hotel_Orders
  - Payments
  - Photo_Assets

## Plantilla de Google Sheet

Se agregó:

`hoteles/backend/mycuscotrip_hotel_marketplace_template.xlsx`

También se entrega como archivo independiente:

`mycuscotrip_hotel_marketplace_template.xlsx`

## Instrucciones rápidas Apps Script

1. Sube la plantilla `.xlsx` a Google Drive.
2. Ábrela con Google Sheets.
3. Ve a **Extensiones → Apps Script**.
4. Copia el contenido de:
   `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
5. Guarda el proyecto.
6. Ejecuta manualmente `setupHotelMarketplaceSheets()` una vez.
7. Despliega como Web App:
   - Ejecutar como: tú
   - Acceso: cualquiera con el enlace
8. Copia la URL `/exec` y pégala en los HTML donde está:
   `window.MCT_HOTEL_MARKETPLACE_APPS_SCRIPT_URL = "";`

