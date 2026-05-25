/**
 * My Cusco Trip - Portal de reservas / Google Sheets
 * 1) Crea una hoja de cálculo.
 * 2) Extensiones > Apps Script.
 * 3) Pega este código.
 * 4) Cambia SPREADSHEET_ID por el ID de tu Google Sheet.
 * 5) Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
 * 6) Copia la URL del Web App y pégala en CONFIG.googleScriptUrl dentro de:
 *    agencias/assets/js/pages/agencias.js
 *    agencias/assets/js/pages/registro-agencias.js
 */

const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET';
const SHEET_AGENCIES = 'Registros';
const SHEET_ORDERS = 'Ordenes';

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = body.action || body.type || '';
    const payload = body.payload || body.order || body.agency || body;

    if (action === 'registerAgency') {
      appendAgency_(payload);
      return json_({ ok: true, message: 'Registro guardado' });
    }

    if (action === 'createOrder') {
      appendOrder_(payload);
      return json_({ ok: true, message: 'Orden guardada', code: payload.code });
    }

    return json_({ ok: false, message: 'Acción no reconocida' });
  } catch (error) {
    return json_({ ok: false, message: error.message });
  }
}

function doGet() {
  return json_({ ok: true, message: 'Endpoint activo para My Cusco Trip' });
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function appendAgency_(agency) {
  const sheet = getSheet_(SHEET_AGENCIES, [
    'Fecha registro', 'Estado', 'País', 'Tipo identificación fiscal', 'Identificación fiscal',
    'Razón social', 'Nombre comercial', 'Correo empresa', 'Teléfono empresa', 'Web',
    'Representante nombres', 'Representante apellidos', 'Tipo doc.', 'Nro. doc.',
    'Correo acceso', 'Celular acceso', 'ID local'
  ]);

  sheet.appendRow([
    new Date(),
    agency.status || 'Activo',
    agency.company?.country || '',
    agency.company?.taxLabel || '',
    agency.company?.taxId || '',
    agency.company?.legalName || '',
    agency.company?.tradeName || '',
    agency.company?.email || '',
    agency.company?.phone || '',
    agency.company?.website || '',
    agency.legalRepresentative?.firstName || '',
    agency.legalRepresentative?.lastName || '',
    agency.legalRepresentative?.docType || '',
    agency.legalRepresentative?.docNumber || '',
    agency.accessEmail || '',
    agency.accessPhone || '',
    agency.id || ''
  ]);
}

function appendOrder_(order) {
  const sheet = getSheet_(SHEET_ORDERS, [
    'Fecha orden', 'Código', 'Estado', 'Cuenta', 'Contacto', 'Moneda', 'Tipo cambio',
    'Subtotal', 'Comisiones', 'Total', 'Comisión aplicada', 'Servicios JSON'
  ]);

  sheet.appendRow([
    new Date(),
    order.code || '',
    order.status || 'Pendiente de pago',
    order.account?.companyName || order.account?.email || '',
    order.account?.contactName || '',
    order.currency || '',
    order.exchangeRate || '',
    order.subtotal || '',
    order.fee || '',
    order.total || '',
    order.paypalBankFeeApplied ? 'Sí' : 'No',
    JSON.stringify(order.items || [])
  ]);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
