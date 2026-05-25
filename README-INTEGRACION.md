# Módulo agencias - My Cusco Trip

## Instalación

1. Copia la carpeta `agencias` en la raíz del proyecto.
2. Sube el proyecto a tu hosting.
3. Abre:
   - `/agencias/login.html`
   - `/agencias/registro.html`
   - `/agencias/index.html`

## Experiencias

Las experiencias cargan desde:

`agencias/assets/data/experiencias-diarias.json`

También hay respaldo interno en JavaScript para evitar el error de “no cargan experiencias” si el JSON falla.

## Imágenes

Las imágenes apuntan a rutas reales del proyecto, por ejemplo:

`../assets/img/tours/bienvenida-ancestral-cusco/cover.jpg`

## Tipo de cambio

El tipo de cambio inicial está en:

`agencias/assets/data/experiencias-diarias.json`

Campo:

`exchangeRate: 3.38`

También puede cambiarse manualmente desde la página.

## Google Sheets

1. Crea una hoja de cálculo en Google Sheets.
2. Copia el ID de la hoja desde la URL.
3. Abre Extensiones > Apps Script.
4. Pega el contenido de:

`agencias/backend/google-apps-script-agencias.gs`

5. Cambia:

`SPREADSHEET_ID = 'PEGAR_AQUI_ID_DE_GOOGLE_SHEET'`

6. Implementar > Nueva implementación > Aplicación web.
7. Ejecutar como: tú.
8. Acceso: cualquier usuario con el enlace.
9. Copia la URL del Web App.
10. Pégala en:

`agencias/assets/js/agencias-portal.js`

línea:

`appsScriptUrl: 'PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT'`

Y en `agencias/registro.html`:

`APPS_SCRIPT_URL='PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT'`

## Flujo

- La agencia ingresa al portal.
- Selecciona una experiencia.
- Elige fecha, horario, pasajeros, titular, documentos y recojo.
- Puede agregar varios servicios en una misma orden.
- Genera una orden con código.
- El total incluye comisión PayPal + banco usando:

`neto / (1 - 0.054 - 0.015)`

## Seguridad

Esta versión usa login básico con `localStorage`. Para una validación más real, usa la función `loginAgency` del Apps Script y aprueba agencias en la hoja cambiando su estado a “Aprobada”.
