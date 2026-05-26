
/**
 * My Cusco Trip - Portal de agencias / Google Sheets
 * Deploy as Web app. Execute as: Me. Access: Anyone.
 *
 * Acciones:
 * - registerAgency: guarda agencia como Pendiente y envía correo de verificación.
 * - verifyEmail: verifica correo mediante link enviado al cliente.
 * - loginAgency: permite acceso solo si correo verificado + estado Aprobado/Activo.
 * - createOrder: guarda orden de reserva.
 */
// Opcional: si este Apps Script fue creado desde Extensiones > Apps Script dentro de tu Google Sheet,
// puedes dejarlo vacío y usará automáticamente esa hoja.
// Si el script es independiente, pega aquí el ID real de Google Sheets.
const SPREADSHEET_ID = '106y_7HTjHpLknivNSeAj1Z6AEBhLvw5hsFqa1GgrGaE';
const SHEET_AGENCIES = 'Agencias';
const SHEET_ORDERS = 'Ordenes';
const SHEET_PAYMENTS = 'Pagos';
const BRAND_NAME = 'My Cusco Trip';
const SUPPORT_EMAIL = 'reservas@mycuscotrip.com';
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz38yAU-vEt5Joe8NQjDRFsEIOqgDIv-w99YHI5sLbO03rKCt-dwAH10j0A92pyOAEx/exec';

const AGENCY_HEADERS = [
  'id','fechaRegistro','estado','emailVerificado','verificationToken','fechaVerificacion',
  'pais','tipoFiscal','numeroFiscal','razonSocial','nombreComercial',
  'representanteNombres','representanteApellidos','tipoDocumento','numeroDocumento','celular','correo','web',
  'passwordSalt','passwordHash'
];

const ORDER_HEADERS = [
  'codigoOrden','fechaOrden','agenciaId','agenciaNombre','correoAgencia','estadoPago','moneda','tipoCambio',
  'subtotalNeto','montoComisionado','comisionPaypalBanco','fechaVencimientoPago','serviciosJson','titularJson','pasajerosJson','observaciones'
];

const PAYMENT_HEADERS = [
  'fechaRegistro','codigoOrden','agenciaId','agenciaNombre','correoAgencia','monto','moneda','mensaje','voucherNombre','voucherUrl','estado'
];

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = body.action || '';
    if (action === 'registerAgency') return registerAgency_(body.payload || body.agency || body);
    if (action === 'loginAgency') return loginAgency_(body.email, body.password);
    if (action === 'createOrder') return createOrder_(body.payload || body.order || body);
    if (action === 'listOrders') return listOrders_(body.email || body.correo || '', body.agencyId || '');
    if (action === 'getAgencyProfile') return getAgencyProfile_(body.email || body.correo || '', body.agencyId || '');
    if (action === 'updateAgencyProfile') return updateAgencyProfile_(body.payload || body.profile || body);
    if (action === 'changePassword') return changePassword_(body.payload || body);
    if (action === 'registerPayment') return registerPayment_(body.payload || body.payment || body);
    return json_({ ok:false, message:'Acción no reconocida: ' + action });
  } catch (err) {
    return json_({ ok:false, message: err && err.message ? err.message : String(err) });
  }
}

function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : '';
    if (action === 'verifyEmail') return verifyEmail_(e.parameter.token || '');
    return html_('<h2>Endpoint activo</h2><p>Portal de agencias My Cusco Trip.</p>');
  } catch (err) {
    return html_('<h2>No se pudo completar la solicitud</h2><p>' + escapeHtml_(err.message || String(err)) + '</p>');
  }
}

