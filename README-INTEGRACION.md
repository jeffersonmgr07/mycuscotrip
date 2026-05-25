# Módulo `/agencias` — acceso real con Google Sheets

Esta versión usa Google Sheets + Google Apps Script para:

- registrar agencias,
- aprobar manualmente agencias,
- validar login real con correo y contraseña,
- guardar órdenes de reserva.

No necesitas Supabase para esta primera etapa.

---

## 1. Archivos incluidos

- `index.html` — portal de experiencias y reservas.
- `login.html` — acceso real de agencias afiliadas.
- `registro.html` — registro de agencias o agentes de viajes.
- `assets/css/agencias-portal.css` — estilos del portal, login y registro.
- `assets/js/agencias-portal.js` — lógica de experiencias, carrito y órdenes.
- `assets/data/experiencias-diarias.json` — catálogo de servicios.
- `backend/google-apps-script-agencias.gs` — backend simple para Google Sheets.

---

## 2. Crear la base en Google Sheets

1. Crea una hoja nueva en Google Sheets.
2. Copia el ID de la hoja. Está en la URL:

```text
https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
```

3. Abre `Extensiones > Apps Script`.
4. Pega el contenido de:

```text
agencias/backend/google-apps-script-agencias.gs
```

5. Reemplaza:

```js
const SPREADSHEET_ID = 'PEGAR_AQUI_ID_DE_GOOGLE_SHEET';
```

por el ID real de tu hoja.

6. Ejecuta una vez la función:

```js
setupSheets()
```

Autoriza los permisos.

---

## 3. Publicar Apps Script como Web App

1. En Apps Script, entra a `Implementar > Nueva implementación`.
2. Tipo: `Aplicación web`.
3. Ejecutar como: `Yo`.
4. Quién tiene acceso: `Cualquier usuario con el enlace`.
5. Copia la URL generada del Web App.

---

## 4. Pegar la URL en los archivos del portal

Busca esta línea en estos tres archivos:

```js
PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT
```

y reemplázala por la URL del Web App:

- `agencias/login.html`
- `agencias/registro.html`
- `agencias/assets/js/agencias-portal.js`

---

## 5. Flujo de acceso

1. La agencia entra a:

```text
/agencias/registro.html
```

2. Completa sus datos y crea su contraseña.
3. En Google Sheets, la agencia queda con estado:

```text
Pendiente
```

4. Tú revisas la agencia y cambias manualmente el estado a:

```text
Aprobado
```

5. La agencia ya puede ingresar desde:

```text
/agencias/login.html
```

con el correo y contraseña registrados.

---

## 6. Seguridad

Esta solución ya valida login contra Google Sheets usando contraseña con hash SHA-256 + salt en Apps Script. No guarda la contraseña en texto plano.

Para una operación grande con muchos usuarios, recuperación de contraseñas, roles, historial avanzado y permisos granulares, Supabase sería mejor. Para iniciar rápido y guardar registros/órdenes, Google Sheets es suficiente.

---

## 7. Órdenes de reserva

Cuando una agencia genera una orden, se guarda en la hoja:

```text
Ordenes
```

La orden queda como:

```text
Pendiente de pago
```

Puedes actualizar manualmente el estado a:

```text
Pagado
Confirmado
Cancelado
```

---

## 8. Tipo de cambio

El tipo de cambio inicial está en:

```js
const CONFIG = { exchangeRate: 3.38 }
```

Archivo:

```text
agencias/assets/js/agencias-portal.js
```

También puede editarse desde la pantalla del portal.
