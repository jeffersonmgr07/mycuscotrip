/* Google Apps Script para portal de agencias My Cusco Trip
1. Crea un Google Sheet.
2. Extensiones > Apps Script.
3. Pega este código.
4. Cambia SPREADSHEET_ID por el ID de tu hoja.
5. Implementar > Nueva implementación > Aplicación web.
   Ejecutar como: tú. Acceso: cualquier usuario con el enlace.
6. Copia la URL y pégala en:
   agencias/assets/js/agencias-portal.js  -> CONFIG.appsScriptUrl
   agencias/registro.html -> APPS_SCRIPT_URL
*/
const SPREADSHEET_ID = 'PEGAR_AQUI_ID_DE_GOOGLE_SHEET';
const SHEET_AGENCIES = 'Agencias';
const SHEET_ORDERS = 'Ordenes';
function doPost(e) {
  const payload = JSON.parse(e.postData.contents || '{}');
  if (payload.action === 'registerAgency') return json(registerAgency(payload));
  if (payload.action === 'createReservationOrder') return json(createReservationOrder(payload));
  if (payload.action === 'loginAgency') return json(loginAgency(payload));
  return json({ ok:false, error:'Acción no reconocida' });
}
function getSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); }
  return sh;
}
function registerAgency(p) {
  const sh = getSheet(SHEET_AGENCIES, ['Fecha','Estado','País','Tipo fiscal','Número fiscal','Razón social','Nombre comercial','Representante','Documento','Celular','Correo','Web','JSON']);
  sh.appendRow([new Date(), p.status || 'Pendiente', p.country, p.taxLabel, p.taxNumber, p.legalName, p.commercialName, `${p.repNames||''} ${p.repLastnames||''}`.trim(), `${p.docType||''} ${p.docNumber||''}`.trim(), p.phone, p.email, p.website, JSON.stringify(p)]);
  return { ok:true, message:'Agencia registrada' };
}
function createReservationOrder(p) {
  const sh = getSheet(SHEET_ORDERS, ['Fecha','Código','Estado','Agencia','Correo','Moneda','TC','Subtotal','Comisión','Total','Servicios JSON','Orden JSON']);
  const agency = p.agency || {};
  sh.appendRow([new Date(), p.code, p.status || 'Pendiente de pago', agency.agencyName || agency.commercialName || '', agency.email || '', p.currency, p.exchangeRate, p.subtotal, p.fees, p.total, JSON.stringify(p.items || []), JSON.stringify(p)]);
  return { ok:true, code:p.code };
}
function loginAgency(p) {
  const sh = getSheet(SHEET_AGENCIES, ['Fecha','Estado','País','Tipo fiscal','Número fiscal','Razón social','Nombre comercial','Representante','Documento','Celular','Correo','Web','JSON']);
  const values = sh.getDataRange().getValues();
  const email = String(p.email || '').toLowerCase().trim();
  for (let i=1;i<values.length;i++) {
    const rowEmail = String(values[i][10] || '').toLowerCase().trim();
    const status = String(values[i][1] || '').toLowerCase();
    if (rowEmail === email && status.includes('aprob')) return { ok:true, agencyName:values[i][6], email:values[i][10] };
  }
  return { ok:false, error:'Agencia no aprobada o correo no encontrado' };
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