function registerAgency_(agency) {
  validateConfig_();
  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const email = String(agency.accessEmail || agency.correo || agency.company?.email || '').trim().toLowerCase();
  if (!email) return json_({ ok:false, message:'Correo requerido.' });
  if (findRowByEmail_(sheet, email).row > 0) return json_({ ok:false, message:'Ya existe una agencia registrada con ese correo.' });

  const password = String(agency.password || '');
  const passwordError = validatePassword_(password);
  if (passwordError) return json_({ ok:false, message: passwordError });

  const salt = Utilities.getUuid();
  const hash = sha256_(salt + ':' + password);
  const token = Utilities.getUuid() + '-' + Utilities.getUuid();
  const id = agency.id || ('AG-' + new Date().getTime());

  appendObjectRow_(sheet, {
    id: id,
    fechaRegistro: new Date(),
    estado: agency.estado || agency.status || 'Pendiente',
    emailVerificado: 'No',
    verificationToken: token,
    fechaVerificacion: '',
    pais: agency.company?.country || agency.pais || '',
    tipoFiscal: agency.company?.taxLabel || agency.tipoFiscal || '',
    numeroFiscal: agency.company?.taxId || agency.numeroFiscal || '',
    razonSocial: agency.company?.legalName || agency.razonSocial || '',
    nombreComercial: agency.company?.tradeName || agency.nombreComercial || '',
    representanteNombres: agency.legalRepresentative?.firstName || agency.representanteNombres || '',
    representanteApellidos: agency.legalRepresentative?.lastName || agency.representanteApellidos || '',
    tipoDocumento: agency.legalRepresentative?.docType || agency.tipoDocumento || '',
    numeroDocumento: agency.legalRepresentative?.docNumber || agency.numeroDocumento || '',
    celular: agency.accessPhone || agency.celular || agency.company?.phone || '',
    correo: email,
    web: agency.company?.website || agency.web || '',
    passwordSalt: salt,
    passwordHash: hash
  });

  sendVerificationEmail_(email, agency.company?.tradeName || agency.company?.legalName || agency.nombreComercial || 'agencia', token);
  return json_({ ok:true, message:'Registro recibido. Te enviamos un correo para verificar tu email. Después de verificarlo, tu acceso quedará pendiente de aprobación.' });
}

function verifyEmail_(token) {
  validateConfig_();
  token = String(token || '').trim();
  if (!token) return html_('<h2>Token inválido</h2><p>El enlace de verificación no es válido.</p>');

  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const tokenIndex = headers.indexOf('verificationToken');
  const verifiedIndex = headers.indexOf('emailVerificado');
  const dateIndex = headers.indexOf('fechaVerificacion');
  const nameIndex = headers.indexOf('nombreComercial');
  if (tokenIndex < 0) return html_('<h2>Error de configuración</h2><p>No existe la columna verificationToken.</p>');

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][tokenIndex] || '') === token) {
      sheet.getRange(i + 1, verifiedIndex + 1).setValue('Sí');
      sheet.getRange(i + 1, dateIndex + 1).setValue(new Date());
      const name = values[i][nameIndex] || 'tu agencia';
      return html_(
        '<h2>Correo verificado correctamente</h2>' +
        '<p>Gracias. El correo de <strong>' + escapeHtml_(name) + '</strong> fue verificado.</p>' +
        '<p>Ahora tu solicitud queda pendiente de aprobación por nuestro equipo. Cuando sea aprobada podrás ingresar al portal.</p>'
      );
    }
  }
  return html_('<h2>Enlace no encontrado</h2><p>El enlace de verificación no existe o ya no está disponible.</p>');
}

function loginAgency_(email, password) {
  validateConfig_();
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');
  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const found = findRowByEmail_(sheet, email);
  if (found.row < 1) return json_({ ok:false, message:'No encontramos una agencia registrada con ese correo.' });

  const data = found.data;
  const verified = String(data.emailVerificado || '').trim().toLowerCase();
  if (verified !== 'sí' && verified !== 'si' && verified !== 'yes') {
    return json_({ ok:false, message:'Primero debes verificar tu correo. Revisa tu bandeja de entrada o spam.' });
  }

  const estado = String(data.estado || '').trim().toLowerCase();
  if (estado !== 'aprobado' && estado !== 'activo') {
    return json_({ ok:false, message:'Tu acceso aún no está aprobado. Después de la validación de datos activaremos tu cuenta.' });
  }

  const expected = String(data.passwordHash || '');
  const salt = String(data.passwordSalt || '');
  const incoming = sha256_(salt + ':' + password);
  if (!expected || incoming !== expected) return json_({ ok:false, message:'Correo o contraseña incorrectos.' });

  return json_({ ok:true, agency:{
    id:data.id,
    estado:data.estado,
    correo:data.correo,
    razonSocial:data.razonSocial,
    nombreComercial:data.nombreComercial,
    representanteNombres:data.representanteNombres
  }});
}

