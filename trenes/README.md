# Módulo de venta de trenes - My Cusco Trip

Carpeta creada para trabajar la venta de trenes sin alterar los estilos ni la lógica principal del sitio.

## Archivos principales

- `index.html`: página pública para buscar y comprar trenes.
- `paypal-retorno.html`: página de retorno para confirmar el pago PayPal.
- `assets/css/trenes.css`: estilos propios del módulo.
- `assets/js/config.js`: configuración editable del módulo.
- `assets/js/trenes.js`: lógica del buscador, selección de trenes, extras y creación de orden.
- `assets/js/paypal-retorno.js`: captura de pago PayPal al volver desde PayPal.
- `backend/google-apps-script-trenes.gs`: backend completo para Google Sheets + PayPal.
- `backend/google-sheet-template-trenes.xlsx`: plantilla referencial de hojas y columnas.

## Configuración del frontend

Edita `trenes/assets/js/config.js`:

```js
window.MCT_TRAIN_CONFIG = {
  appsScriptUrl: 'PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT',
  trainsJsonPath: '../assets/data/trains.json',
  paypalReturnPath: '/trenes/paypal-retorno.html',
  exchangeRate: 3.38,
  currency: 'USD',
  supportWhatsApp: '+51999999999',
  bookingPrefix: 'CUZ-T'
};
```

El módulo lee el JSON desde:

```txt
../assets/data/trains.json
```

Por eso no duplica el catálogo de trenes.

## Configuración de Google Apps Script

1. Crea un Google Sheet nuevo.
2. Copia su ID.
3. Abre Extensiones > Apps Script.
4. Pega el contenido de `backend/google-apps-script-trenes.gs`.
5. Cambia:

```js
const SPREADSHEET_ID = 'PEGAR_AQUI_ID_DE_GOOGLE_SHEET';
const PUBLIC_BASE_URL = 'https://mycuscotrip.com/trenes';
const SUPPORT_EMAIL = 'reservas@mycuscotrip.com';
```

6. Ejecuta `setupTrainSheets()` una vez.
7. En Propiedades del script agrega:

```txt
PAYPAL_MODE = sandbox o live
PAYPAL_CLIENT_ID = tu client id
PAYPAL_CLIENT_SECRET = tu secret
```

8. Implementa como aplicación web:
   - Ejecutar como: tú.
   - Acceso: cualquier usuario con el enlace.
9. Copia la URL `/exec` en `trenes/assets/js/config.js`.

## Reglas implementadas

- Por defecto busca `Ollantaytambo → Machu Picchu`.
- Permite ida desde Cusco, Ollantaytambo, Urubamba o Hidroeléctrica.
- Permite retorno hacia Cusco, Ollantaytambo, Urubamba o Hidroeléctrica.
- En ida y vuelta, el retorno se filtra por la misma empresa elegida en ida.
- Se puede combinar categoría, pero no empresa.
- No se muestran trenes locales en esta página porque su compra es personal/presencial.
- El precio de niño se lee desde el JSON; si faltara, usa adulto × 0.80.
- Extras:
  - Circuito 2 gratis en ida y vuelta.
  - Circuito 1 o 3: USD 15.90 por persona.
  - Consetur subida: USD 12 por persona.
  - Consetur bajada: USD 12 por persona.
  - Consetur ida y vuelta: USD 24 por persona.
  - Desayuno Power Peruano: USD 8.90 por persona.
  - Almuerzo Power Peruano: USD 14.90 por persona.
- Código de reserva: `CUZ-T-HEX-RANDOM`.

## Nota operativa

La página cobra la orden con PayPal, pero la emisión real del boleto debe validarse con la empresa ferroviaria. Por eso los correos y textos indican que la compra queda sujeta a disponibilidad final.
