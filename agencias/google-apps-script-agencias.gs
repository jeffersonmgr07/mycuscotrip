
/**
 * My Cusco Trip - Portal de agencias / Google Sheets
 * Deploy as Web app. Execute as: Me. Access: Anyone.
 */
const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET';
const SHEET_AGENCIES = 'Agencias';
const SHEET_ORDERS = 'Ordenes';

const AGENCY_HEADERS = [
  'id','fechaRegistro','estado','pais','tipoFiscal','numeroFiscal','razonSocial','nombreComercial',
  'representanteNombres','representanteApellidos','tipoDocumento','numeroDocumento','celular','correo','web',
  'passwordSalt','passwordHash'
];

const ORDER_HEADERS = [
  'codigoOrden','fechaOrden','agenciaId','agenciaNombre','correoAgencia','estadoPago','moneda','tipoCambio',
  'subtotalNeto','montoComisionado','comisionPaypalBanco','serviciosJson','titularJson','pasajerosJson','observaciones'
];

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = body.action || '';
    if (action === 'registerAgency') return registerAgency_(body.payload || body.agency || body);
    if (action === 'loginAgency') return loginAgency_(body.email, body.password);
    if (action === 'createOrder') return createOrder_(body.payload || body.order || body);
    return json_({ ok:false, message:'Acción no reconocida: ' + action });
  } catch (err) {
    return json_({ ok:false, message: err && err.message ? err.message : String(err) });
  }
}

function doGet() { return json_({ ok:true, message:'Endpoint activo My Cusco Trip Agencias' }); }

function registerAgency_(agency) {
  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const email = String(agency.accessEmail || agency.correo || agency.company?.email || '').trim().toLowerCase();
  if (!email) return json_({ ok:false, message:'Correo requerido.' });
  if (findRowByEmail_(sheet, email).row > 0) return json_({ ok:false, message:'Ya existe una agencia registrada con ese correo.' });
  const password = String(agency.password || '');
  const salt = agency.passwordSalt || Utilities.getUuid();
  const hash = agency.passwordHash || sha256_(salt + ':' + password);
  const row = [
    agency.id || ('AG-' + new Date().getTime()),
    new Date(),
    agency.estado || agency.status || 'Pendiente',
    agency.company?.country || agency.pais || '',
    agency.company?.taxLabel || agency.tipoFiscal || '',
    agency.company?.taxId || agency.numeroFiscal || '',
    agency.company?.legalName || agency.razonSocial || '',
    agency.company?.tradeName || agency.nombreComercial || '',
    agency.legalRepresentative?.firstName || agency.representanteNombres || '',
    agency.legalRepresentative?.lastName || agency.representanteApellidos || '',
    agency.legalRepresentative?.docType || agency.tipoDocumento || '',
    agency.legalRepresentative?.docNumber || agency.numeroDocumento || '',
    agency.accessPhone || agency.celular || agency.company?.phone || '',
    email,
    agency.company?.website || agency.web || '',
    salt,
    hash
  ];
  sheet.appendRow(row);
  return json_({ ok:true, message:'Registro recibido. Te contactaremos cuando el acceso sea aprobado.' });
}

function loginAgency_(email, password) {
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');
  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const found = findRowByEmail_(sheet, email);
  if (found.row < 1) return json_({ ok:false, message:'No encontramos una agencia registrada con ese correo.' });
  const data = found.data;
  const estado = String(data.estado || '').trim().toLowerCase();
  if (estado !== 'aprobado' && estado !== 'activo') return json_({ ok:false, message:'Tu acceso aún no está aprobado. Escríbenos para activar tu cuenta.' });
  const expected = String(data.passwordHash || '');
  const salt = String(data.passwordSalt || '');
  const incoming = sha256_(salt + ':' + password);
  if (!expected || incoming !== expected) return json_({ ok:false, message:'Correo o contraseña incorrectos.' });
  return json_({ ok:true, agency:{
    id:data.id, estado:data.estado, correo:data.correo, razonSocial:data.razonSocial, nombreComercial:data.nombreComercial,
    representanteNombres:data.representanteNombres
  }});
}

function createOrder_(order) {
  const sheet = getSheet_(SHEET_ORDERS, ORDER_HEADERS);
  const account = order.account || {};
  const items = order.items || [];
  const firstLead = items[0]?.lead || {};
  const passengers = items.flatMap(function(item){ return item.passengers || []; });
  sheet.appendRow([
    order.code || '', new Date(), account.agencyId || '', account.companyName || '', account.email || '', order.status || 'Pendiente de pago',
    order.currency || '', order.exchangeRate || '', order.subtotal || '', order.total || '', order.fee || '',
    JSON.stringify(items), JSON.stringify(firstLead), JSON.stringify(passengers), order.observations || ''
  ]);
  return json_({ ok:true, message:'Orden guardada', code: order.code || '' });
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
function findRowByEmail_(sheet, email) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { row:-1, data:null };
  const headers = values[0].map(String);
  const emailIndex = headers.indexOf('correo');
  for (let i=1; i<values.length; i++) {
    if (String(values[i][emailIndex] || '').trim().toLowerCase() === email) {
      const data = {};
      headers.forEach(function(h, idx){ data[h] = values[i][idx]; });
      return { row:i+1, data:data };
    }
  }
  return { row:-1, data:null };
}
function sha256_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(function(b){ const v=(b<0?b+256:b).toString(16); return v.length===1?'0'+v:v; }).join('');
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