function createOrder_(order) {
  validateConfig_();
  const sheet = getSheet_(SHEET_ORDERS, ORDER_HEADERS);
  const account = order.account || {};
  const items = order.items || [];
  const firstLead = items[0]?.lead || {};
  const passengers = items.flatMap(function(item){ return item.passengers || []; });
  appendObjectRow_(sheet, {
    codigoOrden: order.code || '',
    fechaOrden: new Date(),
    agenciaId: account.agencyId || '',
    agenciaNombre: account.companyName || '',
    correoAgencia: account.email || '',
    estadoPago: order.status || 'Pendiente',
    moneda: order.currency || '',
    tipoCambio: order.exchangeRate || '',
    subtotalNeto: order.subtotal || '',
    montoComisionado: order.total || '',
    comisionPaypalBanco: order.fee || '',
    fechaVencimientoPago: order.paymentDueAt || '',
    serviciosJson: JSON.stringify(items),
    titularJson: JSON.stringify(firstLead),
    pasajerosJson: JSON.stringify(passengers),
    observaciones: order.observations || ''
  });
  if (account.email) sendOrderEmail_(order);
  return json_({ ok:true, message:'Orden guardada y enviada por correo', code: order.code || '' });
}

function listOrders_(email, agencyId) {
  validateConfig_();
  const sheet = getSheet_(SHEET_ORDERS, ORDER_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return json_({ ok:true, orders:[] });
  const headers = values[0].map(String);
  const emailIndex = headers.indexOf('correoAgencia');
  const agencyIndex = headers.indexOf('agenciaId');
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedAgency = String(agencyId || '').trim();
  const orders = [];
  for (let i = 1; i < values.length; i++) {
    const rowEmail = emailIndex >= 0 ? String(values[i][emailIndex] || '').trim().toLowerCase() : '';
    const rowAgency = agencyIndex >= 0 ? String(values[i][agencyIndex] || '').trim() : '';
    if ((normalizedEmail && rowEmail === normalizedEmail) || (normalizedAgency && rowAgency === normalizedAgency)) {
      const obj = {};
      headers.forEach(function(h, idx){ obj[h] = values[i][idx]; });
      orders.unshift(obj);
    }
  }
  return json_({ ok:true, orders:orders });
}

function getAgencyProfile_(email, agencyId) {
  validateConfig_();
  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const found = findAgencyRow_(sheet, email, agencyId);
  if (found.row < 1) return json_({ ok:false, message:'No encontramos la agencia.' });
  const data = found.data;
  return json_({ ok:true, profile:{
    id:data.id,
    estado:data.estado,
    pais:data.pais,
    tipoFiscal:data.tipoFiscal,
    numeroFiscal:data.numeroFiscal,
    razonSocial:data.razonSocial,
    nombreComercial:data.nombreComercial,
    representanteNombres:data.representanteNombres,
    representanteApellidos:data.representanteApellidos,
    tipoDocumento:data.tipoDocumento,
    numeroDocumento:data.numeroDocumento,
    celular:data.celular,
    correo:data.correo,
    web:data.web
  }});
}

function updateAgencyProfile_(payload) {
  validateConfig_();
  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const account = payload.account || {};
  const found = findAgencyRow_(sheet, account.email || payload.email || '', account.agencyId || payload.agencyId || '');
  if (found.row < 1) return json_({ ok:false, message:'No encontramos la agencia.' });
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  setCellByHeader_(sheet, found.row, headers, 'celular', payload.celular || '');
  setCellByHeader_(sheet, found.row, headers, 'web', payload.web || '');
  return json_({ ok:true, message:'Datos actualizados correctamente.' });
}

function changePassword_(payload) {
  validateConfig_();
  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const account = payload.account || {};
  const found = findAgencyRow_(sheet, account.email || payload.email || '', account.agencyId || payload.agencyId || '');
  if (found.row < 1) return json_({ ok:false, message:'No encontramos la agencia.' });
  const data = found.data;
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  const incoming = sha256_(String(data.passwordSalt || '') + ':' + currentPassword);
  if (incoming !== String(data.passwordHash || '')) return json_({ ok:false, message:'La contraseña actual no es correcta.' });
  const passwordError = validatePassword_(newPassword);
  if (passwordError) return json_({ ok:false, message: passwordError });
  const salt = Utilities.getUuid();
  const hash = sha256_(salt + ':' + newPassword);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  setCellByHeader_(sheet, found.row, headers, 'passwordSalt', salt);
  setCellByHeader_(sheet, found.row, headers, 'passwordHash', hash);
  return json_({ ok:true, message:'Contraseña actualizada correctamente.' });
}

function registerPayment_(payment) {
  validateConfig_();
  const sheet = getSheet_(SHEET_PAYMENTS, PAYMENT_HEADERS);
  const account = payment.account || {};
  const code = String(payment.code || '').trim();
  if (!code) return json_({ ok:false, message:'Código de orden requerido.' });
  let fileUrl = '';
  let fileName = '';
  if (payment.voucher && payment.voucher.base64) {
    fileName = String(payment.voucher.name || ('voucher-' + code + '.jpg')).replace(/[\\/:*?"<>|]/g, '-');
    const bytes = Utilities.base64Decode(String(payment.voucher.base64).split(',').pop());
    const blob = Utilities.newBlob(bytes, payment.voucher.mimeType || 'application/octet-stream', fileName);
    const file = DriveApp.createFile(blob);
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
    fileUrl = file.getUrl();
  }
  appendObjectRow_(sheet, {
    fechaRegistro: new Date(),
    codigoOrden: code,
    agenciaId: account.agencyId || '',
    agenciaNombre: account.companyName || '',
    correoAgencia: account.email || '',
    monto: payment.amount || '',
    moneda: payment.currency || '',
    mensaje: payment.message || '',
    voucherNombre: fileName,
    voucherUrl: fileUrl,
    estado: 'Recibido'
  });
  sendPaymentEmail_(payment, fileUrl, fileName);
  return json_({ ok:true, message:'Comprobante recibido. Validaremos el pago en máximo 60 minutos.' });
}

function sendPaymentEmail_(payment, fileUrl, fileName) {
  const account = payment.account || {};
  const subject = 'Comprobante de pago ' + (payment.code || '') + ' - ' + (account.companyName || 'Agencia');
  const htmlBody = '<div style="font-family:Arial,sans-serif;color:#20352b;line-height:1.55;max-width:620px;margin:auto;padding:20px;background:#edf3ef">' +
    '<div style="background:#fff;border-radius:18px;padding:22px;border:1px solid #dce8df">' +
    '<h2 style="color:#062803;margin-top:0">Comprobante de pago recibido</h2>' +
    '<p><strong>Orden:</strong> ' + escapeHtml_(payment.code || '') + '</p>' +
    '<p><strong>Agencia:</strong> ' + escapeHtml_(account.companyName || '') + '</p>' +
    '<p><strong>Correo:</strong> ' + escapeHtml_(account.email || '') + '</p>' +
    '<p><strong>Monto declarado:</strong> ' + escapeHtml_(moneyEmail_(payment.amount || 0, payment.currency || 'PEN')) + '</p>' +
    '<p><strong>Mensaje:</strong> ' + escapeHtml_(payment.message || '') + '</p>' +
    (fileUrl ? '<p><strong>Voucher:</strong> <a href="' + fileUrl + '">' + escapeHtml_(fileName || 'Ver archivo') + '</a></p>' : '') +
    '</div></div>';
  MailApp.sendEmail({ to: SUPPORT_EMAIL, subject: subject, htmlBody: htmlBody, name: BRAND_NAME, replyTo: account.email || SUPPORT_EMAIL });
}

function findAgencyRow_(sheet, email, agencyId) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { row:-1, data:null };
  const headers = values[0].map(String);
  const emailIndex = headers.indexOf('correo');
  const agencyIndex = headers.indexOf('id');
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedAgency = String(agencyId || '').trim();
  for (let i=1; i<values.length; i++) {
    const rowEmail = emailIndex >= 0 ? String(values[i][emailIndex] || '').trim().toLowerCase() : '';
    const rowAgency = agencyIndex >= 0 ? String(values[i][agencyIndex] || '').trim() : '';
    if ((normalizedEmail && rowEmail === normalizedEmail) || (normalizedAgency && rowAgency === normalizedAgency)) {
      const data = {};
      headers.forEach(function(h, idx){ data[h] = values[i][idx]; });
      return { row:i+1, data:data };
    }
  }
  return { row:-1, data:null };
}

function setCellByHeader_(sheet, row, headers, headerName, value) {
  const idx = headers.indexOf(headerName);
  if (idx >= 0) sheet.getRange(row, idx + 1).setValue(value);
}

function sendOrderEmail_(order) {
  const account = order.account || {};
  const email = String(account.email || '').trim();
  if (!email) return;
  const items = order.items || [];
  const subject = 'Orden de reserva ' + (order.code || '') + ' - My Cusco Trip';
  const rows = items.map(function(item, index){
    return '<tr>' +
      '<td style="padding:10px;border-bottom:1px solid #dce8df;vertical-align:top">' + (index + 1) + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #dce8df;vertical-align:top"><strong>' + escapeHtml_(item.serviceName || '') + '</strong><br><span style="color:#64756b;font-size:12px">Fecha: ' + escapeHtml_(formatDateEmail_(item.travelDate)) + ' · Hora: ' + escapeHtml_(item.serviceTime || 'Por confirmar') + '</span><br><span style="color:#64756b;font-size:12px">Recojo: ' + escapeHtml_(item.pickupPoint || '') + '</span></td>' +
      '<td style="padding:10px;border-bottom:1px solid #dce8df;vertical-align:top;text-align:center">' + escapeHtml_(item.pax || '') + '</td>' +
      '</tr>';
  }).join('');
  const htmlBody = '<div style="margin:0;padding:0;background:#edf3ef;font-family:Arial,Helvetica,sans-serif;color:#20352b">' +
    '<div style="max-width:760px;margin:0 auto;padding:24px 12px">' +
    '<div style="background:#fff;border-radius:22px;overflow:hidden;border:1px solid #dce8df">' +
    '<div style="background:linear-gradient(135deg,#062803,#053220);color:#fff;padding:24px">' +
    '<div style="color:#f2d99d;font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:bold">Orden de reserva</div>' +
    '<h1 style="margin:8px 0 6px;font-size:28px;color:#fff">' + escapeHtml_(order.code || '') + '</h1>' +
    '<p style="margin:0;color:#eff8f1">Agencia: <strong>' + escapeHtml_(account.companyName || '') + '</strong></p>' +
    '</div>' +
    '<div style="padding:22px">' +
    '<div style="background:#fffaf2;border:1px solid #eadfc9;border-radius:16px;padding:14px;margin-bottom:18px"><strong>Tiempo de pago:</strong> esta orden queda reservada por 3 horas. Vencimiento: ' + escapeHtml_(formatDateTimeEmail_(order.paymentDueAt)) + '.</div>' +
    '<table style="width:100%;border-collapse:collapse;border:1px solid #dce8df;border-radius:14px;overflow:hidden"><thead><tr><th style="background:#f4faf6;color:#062803;padding:10px;text-align:left">#</th><th style="background:#f4faf6;color:#062803;padding:10px;text-align:left">Servicio</th><th style="background:#f4faf6;color:#062803;padding:10px;text-align:center">Pax</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div style="margin:18px 0 0 auto;max-width:360px;border:1px solid #dce8df;border-radius:16px;overflow:hidden">' +
    '<div style="display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #dce8df"><span>Subtotal</span><strong>' + escapeHtml_(moneyEmail_(order.subtotal, order.currency)) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #dce8df"><span>Comisiones</span><strong>' + escapeHtml_(moneyEmail_(order.fee, order.currency)) + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between;padding:12px;background:#f4faf6;color:#062803"><span>Total a pagar</span><strong>' + escapeHtml_(moneyEmail_(order.total, order.currency)) + '</strong></div>' +
    '</div>' +
    '<p style="color:#64756b;font-size:13px;margin-top:18px">Indica este código al realizar el pago o enviar el comprobante.</p>' +
    '</div></div></div></div>';
  MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody, name: BRAND_NAME, replyTo: SUPPORT_EMAIL });
}

