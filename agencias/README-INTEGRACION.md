# Módulo `/agencias` - My Cusco Trip

Archivos principales:

- `agencias/index.html`: portal de experiencias, selector de moneda, carrito y generación de orden.
- `agencias/login.html`: ingreso al portal.
- `agencias/registro.html`: creación de acceso.
- `agencias/assets/data/agencias-tours.json`: catálogo editable de experiencias y tarifas.
- `agencias/assets/js/pages/agencias.js`: lógica de experiencias, carrito, moneda, orden y envío a Google Sheets.
- `agencias/assets/js/pages/registro-agencias.js`: registro de cuentas y envío a Google Sheets.
- `agencias/google-apps-script-agencias.gs`: código para conectar con Google Sheets.

## Qué ya quedó adaptado al proyecto

Los HTML cargan automáticamente:

```html
../components/header.html
../components/footer.html
```

También usan los estilos principales del proyecto:

```html
../assets/css/main.css
../assets/css/components.css
../assets/css/header.css
../assets/css/footer.css
../assets/css/responsive.css
```

No se agregó logo dentro de los HTML porque el logo debe venir desde el header global.

## Tipo de cambio

El tipo de cambio inicial está en `agencias/assets/data/agencias-tours.json`:

```json
"exchangeRate": 3.38
```

También se puede editar desde el campo visible del portal. El valor se guarda en el navegador.

## Fórmula de PayPal + banco

Para recibir un neto completo, el sistema calcula:

```js
total = subtotal / (1 - 0.054 - 0.015)
```

Ejemplo: para recibir 100 netos, se cobra 107.41 aprox.

## Conexión con Google Sheets

### 1. Crear la hoja

Crea un Google Sheet vacío. Copia el ID de la URL.

Ejemplo de URL:

```text
https://docs.google.com/spreadsheets/d/ID_DE_LA_HOJA/edit
```

### 2. Crear Apps Script

En tu Google Sheet:

1. Extensiones → Apps Script.
2. Pega el contenido de `agencias/google-apps-script-agencias.gs`.
3. Cambia:

```js
const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET';
```

por el ID real de tu hoja.

### 3. Publicar el Web App

En Apps Script:

1. Deploy → New deployment.
2. Type: Web app.
3. Execute as: Me.
4. Who has access: Anyone.
5. Deploy.
6. Copia la URL del Web App.

### 4. Pegar la URL en el proyecto

En estos dos archivos:

```text
agencias/assets/js/pages/agencias.js
agencias/assets/js/pages/registro-agencias.js
```

busca:

```js
googleScriptUrl: ''
```

y pega tu URL:

```js
googleScriptUrl: 'https://script.google.com/macros/s/XXXXX/exec'
```

Con eso, los registros y órdenes se enviarán a Google Sheets.

## Importante sobre seguridad

Esta versión usa `localStorage` para el acceso y Google Sheets para almacenar registros/órdenes. Es simple y rápida para operar, pero no es una autenticación bancaria ni un backend seguro.

Para una zona privada real con usuarios, roles, recuperación de contraseña y control de estados, la siguiente etapa recomendada es Supabase Auth + tablas `agencies`, `orders`, `order_items` y `payments`.

## Dónde editar tarifas y textos

Edita `agencias/assets/data/agencias-tours.json`.

Campos útiles:

- `name`: nombre visible.
- `description`: descripción para el cliente.
- `pricePEN`: precio base en soles.
- `priceUSD`: precio base en dólares para servicios que ya están en USD.
- `priceAltPEN`: precio alternativo, por ejemplo con almuerzo.
- `startLabel`: horarios visibles.
- `durationLabel`: duración.
- `notIncluded`: entradas o pagos no incluidos.
- `image`: imagen cover.
- `jsonSources`: archivos JSON desde donde se intentará cargar el itinerario detallado.