function formatDateEmail_(iso) {
  if (!iso) return '';
  const parts = String(iso).slice(0,10).split('-');
  if (parts.length !== 3) return iso;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}
function formatDateTimeEmail_(iso) {
  if (!iso) return '';
  return Utilities.formatDate(new Date(iso), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}
function moneyEmail_(amount, currency) {
  const n = Number(amount || 0).toFixed(2);
  return currency === 'USD' ? 'USD ' + n : 'S/ ' + n;
}

function sendVerificationEmail_(email, agencyName, token) {
  const verifyUrl = WEB_APP_URL + '?action=verifyEmail&token=' + encodeURIComponent(token);
  const subject = 'Verifica tu correo - Portal de agencias My Cusco Trip';
  const htmlBody = '' +
    '<div style="font-family:Arial,sans-serif;color:#20352b;line-height:1.55;max-width:560px;margin:auto;padding:20px">' +
    '<h2 style="color:#073d2a">Verificación de correo</h2>' +
    '<p>Hola, recibimos la solicitud de registro de <strong>' + escapeHtml_(agencyName) + '</strong> para acceder al portal de agencias de My Cusco Trip.</p>' +
    '<p>Para confirmar que este correo te pertenece, haz clic en el siguiente botón:</p>' +
    '<p><a href="' + verifyUrl + '" style="display:inline-block;background:#0b7a4e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">Verificar correo</a></p>' +
    '<p>Después de verificar el correo, nuestro equipo revisará la solicitud y activará el acceso si corresponde.</p>' +
    '<p style="font-size:12px;color:#63766a">Si no solicitaste este registro, puedes ignorar este mensaje.</p>' +
    '</div>';
  MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody, name: BRAND_NAME, replyTo: SUPPORT_EMAIL });
}

function validateConfig_() {
  getSpreadsheet_();
}

function validatePassword_(password) {
  if (!password || password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password)) return 'La contraseña debe incluir al menos una letra.';
  if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.';
  if (!/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password)) return 'La contraseña debe incluir al menos un carácter especial.';
  return '';
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID && String(SPREADSHEET_ID).trim() !== '' && SPREADSHEET_ID !== 'PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET') {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('No se encontró la hoja de cálculo. Pega el ID real en SPREADSHEET_ID.');
}

function getSheet_(name, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeaders_(sheet, headers);
  return sheet;
}

function ensureHeaders_(sheet, requiredHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(requiredHeaders);
    return;
  }
  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(String);
  const missing = requiredHeaders.filter(function(h){ return current.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
}

function appendObjectRow_(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const row = headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function findRowByEmail_(sheet, email) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { row:-1, data:null };
  const headers = values[0].map(String);
  const emailIndex = headers.indexOf('correo');
  if (emailIndex < 0) return { row:-1, data:null };
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

function escapeHtml_(str) {
  return String(str || '').replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function html_(content) {
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My Cusco Trip</title></head><body style="font-family:Arial,sans-serif;background:#edf3ef;color:#20352b;padding:30px"><div style="max-width:620px;margin:auto;background:#fff;border-radius:18px;padding:26px;box-shadow:0 12px 34px rgba(10,58,38,.12)">' + content + '</div></body></html>');
}
