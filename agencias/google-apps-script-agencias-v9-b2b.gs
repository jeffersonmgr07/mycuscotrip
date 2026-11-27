
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
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbycmduYce7cpGoMSqR3iqubsC46DiIox7qaNJXFFW8abQpr0s1SYCnYfyA2w95_vGYQ/exec?authuser=0';

// PayPal: coloca estos valores en Propiedades del script, no directamente aquí.
// PAYPAL_MODE = sandbox o live
// PAYPAL_CLIENT_ID = client id de PayPal
// PAYPAL_CLIENT_SECRET = secret de PayPal
// PAYPAL_WEBHOOK_ID = id del webhook, solo si usas un backend que permita verificar headers
// Mercado Pago Checkout Pro:
// MERCADOPAGO_ACCESS_TOKEN = access token de Mercado Pago
const PORTAL_BASE_URL = 'https://mycuscotrip.com/agencias';
const APP_VERSION = 'agency-b2b-2026-11-27-v9';


const AGENCY_HEADERS = [
  // Identidad y estado
  'id','fechaRegistro','providerType','registrationType','estado','emailVerificado','verificationToken','fechaVerificacion',

  // Campos nuevos recomendados para proveedores/agencias
  'country','nationality','documentType','documentNumber',
  'legalName','taxIdType','taxIdNumber','tradeName',
  'representativeFirstName','representativeLastName',
  'phoneCode','phoneNumber','fullPhone','website','accessEmail',

  // Campos antiguos conservados para no romper login, perfil y órdenes existentes
  'pais','tipoFiscal','numeroFiscal','razonSocial','nombreComercial',
  'representanteNombres','representanteApellidos','tipoDocumento','numeroDocumento','celular','correo','web',

  // Seguridad
  'passwordSalt','passwordHash'
];

const ORDER_HEADERS = [
  'codigoOrden','fechaOrden','agenciaId','agenciaNombre','correoAgencia','estadoPago','moneda','tipoCambio',
  'subtotalNeto','montoComisionado','comisionPaypalBanco','fechaVencimientoPago',
  'paypalOrderId','paypalCaptureId','paypalStatus','fechaPagoPaypal',
  'mercadoPagoPreferenceId','mercadoPagoPaymentId','mercadoPagoStatus','mercadoPagoDeviceId','fechaPagoMercadoPago',
  'serviciosJson','titularJson','pasajerosJson','observaciones','fechaPagoManual','correoConfirmacionEnviado'
];

const PAYMENT_HEADERS = [
  'fechaRegistro','codigoOrden','agenciaId','agenciaNombre','correoAgencia','monto','moneda','mensaje','voucherNombre','voucherUrl','estado'
];

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || '').trim();
    if (!action && body.event_type) return paypalWebhook_(body);
    if (action === 'registerAgency') return registerAgency_(body.payload || body.agency || body);
    if (action === 'verifyEmailJson') return verifyEmailJson_(body.token || (body.payload && body.payload.token) || '');
    if (action === 'loginAgency') return loginAgency_(body.email, body.password);
    if(action === 'googleConfig') return json_({ok:true,clientId:PropertiesService.getScriptProperties().getProperty('AGENCY_GOOGLE_CLIENT_ID')||''});
    if(action === 'loginGoogle') return agencyGoogleLogin_(body.credential);
    const protectedActions=['createOrder','listOrders','getAgencyProfile','updateAgencyProfile','changePassword','registerPayment','createPayPalOrder','capturePayPalOrder','createMercadoPagoPreference','confirmMercadoPagoPayment','updateReservation','paymentInstructions','logoutAgency'];
    if(protectedActions.indexOf(action)>=0){
      const identity=agencySession_(body.sessionToken || body.payload?.account?.sessionToken);
      if(!identity)return json_({ok:false,message:'Sesión vencida. Inicia sesión nuevamente.',code:'SESSION_EXPIRED'});
      if(action==='logoutAgency'){CacheService.getScriptCache().remove('agency-session:'+String(body.sessionToken));return json_({ok:true});}
      const payload=body.payload || body.order || body.payment || body.profile || body;
      payload.account=identity;payload.email=identity.email;payload.agencyId=identity.agencyId;
      body.payload=payload;body.email=identity.email;body.agencyId=identity.agencyId;
      if(['createPayPalOrder','capturePayPalOrder','createMercadoPagoPreference','confirmMercadoPagoPayment','registerPayment','updateReservation','paymentInstructions'].includes(action)){
        const target=findOrderByCode_(String(payload.code||payload.orderCode||payload.codigoOrden||''));
        if(!target||String(target.data.agenciaId)!==String(identity.agencyId))return json_({ok:false,message:'Orden no encontrada.'});
        if(action==='updateReservation')return agencyUpdateReservation_(target,payload);
        if(action==='paymentInstructions')return json_({ok:true,instructions:agencyBankText_(target.data.moneda),email:SUPPORT_EMAIL});
        if(action==='capturePayPalOrder'&&!target.data.paypalOrderId)return json_({ok:false,message:'No hay orden PayPal vinculada.'});
      }
      if(action==='createOrder') return agencyCreateOrderSafe_(payload);
    }
    if (action === 'createOrder') return createOrder_(body.payload || body.order || body);
    if (action === 'listOrders') return listOrders_(body.email || body.correo || '', body.agencyId || '');
    if (action === 'getAgencyProfile') return getAgencyProfile_(body.email || body.correo || '', body.agencyId || '');
    if (action === 'updateAgencyProfile') return updateAgencyProfile_(body.payload || body.profile || body);
    if (action === 'changePassword') return changePassword_(body.payload || body);
    if (action === 'registerPayment') return registerPayment_(body.payload || body.payment || body);
    if (action === 'createPayPalOrder') return createPayPalOrder_(body.payload || body);
    if (action === 'capturePayPalOrder') return capturePayPalOrder_(body.payload || body);
    if (action === 'createMercadoPagoPreference') return createMercadoPagoPreference_(body.payload || body);
    if (action === 'confirmMercadoPagoPayment') return confirmMercadoPagoPayment_(body.payload || body);
    if (action === 'mercadoPagoWebhook') return mercadoPagoWebhook_(body);
    if (action === 'paypalWebhook') return paypalWebhook_(body);
    return json_({ ok:false, message:'Acción no reconocida: ' + action });
  } catch (err) {
    return json_({ ok:false, message: err && err.message ? err.message : String(err) });
  }
}

function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : '';
    if (action === 'verifyEmail') return verifyEmail_(e.parameter.token || '');
    if (action === 'verifyEmailJson') return verifyEmailJson_(e.parameter.token || '');
    if (action === 'debugActions') return json_({
      ok:true,
      version:APP_VERSION,
      actions:[
        'registerAgency','verifyEmail','verifyEmailJson','loginAgency','createOrder','listOrders',
        'getAgencyProfile','updateAgencyProfile','changePassword','registerPayment',
        'createPayPalOrder','capturePayPalOrder','createMercadoPagoPreference','confirmMercadoPagoPayment','mercadoPagoWebhook','paypalWebhook'
      ],
      paypalConfigured: !!(
        PropertiesService.getScriptProperties().getProperty('PAYPAL_CLIENT_ID') &&
        PropertiesService.getScriptProperties().getProperty('PAYPAL_CLIENT_SECRET')
      ),
      mercadoPagoConfigured: !!PropertiesService.getScriptProperties().getProperty('MERCADOPAGO_ACCESS_TOKEN')
    });
    return html_('<h2>Endpoint activo</h2><p>Portal de agencias My Cusco Trip.</p><p><strong>Versión:</strong> ' + escapeHtml_(APP_VERSION) + '</p>');
  } catch (err) {
    return html_('<h2>No se pudo completar la solicitud</h2><p>' + escapeHtml_(err.message || String(err)) + '</p>');
  }
}

function registerAgency_(agency) {
  validateConfig_();
  setupAgencySheets_();

  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);

  const registrationTypeRaw = String(agency.registrationType || agency.tipoRegistro || 'company').trim().toLowerCase();
  const isCompany = registrationTypeRaw === 'company' || registrationTypeRaw === 'empresa';
  const registrationType = isCompany ? 'company' : 'natural';
  const providerType = String(agency.providerType || 'agency').trim().toLowerCase();

  const company = agency.company || {};
  const representative = agency.legalRepresentative || agency.representative || {};

  const email = String(
    agency.accessEmail || agency.correo || agency.email || company.email || ''
  ).trim().toLowerCase();
  if (!email) return json_({ ok:false, message:'Correo requerido.' });

  const firstName = String(
    representative.firstName || agency.representanteNombres || agency.firstName || ''
  ).trim();
  const lastName = String(
    representative.lastName || agency.representanteApellidos || agency.lastName || ''
  ).trim();

  const country = String(company.country || agency.country || agency.pais || '').trim();
  const nationality = String(representative.nationality || agency.nationality || country || '').trim();

  const documentType = String(
    representative.docType || agency.documentType || agency.tipoDocumento || ''
  ).trim();
  const documentNumber = String(
    representative.docNumber || agency.documentNumber || agency.numeroDocumento || ''
  ).trim().toUpperCase();

  const taxIdType = isCompany ? String(
    company.taxLabel || agency.taxIdType || agency.tipoFiscal || ''
  ).trim() : '';
  const taxIdNumber = isCompany ? String(
    company.taxId || agency.taxIdNumber || agency.numeroFiscal || ''
  ).trim().toUpperCase() : '';

  const legalName = isCompany
    ? String(company.legalName || agency.legalName || agency.razonSocial || '').trim()
    : [firstName, lastName].filter(Boolean).join(' ').trim();

  const tradeName = isCompany ? String(
    company.tradeName || agency.tradeName || agency.nombreComercial || ''
  ).trim() : '';

  const phoneCode = String(
    company.phoneCountry || agency.phoneCode || agency.codigoPais || ''
  ).trim();
  const phoneNumber = String(
    company.phoneNumber || agency.phoneNumber || agency.celular || company.phone || ''
  ).replace(/[^0-9]/g, '').trim();
  const fullPhone = normalizeFullPhone_(phoneCode, phoneNumber, company.phone || agency.fullPhone || agency.accessPhone || '');
  const website = String(company.website || agency.website || agency.web || '').trim();

  if (!firstName || !lastName) {
    return json_({ ok:false, message:'Ingresa nombres y apellidos del representante.' });
  }

  if (!documentType || !documentNumber) {
    return json_({ ok:false, message:'Ingresa tipo y número de documento de la persona registrada o representante.' });
  }

  if (registrationType === 'company') {
    if (!legalName || !taxIdNumber || !tradeName) {
      return json_({ ok:false, message:'Para empresa debes ingresar razón social, identificación fiscal y nombre comercial.' });
    }
  }

  if (!phoneNumber || phoneNumber.length < 6) {
    return json_({ ok:false, message:'Ingresa un número de WhatsApp válido.' });
  }

  const duplicate = findAgencyDuplicate_(sheet, {
    email: email,
    documentNumber: documentNumber,
    taxIdNumber: taxIdNumber
  });
  if (duplicate.found) return json_({ ok:false, message: duplicate.message });

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
    providerType: providerType,
    registrationType: registrationType,
    estado: agency.status || 'Aprobado',
    emailVerificado: 'No',
    verificationToken: token,
    fechaVerificacion: '',

    country: country,
    nationality: nationality,
    documentType: documentType,
    documentNumber: documentNumber,
    legalName: legalName,
    taxIdType: taxIdType,
    taxIdNumber: taxIdNumber,
    tradeName: tradeName,
    representativeFirstName: firstName,
    representativeLastName: lastName,
    phoneCode: phoneCode,
    phoneNumber: phoneNumber,
    fullPhone: fullPhone,
    website: website,
    accessEmail: email,

    // Compatibilidad con las columnas antiguas usadas por login/perfil/órdenes.
    pais: country || nationality,
    tipoFiscal: taxIdType,
    numeroFiscal: taxIdNumber,
    razonSocial: legalName,
    nombreComercial: tradeName || legalName,
    representanteNombres: firstName,
    representanteApellidos: lastName,
    tipoDocumento: documentType,
    numeroDocumento: documentNumber,
    celular: fullPhone,
    correo: email,
    web: website,

    passwordSalt: salt,
    passwordHash: hash
  });

  sendVerificationEmail_(email, tradeName || legalName || 'agencia', token);
  return json_({ ok:true, message:'Registro recibido. Te enviamos un correo para verificar tu email. Después de verificarlo, podrás ingresar al portal con tu correo y contraseña.' });
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
        '<p>Tu correo ya fue verificado. Si tus datos son correctos, ya puedes ingresar al portal con tu correo y contraseña.</p>'
      );
    }
  }
  return html_('<h2>Enlace no encontrado</h2><p>El enlace de verificación no existe o ya no está disponible.</p>');
}


function verifyEmailJson_(token) {
  validateConfig_();
  token = String(token || '').trim();
  if (!token) return json_({ ok:false, message:'El enlace de verificación no es válido.' });

  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const tokenIndex = headers.indexOf('verificationToken');
  const verifiedIndex = headers.indexOf('emailVerificado');
  const dateIndex = headers.indexOf('fechaVerificacion');
  const nameIndex = headers.indexOf('nombreComercial');

  if (tokenIndex < 0 || verifiedIndex < 0 || dateIndex < 0) {
    return json_({ ok:false, message:'Error de configuración: faltan columnas de verificación.' });
  }

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][tokenIndex] || '') === token) {
      sheet.getRange(i + 1, verifiedIndex + 1).setValue('Sí');
      sheet.getRange(i + 1, dateIndex + 1).setValue(new Date());
      const name = values[i][nameIndex] || 'tu agencia';
      return json_({
        ok:true,
        message:'Correo verificado correctamente. Ya puedes iniciar sesión con tu correo y contraseña.',
        agencyName:String(name || '')
      });
    }
  }

  return json_({ ok:false, message:'El enlace de verificación no existe o ya no está disponible.' });
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

  return json_({ ok:true, sessionToken:agencyIssueSession_(data), agency:{
    id:data.id,
    estado:data.estado,
    correo:data.correo,
    razonSocial:data.razonSocial,
    nombreComercial:data.nombreComercial,
    representanteNombres:data.representanteNombres,
    pais:data.pais
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
    paypalOrderId: order.paypalOrderId || '',
    paypalCaptureId: order.paypalCaptureId || '',
    paypalStatus: order.paypalStatus || '',
    fechaPagoPaypal: order.fechaPagoPaypal || '',
    mercadoPagoPreferenceId: order.mercadoPagoPreferenceId || '',
    mercadoPagoPaymentId: order.mercadoPagoPaymentId || '',
    mercadoPagoStatus: order.mercadoPagoStatus || '',
    fechaPagoMercadoPago: order.fechaPagoMercadoPago || '',
    serviciosJson: JSON.stringify(items),
    titularJson: JSON.stringify(firstLead),
    pasajerosJson: JSON.stringify(passengers),
    observaciones: order.observations || ''
  });
  if (account.email) { try { sendOrderEmail_(order); } catch(e) { console.error('Correo de orden pendiente: '+order.code); } }
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
    const rowEmail = emailIndex >= 0 ? String(values[i][emailIndex] || '').replace(/^'/,'').trim().toLowerCase() : '';
    const rowAgency = agencyIndex >= 0 ? String(values[i][agencyIndex] || '').replace(/^'/,'').trim() : '';
    if ((normalizedEmail && rowEmail === normalizedEmail) || (normalizedAgency && rowAgency === normalizedAgency)) {
      const obj = {};
      headers.forEach(function(h, idx){ obj[h] = values[i][idx]; });
      const statusIndex = headers.indexOf('estadoPago');
      const dueIndex = headers.indexOf('fechaVencimientoPago');
      const rawStatus = String(obj.estadoPago || '').trim().toLowerCase();
      const dueTime = obj.fechaVencimientoPago ? new Date(obj.fechaVencimientoPago).getTime() : 0;
      if (statusIndex >= 0 && dueTime && dueTime < Date.now() && rawStatus !== 'pagado' && rawStatus !== 'vencido') {
        sheet.getRange(i + 1, statusIndex + 1).setValue('Vencido');
        obj.estadoPago = 'Vencido';
      }
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
    providerType:data.providerType || 'agency',
    registrationType:data.registrationType || '',
    estado:data.estado,
    country:data.country || data.pais,
    nationality:data.nationality || data.pais,
    documentType:data.documentType || data.tipoDocumento,
    documentNumber:data.documentNumber || data.numeroDocumento,
    legalName:data.legalName || data.razonSocial,
    taxIdType:data.taxIdType || data.tipoFiscal,
    taxIdNumber:data.taxIdNumber || data.numeroFiscal,
    tradeName:data.tradeName || data.nombreComercial,
    representativeFirstName:data.representativeFirstName || data.representanteNombres,
    representativeLastName:data.representativeLastName || data.representanteApellidos,
    phoneCode:data.phoneCode || '',
    phoneNumber:data.phoneNumber || '',
    fullPhone:data.fullPhone || data.celular,
    website:data.website || data.web,
    accessEmail:data.accessEmail || data.correo,

    // Compatibilidad antigua
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
  setupAgencySheets_();
  const sheet = getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  const account = payload.account || {};
  const found = findAgencyRow_(sheet, account.email || payload.email || '', account.agencyId || payload.agencyId || '');
  if (found.row < 1) return json_({ ok:false, message:'No encontramos la agencia.' });

  const data = found.data || {};
  const registrationType = String(data.registrationType || payload.registrationType || '').trim().toLowerCase();
  const isCompany = registrationType === 'company' || registrationType === 'empresa' || Boolean(data.taxIdNumber || data.numeroFiscal);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);

  const phoneCode = String(payload.phoneCode || '').replace(/[^0-9+]/g, '').trim();
  const phoneNumber = String(payload.phoneNumber || '').replace(/[^0-9]/g, '').trim();
  const fullPhone = normalizeFullPhone_(phoneCode, phoneNumber, payload.fullPhone || payload.celular || '');
  const website = String(payload.website || payload.web || '').trim();

  if (phoneNumber && phoneNumber.length < 6) {
    return json_({ ok:false, message:'El número de WhatsApp debe tener al menos 6 dígitos.' });
  }

  // Campos comunes editables.
  setCellByHeader_(sheet, found.row, headers, 'phoneCode', phoneCode);
  setCellByHeader_(sheet, found.row, headers, 'phoneNumber', phoneNumber);
  setCellByHeader_(sheet, found.row, headers, 'fullPhone', fullPhone);
  setCellByHeader_(sheet, found.row, headers, 'website', website);
  setCellByHeader_(sheet, found.row, headers, 'celular', phoneForSheet_(fullPhone));
  setCellByHeader_(sheet, found.row, headers, 'web', website);

  if (isCompany) {
    // La empresa sí puede actualizar nombre comercial y datos del representante.
    const tradeName = String(payload.tradeName || '').trim();
    const representativeFirstName = String(payload.representativeFirstName || '').trim();
    const representativeLastName = String(payload.representativeLastName || '').trim();
    const representativeNationality = String(payload.representativeNationality || payload.nationality || '').trim();
    const documentType = String(payload.documentType || '').trim();
    const documentNumber = String(payload.documentNumber || '').trim().toUpperCase();

    if (!tradeName) return json_({ ok:false, message:'El nombre comercial no puede quedar vacío.' });
    if (!representativeFirstName || !representativeLastName) return json_({ ok:false, message:'Ingresa nombres y apellidos del representante.' });
    if (!documentType || !documentNumber) return json_({ ok:false, message:'Ingresa tipo y número de documento del representante.' });

    setCellByHeader_(sheet, found.row, headers, 'tradeName', tradeName);
    setCellByHeader_(sheet, found.row, headers, 'nombreComercial', tradeName);
    setCellByHeader_(sheet, found.row, headers, 'representativeFirstName', representativeFirstName);
    setCellByHeader_(sheet, found.row, headers, 'representativeLastName', representativeLastName);
    setCellByHeader_(sheet, found.row, headers, 'representanteNombres', representativeFirstName);
    setCellByHeader_(sheet, found.row, headers, 'representanteApellidos', representativeLastName);
    setCellByHeader_(sheet, found.row, headers, 'nationality', representativeNationality);
    setCellByHeader_(sheet, found.row, headers, 'documentType', documentType);
    setCellByHeader_(sheet, found.row, headers, 'documentNumber', documentNumber);
    setCellByHeader_(sheet, found.row, headers, 'tipoDocumento', documentType);
    setCellByHeader_(sheet, found.row, headers, 'numeroDocumento', documentNumber);
  }

  // No se actualizan aquí: correo de acceso, razón social/nombre fiscal, identificación fiscal,
  // ni identidad de persona natural. Esos cambios requieren validación manual.
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



function paypalConfig_() {
  const props = PropertiesService.getScriptProperties();
  const mode = props.getProperty('PAYPAL_MODE') || 'sandbox';
  const clientId = props.getProperty('PAYPAL_CLIENT_ID') || '';
  const secret = props.getProperty('PAYPAL_CLIENT_SECRET') || '';
  const apiBase = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  if (!clientId || !secret) throw new Error('Faltan credenciales PayPal. Configura PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en Propiedades del script.');
  return { mode: mode, clientId: clientId, secret: secret, apiBase: apiBase };
}

function paypalAccessToken_() {
  const cfg = paypalConfig_();
  const basic = Utilities.base64Encode(cfg.clientId + ':' + cfg.secret);
  const res = UrlFetchApp.fetch(cfg.apiBase + '/v1/oauth2/token', {
    method: 'post',
    headers: { Authorization: 'Basic ' + basic, Accept: 'application/json' },
    payload: 'grant_type=client_credentials',
    muteHttpExceptions: true
  });
  const data = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300 || !data.access_token) throw new Error('No se pudo obtener token PayPal: ' + res.getContentText());
  return { token: data.access_token, apiBase: cfg.apiBase };
}

function createPayPalOrder_(payload) {
  validateConfig_();
  const code = String(payload.code || '').replace(/[^A-Za-z0-9]/g, '');
  if (!code) return json_({ ok:false, message:'Código de orden requerido.' });
  const order = findOrderByCode_(code);
  if (!order) return json_({ ok:false, message:'No encontramos la orden en Google Sheets.' });
  const status = String(order.data.estadoPago || '').trim().toLowerCase();
  if (status === 'pagado') return json_({ ok:false, message:'Esta orden ya figura como pagada.' });
  const currency = String(order.data.moneda || payload.currency || 'USD').toUpperCase();
  if (currency !== 'USD') return json_({ ok:false, message:'PayPal debe procesarse en USD. Cambia la moneda visible a dólares y genera la orden nuevamente.' });
  const amount = Number(order.data.montoComisionado || payload.total || 0);
  if (!amount || amount <= 0) return json_({ ok:false, message:'El monto de la orden no es válido.' });

  const auth = paypalAccessToken_();
  const returnUrl = PORTAL_BASE_URL + '/paypal-retorno.html?code=' + encodeURIComponent(code);
  const cancelUrl = PORTAL_BASE_URL + '/ordenes.html?paypal=cancelado&orden=' + encodeURIComponent(code);
  const body = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: code,
      custom_id: code,
      invoice_id: code,
      amount: { currency_code: 'USD', value: amount.toFixed(2) },
      description: 'Orden de reserva My Cusco Trip ' + code
    }],
    application_context: {
      brand_name: BRAND_NAME,
      landing_page: 'BILLING',
      user_action: 'PAY_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl
    }
  };
  const res = UrlFetchApp.fetch(auth.apiBase + '/v2/checkout/orders', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + auth.token },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  const data = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300 || !data.id) return json_({ ok:false, message:'PayPal no creó la orden: ' + res.getContentText() });
  const approval = (data.links || []).find(function(l){ return l.rel === 'payer-action'; }) ||
    (data.links || []).find(function(l){ return l.rel === 'approve'; }) ||
    (data.links || []).find(function(l){ return l.rel === 'approval_url'; }) ||
    (data.links || []).find(function(l){ return String(l.href || '').indexOf('/checkoutnow') >= 0; });
  const headers = order.headers;
  setCellByHeader_(order.sheet, order.row, headers, 'paypalOrderId', data.id);
  setCellByHeader_(order.sheet, order.row, headers, 'paypalStatus', data.status || 'CREATED');
  return json_({ ok:true, paypalOrderId:data.id, approvalUrl: approval ? approval.href : '', status:data.status || '' });
}

function capturePayPalOrder_(payload) {
  validateConfig_();
  const code = String(payload.code || '').replace(/[^A-Za-z0-9]/g, '');
  const paypalOrderId = String(payload.paypalOrderId || payload.orderID || '').trim();
  if (!code || !paypalOrderId) return json_({ ok:false, message:'Faltan datos para capturar el pago.' });
  const order = findOrderByCode_(code);
  if (!order) return json_({ ok:false, message:'No encontramos la orden en Google Sheets.' });
  const savedPayPalId = String(order.data.paypalOrderId || '').trim();
  if (!savedPayPalId || savedPayPalId !== paypalOrderId) return json_({ ok:false, message:'La orden PayPal no coincide con el código interno.' });
  const auth = paypalAccessToken_();
  const res = UrlFetchApp.fetch(auth.apiBase + '/v2/checkout/orders/' + encodeURIComponent(paypalOrderId) + '/capture', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + auth.token },
    payload: '{}',
    muteHttpExceptions: true
  });
  const data = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300) return json_({ ok:false, message:'PayPal no pudo capturar el pago: ' + res.getContentText() });
  const capture = (((data.purchase_units || [])[0] || {}).payments || {}).captures || [];
  const captureId = capture[0] ? capture[0].id : '';
  const status = String(data.status || '').toUpperCase();
  if (status === 'COMPLETED' && capture[0] && String(capture[0].amount?.currency_code) === String(order.data.moneda) && Math.round(Number(capture[0].amount?.value)*100) === Math.round(Number(order.data.montoComisionado)*100)) {
    markOrderPaid_(code, paypalOrderId, captureId, status);
    sendPayPalPaidEmail_(order.data, paypalOrderId, captureId);
    return json_({ ok:true, message:'Pago confirmado correctamente. La orden fue marcada como Pagada.', status:status, captureId:captureId });
  }
  updateOrderPayPalStatus_(code, paypalOrderId, captureId, status);
  return json_({ ok:false, message:'El pago no quedó completado. Estado PayPal: ' + status, status:status });
}

function paypalWebhook_(event) {
  // Apps Script no expone los headers HTTP del webhook, por eso no se puede verificar la firma de PayPal aquí.
  // No uses esta función para marcar pagos como pagados en producción. Se deja solo como registro informativo.
  const code = event && event.resource ? (event.resource.custom_id || event.resource.invoice_id || event.resource.supplementary_data?.related_ids?.order_id || '') : '';
  return json_({ ok:true, message:'Webhook recibido. Para seguridad, verifica webhooks en Vercel/Cloud Run/Supabase Edge Function antes de actualizar pagos.', code:code });
}

function findOrderByCode_(code) {
  const sheet = getSheet_(SHEET_ORDERS, ORDER_HEADERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const codeIndex = headers.indexOf('codigoOrden');
  if (codeIndex < 0) return null;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][codeIndex] || '').replace(/[^A-Za-z0-9]/g, '') === code) {
      const data = {};
      headers.forEach(function(h, idx){ data[h] = values[i][idx]; });
      return { sheet:sheet, row:i + 1, headers:headers, data:data };
    }
  }
  return null;
}

function markOrderPaid_(code, paypalOrderId, captureId, status) {
  const order = findOrderByCode_(code);
  if (!order) return;
  setCellByHeader_(order.sheet, order.row, order.headers, 'estadoPago', 'Pagado');
  setCellByHeader_(order.sheet, order.row, order.headers, 'paypalOrderId', paypalOrderId);
  setCellByHeader_(order.sheet, order.row, order.headers, 'paypalCaptureId', captureId);
  setCellByHeader_(order.sheet, order.row, order.headers, 'paypalStatus', status || 'COMPLETED');
  setCellByHeader_(order.sheet, order.row, order.headers, 'fechaPagoPaypal', new Date());
}

function updateOrderPayPalStatus_(code, paypalOrderId, captureId, status) {
  const order = findOrderByCode_(code);
  if (!order) return;
  setCellByHeader_(order.sheet, order.row, order.headers, 'paypalOrderId', paypalOrderId);
  setCellByHeader_(order.sheet, order.row, order.headers, 'paypalCaptureId', captureId);
  setCellByHeader_(order.sheet, order.row, order.headers, 'paypalStatus', status || '');
}

function sendPayPalPaidEmail_(orderData, paypalOrderId, captureId) { agencySendPaid_(orderData); }

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


function mercadoPagoConfig_() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('MERCADOPAGO_ACCESS_TOKEN') || '';
  if (!accessToken) throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN en Propiedades del script.');
  return { accessToken: accessToken, apiBase: 'https://api.mercadopago.com' };
}

function createMercadoPagoPreference_(payload) {
  validateConfig_();
  const code = String(payload.code || '').replace(/[^A-Za-z0-9]/g, '');
  const deviceId = String(payload.deviceId || payload.device_session_id || '').trim();
  if (!code) return json_({ ok:false, message:'Código de orden requerido.' });

  const order = findOrderByCode_(code);
  if (!order) return json_({ ok:false, message:'No encontramos la orden en Google Sheets.' });

  const status = String(order.data.estadoPago || '').trim().toLowerCase();
  if (status === 'pagado') return json_({ ok:false, message:'Esta orden ya figura como pagada.' });
  if (status === 'vencido') return json_({ ok:false, message:'Esta orden está vencida. Genera una nueva orden o consulta disponibilidad.' });

  const currency = String(order.data.moneda || payload.currency || 'PEN').toUpperCase();
  if (currency !== 'PEN') return json_({ ok:false, message:'Mercado Pago debe procesarse en soles. Cambia la moneda visible a soles y genera la orden nuevamente.' });

  const amount = Number(order.data.montoComisionado || payload.total || 0);
  if (!amount || amount <= 0) return json_({ ok:false, message:'El monto de la orden no es válido.' });

  const cfg = mercadoPagoConfig_();
  const returnBase = PORTAL_BASE_URL + '/mercadopago-retorno.html?code=' + encodeURIComponent(code);
  const lead = parseJsonSafe_(order.data.titularJson, {});
  const services = parseJsonSafe_(order.data.serviciosJson, []);
  const cleanPhone = String(lead.phone || '').replace(/\D/g, '');
  const payer = {
    email: String(order.data.correoAgencia || payload.account?.email || '').trim()
  };

  if (lead.firstName) payer.name = String(lead.firstName).trim();
  if (lead.lastName) payer.surname = String(lead.lastName).trim();
  if (cleanPhone) payer.phone = { number: cleanPhone };
  if (lead.docType && lead.docNumber) {
    payer.identification = {
      type: String(lead.docType).trim(),
      number: String(lead.docNumber).replace(/\D/g, '').trim() || String(lead.docNumber).trim()
    };
  }

  const serviceDescription = Array.isArray(services) && services.length
    ? services.map(function(item){ return String(item.serviceName || item.serviceShortName || '').trim(); }).filter(Boolean).slice(0, 3).join(' / ')
    : 'Servicios turísticos My Cusco Trip';

  const preference = {
    items: [{
      id: code,
      title: 'Orden de reserva My Cusco Trip ' + code,
      description: serviceDescription || 'Servicios turísticos My Cusco Trip',
      quantity: 1,
      currency_id: 'PEN',
      unit_price: Number(amount.toFixed(2))
    }],
    external_reference: code,
    payer: payer,
    back_urls: {
      success: returnBase + '&result=success',
      failure: returnBase + '&result=failure',
      pending: returnBase + '&result=pending'
    },
    auto_return: 'approved',
    statement_descriptor: 'MYCUSCOTRIP',
    metadata: {
      codigo_orden: code,
      agencia_id: String(order.data.agenciaId || ''),
      agencia_nombre: String(order.data.agenciaNombre || ''),
      correo_agencia: String(order.data.correoAgencia || '')
    }
  };

  const headers = {
    Authorization: 'Bearer ' + cfg.accessToken,
    'Content-Type': 'application/json'
  };

  if (deviceId) {
    headers['X-meli-session-id'] = deviceId;
  }

  const res = UrlFetchApp.fetch(cfg.apiBase + '/checkout/preferences', {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(preference),
    muteHttpExceptions: true
  });
  const data = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300 || !data.id) {
    return json_({ ok:false, message:'Mercado Pago no creó la preferencia: ' + res.getContentText() });
  }

  setCellByHeader_(order.sheet, order.row, order.headers, 'mercadoPagoPreferenceId', data.id);
  setCellByHeader_(order.sheet, order.row, order.headers, 'mercadoPagoStatus', 'preference_created');
  if (deviceId) setCellByHeader_(order.sheet, order.row, order.headers, 'mercadoPagoDeviceId', deviceId);

  return json_({
    ok:true,
    mercadoPagoPreferenceId:data.id,
    initPoint:data.init_point || data.sandbox_init_point || '',
    status:'preference_created'
  });
}

function confirmMercadoPagoPayment_(payload) {
  validateConfig_();
  const code = String(payload.code || '').replace(/[^A-Za-z0-9]/g, '');
  const paymentId = String(payload.paymentId || payload.payment_id || payload.collection_id || '').trim();
  if (!code) return json_({ ok:false, message:'Código de orden requerido.' });
  if (!paymentId || paymentId === 'null' || paymentId === 'undefined') {
    return json_({ ok:false, message:'No encontramos el ID de pago de Mercado Pago para confirmar la orden.' });
  }

  const order = findOrderByCode_(code);
  if (!order) return json_({ ok:false, message:'No encontramos la orden en Google Sheets.' });

  const cfg = mercadoPagoConfig_();
  const res = UrlFetchApp.fetch(cfg.apiBase + '/v1/payments/' + encodeURIComponent(paymentId), {
    method: 'get',
    headers: { Authorization: 'Bearer ' + cfg.accessToken },
    muteHttpExceptions: true
  });
  const data = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300) {
    return json_({ ok:false, message:'Mercado Pago no pudo consultar el pago: ' + res.getContentText() });
  }

  const status = String(data.status || '').toLowerCase();
  const externalReference = String(data.external_reference || '').replace(/[^A-Za-z0-9]/g, '');
  if (externalReference !== code || String(data.currency_id) !== String(order.data.moneda) || Math.round(Number(data.transaction_amount)*100) !== Math.round(Number(order.data.montoComisionado)*100)) {
    return json_({ ok:false, message:'El pago de Mercado Pago no coincide con el código interno de la orden.' });
  }

  if (status === 'approved') {
    markOrderPaidMercadoPago_(code, paymentId, data.status || 'approved');
    sendMercadoPagoPaidEmail_(order.data, paymentId, data.status || 'approved');
    return json_({ ok:true, message:'Pago confirmado correctamente. La orden fue marcada como Pagada.', status:data.status || 'approved', paymentId:paymentId });
  }

  updateOrderMercadoPagoStatus_(code, paymentId, data.status || status);
  return json_({ ok:false, message:'El pago no quedó aprobado. Estado Mercado Pago: ' + (data.status || status), status:data.status || status });
}

function mercadoPagoWebhook_(event) {
  // Apps Script no es ideal para validar headers de webhooks. Se deja como registro informativo.
  return json_({ ok:true, message:'Webhook Mercado Pago recibido. Usa confirmMercadoPagoPayment para confirmar pagos desde el retorno.', topic:event && event.type ? event.type : '' });
}

function markOrderPaidMercadoPago_(code, paymentId, status) {
  const order = findOrderByCode_(code);
  if (!order) return;
  setCellByHeader_(order.sheet, order.row, order.headers, 'estadoPago', 'Pagado');
  setCellByHeader_(order.sheet, order.row, order.headers, 'mercadoPagoPaymentId', paymentId);
  setCellByHeader_(order.sheet, order.row, order.headers, 'mercadoPagoStatus', status || 'approved');
  setCellByHeader_(order.sheet, order.row, order.headers, 'fechaPagoMercadoPago', new Date());
}

function updateOrderMercadoPagoStatus_(code, paymentId, status) {
  const order = findOrderByCode_(code);
  if (!order) return;
  setCellByHeader_(order.sheet, order.row, order.headers, 'mercadoPagoPaymentId', paymentId);
  setCellByHeader_(order.sheet, order.row, order.headers, 'mercadoPagoStatus', status || '');
}

function sendMercadoPagoPaidEmail_(orderData, paymentId, status) { agencySendPaid_(orderData); }



function parseJsonSafe_(value, fallback) {
  try {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value;
    return JSON.parse(String(value));
  } catch (err) {
    return fallback;
  }
}

function setupAgencySheets_() {
  // Ejecuta esta función una vez desde el editor de Apps Script.
  // También se ejecuta automáticamente al registrar una agencia.
  getSheet_(SHEET_AGENCIES, AGENCY_HEADERS);
  getSheet_(SHEET_ORDERS, ORDER_HEADERS);
  getSheet_(SHEET_PAYMENTS, PAYMENT_HEADERS);
  return 'Hojas y columnas verificadas correctamente.';
}

function setupAgencySheets() {
  // Alias visible en el selector de funciones de Apps Script.
  return setupAgencySheets_();
}

function normalizeFullPhone_(phoneCode, phoneNumber, fallback) {
  const code = String(phoneCode || '').replace(/[^0-9]/g, '').trim();
  const number = String(phoneNumber || '').replace(/[^0-9]/g, '').trim();
  if (code && number) return "'" + '+' + code + ' ' + number;
  if (number) return "'" + number;
  const raw = String(fallback || '').replace(/^'+/, '').trim();
  return raw ? phoneForSheet_(raw) : '';
}

function cleanComparable_(value) {
  return String(value || '')
    .replace(/^'/, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .trim()
    .toLowerCase();
}

function findAgencyDuplicate_(sheet, data) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { found:false };
  const headers = values[0].map(String);

  const emailColumns = ['correo','accessEmail'];
  const docColumns = ['numeroDocumento','documentNumber'];
  const taxColumns = ['numeroFiscal','taxIdNumber'];

  const targetEmail = String(data.email || '').trim().toLowerCase();
  const targetDoc = cleanComparable_(data.documentNumber);
  const targetTax = cleanComparable_(data.taxIdNumber);

  for (let i = 1; i < values.length; i++) {
    for (const col of emailColumns) {
      const idx = headers.indexOf(col);
      if (idx >= 0 && targetEmail) {
        const rowEmail = String(values[i][idx] || '').replace(/^'/, '').trim().toLowerCase();
        if (rowEmail && rowEmail === targetEmail) {
          return { found:true, message:'Ya existe una agencia registrada con ese correo.' };
        }
      }
    }

    for (const col of docColumns) {
      const idx = headers.indexOf(col);
      if (idx >= 0 && targetDoc) {
        const rowDoc = cleanComparable_(values[i][idx]);
        if (rowDoc && rowDoc === targetDoc) {
          return { found:true, message:'Ya existe una agencia registrada con ese número de documento.' };
        }
      }
    }

    for (const col of taxColumns) {
      const idx = headers.indexOf(col);
      if (idx >= 0 && targetTax) {
        const rowTax = cleanComparable_(values[i][idx]);
        if (rowTax && rowTax === targetTax) {
          return { found:true, message:'Ya existe una agencia registrada con ese número fiscal.' };
        }
      }
    }
  }

  return { found:false };
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
    const rowEmail = emailIndex >= 0 ? String(values[i][emailIndex] || '').replace(/^'/,'').trim().toLowerCase() : '';
    const rowAgency = agencyIndex >= 0 ? String(values[i][agencyIndex] || '').replace(/^'/,'').trim() : '';
    if ((normalizedEmail && rowEmail === normalizedEmail) || (normalizedAgency && rowAgency === normalizedAgency)) {
      const data = {};
      headers.forEach(function(h, idx){ data[h] = values[i][idx]; });
      return { row:i+1, data:data };
    }
  }
  return { row:-1, data:null };
}

function sheetSafeValue_(headerName, value) {
  if (value === null || value === undefined) return '';
  const textHeaders = ['celular','numeroFiscal','numeroDocumento','correo','web','phoneCode','phoneNumber','fullPhone','taxIdNumber','documentNumber','accessEmail','website'];
  if (textHeaders.indexOf(headerName) >= 0) {
    const raw = String(value).trim();
    // Evita que Google Sheets interprete teléfonos con + como fórmulas y muestre #ERROR!.
    // Solo se antepone apóstrofe cuando el valor empieza con un carácter de fórmula.
    if (/^[+=@-]/.test(raw)) return "'" + raw;
    return raw;
  }
  return value;
}

function setCellByHeader_(sheet, row, headers, headerName, value) {
  const idx = headers.indexOf(headerName);
  if (idx >= 0) {
    const range = sheet.getRange(row, idx + 1);
    if (['celular','numeroFiscal','numeroDocumento','correo','web','phoneCode','phoneNumber','fullPhone','taxIdNumber','documentNumber','accessEmail','website'].indexOf(headerName) >= 0) range.setNumberFormat('@');
    range.setValue(sheetSafeValue_(headerName, value));
  }
}

function sendOrderEmail_(order) {
  agencySendOrderMessage_(order.account.email,order.account.companyName,order.code,order.items,order.currency,order.total,order.paymentDueAt,false);
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
  // El botón del correo debe abrir tu dominio, no script.google.com.
  const verifyUrl = PORTAL_BASE_URL + '/verificar.html?token=' + encodeURIComponent(token);
  const subject = 'Verifica tu correo - Portal de agencias My Cusco Trip';
  const htmlBody = '' +
    '<div style="font-family:Arial,sans-serif;color:#20352b;line-height:1.55;max-width:560px;margin:auto;padding:20px">' +
    '<h2 style="color:#073d2a">Verificación de correo</h2>' +
    '<p>Hola, recibimos la solicitud de registro de <strong>' + escapeHtml_(agencyName) + '</strong> para acceder al portal de agencias de My Cusco Trip.</p>' +
    '<p>Para confirmar que este correo te pertenece, haz clic en el siguiente botón:</p>' +
    '<p><a href="' + verifyUrl + '" style="display:inline-block;background:#0b7a4e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">Verificar correo</a></p>' +
    '<p>Después de verificar el correo, podrás ingresar al portal con tu correo y contraseña.</p>' +
    '<p style="font-size:12px;color:#63766a">Si no solicitaste este registro, puedes ignorar este mensaje.</p>' +
    '</div>';
  MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody, name: BRAND_NAME, replyTo: SUPPORT_EMAIL });
}

function phoneForSheet_(value) {
  const clean = String(value || '').replace(/^'+/, '').replace(/^\+/, '').trim();
  return clean ? "'" + clean : '';
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
  const row = headers.map(function(h){ return sheetSafeValue_(h, obj[h] !== undefined ? obj[h] : ''); });
  sheet.appendRow(row);
}

function findRowByEmail_(sheet, email) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { row:-1, data:null };
  const headers = values[0].map(String);
  const emailIndex = headers.indexOf('correo');
  if (emailIndex < 0) return { row:-1, data:null };
  for (let i=1; i<values.length; i++) {
    if (String(values[i][emailIndex] || '').replace(/^'/,'').trim().toLowerCase() === email) {
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

// V9: migración coordinada. No agregar este archivo junto a V8: sustituirlo.
const AGENCY_PRICE_CATALOG = [{"id":"bienvenida-ancestral-cusco","name":"Bienvenida Ancestral Cusco","pricePEN":25,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"],"entryTickets":[]},{"id":"city-tour-cusco","name":"City Tour Cusco y centros arqueológicos","pricePEN":20,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["09:00","10:00","13:00","14:00"],"entryTickets":[{"id":"boleto-turistico-parcial-city","name":"Boleto turístico parcial","pricePEN":70,"note":"Circuito centros arqueológicos. Referencia extranjero; peruano S/ 40.","name_en":"Partial tourist ticket","note_en":"Archaeological sites circuit. Foreigner reference rate; Peruvian S/ 40."},{"id":"coricancha","name":"Ingreso al Coricancha","pricePEN":15,"note":"Tarifa por adulto.","name_en":"Coricancha entrance","note_en":"Adult rate."}]},{"id":"valle-sagrado-full-day","name":"Valle Sagrado Full Day","pricePEN":40,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["08:00"],"entryTickets":[{"id":"boleto-turistico-parcial-c2","name":"Boleto turístico parcial circuito 2","pricePEN":70,"note":"Referencia extranjero; peruano S/ 40.","name_en":"Partial tourist ticket circuit 2","note_en":"Foreigner reference rate; Peruvian S/ 40."}]},{"id":"valle-sagrado-conexion-machu-picchu","name":"Valle Sagrado conexión a Machu Picchu","pricePEN":40,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["08:00"],"entryTickets":[{"id":"boleto-turistico-parcial-c2","name":"Boleto turístico parcial circuito 2","pricePEN":70,"note":"Referencia extranjero; peruano S/ 40.","name_en":"Partial tourist ticket circuit 2","note_en":"Foreigner reference rate; Peruvian S/ 40."}]},{"id":"valle-sagrado-vip-full-day","name":"Valle Sagrado VIP Full Day","pricePEN":40,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["07:00"],"entryTickets":[{"id":"boleto-turistico-parcial-c2","name":"Boleto turístico parcial circuito 2","pricePEN":70,"note":"Referencia extranjero; peruano S/ 40.","name_en":"Partial tourist ticket circuit 2","note_en":"Foreigner reference rate; Peruvian S/ 40."},{"id":"maras","name":"Ingreso a Salineras de Maras","pricePEN":20,"note":"Referencia extranjero; peruano S/ 15.","name_en":"Maras Salt Mines entrance","note_en":"Foreigner reference rate; Peruvian S/ 15."}]},{"id":"valle-sagrado-vip-conexion","name":"Valle Sagrado VIP conexión a Machu Picchu","pricePEN":40,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["07:00"],"entryTickets":[{"id":"boleto-turistico-parcial-c2","name":"Boleto turístico parcial circuito 2","pricePEN":70,"note":"Referencia extranjero; peruano S/ 40.","name_en":"Partial tourist ticket circuit 2","note_en":"Foreigner reference rate; Peruvian S/ 40."},{"id":"maras","name":"Ingreso a Salineras de Maras","pricePEN":20,"note":"Referencia extranjero; peruano S/ 15.","name_en":"Maras Salt Mines entrance","note_en":"Foreigner reference rate; Peruvian S/ 15."}]},{"id":"maras-moray","name":"Maras y Moray","pricePEN":40,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["08:30"],"entryTickets":[{"id":"maras","name":"Ingreso a Salineras de Maras","pricePEN":20,"note":"Referencia extranjero; peruano S/ 15.","name_en":"Maras Salt Mines entrance","note_en":"Foreigner reference rate; Peruvian S/ 15."},{"id":"moray-boleto","name":"Boleto turístico para Moray","pricePEN":70,"note":"Según boleto turístico aplicable.","name_en":"Tourist ticket for Moray","note_en":"According to applicable tourist ticket."}]},{"id":"valle-sur-cusco","name":"Valle Sur Cusco","pricePEN":40,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["09:00"],"entryTickets":[{"id":"valle-sur-ticket","name":"Boleto turístico Valle Sur","pricePEN":70,"note":"Consultar tarifa según nacionalidad.","name_en":"South Valley tourist ticket","note_en":"Check rate according to nationality."}]},{"id":"montana-colores","name":"Montaña de Colores","pricePEN":60,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["04:30"],"entryTickets":[{"id":"ingreso-vinicunca","name":"Ingreso a Montaña de Colores","pricePEN":25,"note":"Referencia extranjero; peruano S/ 20.","name_en":"Rainbow Mountain entrance","note_en":"Foreigner reference rate; Peruvian S/ 20."}]},{"id":"laguna-humantay","name":"Laguna Humantay","pricePEN":65,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["04:30"],"entryTickets":[{"id":"ingreso-humantay","name":"Ingreso a Laguna Humantay","pricePEN":25,"note":"Referencia extranjero; peruano S/ 20.","name_en":"Humantay Lake entrance","note_en":"Foreigner reference rate; Peruvian S/ 20."}]},{"id":"siete-lagunas-ausangate","name":"Siete Lagunas de Ausangate","pricePEN":120,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["04:00"],"entryTickets":[]},{"id":"guiado-machu-picchu-circuito-2","name":"Guiado Machu Picchu Circuito 2","pricePEN":35,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["09:00","10:00","11:00"],"entryTickets":[]},{"id":"guiado-machu-picchu-privado","name":"Guiado privado Machu Picchu Circuitos 1 o 3","pricePEN":170,"priceUSD":null,"currency":"PEN","priceUnit":"por grupo","schedules":["A coordinar"],"entryTickets":[]},{"id":"machu-picchu-full-day-extranjero","name":"Machu Picchu Full Day para extranjeros","pricePEN":777.4,"priceUSD":230,"currency":"USD","priceUnit":"por persona","schedules":["Según tren confirmado"],"entryTickets":[]},{"id":"machu-picchu-overnight-extranjero","name":"Machu Picchu Overnight para extranjeros","pricePEN":878.8,"priceUSD":260,"currency":"USD","priceUnit":"por persona","schedules":["Según tren confirmado"],"entryTickets":[]},{"id":"machu-picchu-full-day-peruano","name":"Machu Picchu Full Day para peruanos","pricePEN":200,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["Según tren confirmado"],"entryTickets":[]},{"id":"machu-picchu-overnight-peruano","name":"Machu Picchu Overnight para peruanos","pricePEN":265,"priceUSD":null,"currency":"PEN","priceUnit":"por persona","schedules":["Según tren confirmado"],"entryTickets":[]}];
const AGENCY_EXCHANGE_RATE = 3.38;
function agencyIssueSession_(data){
  const token=Utilities.getUuid()+Utilities.getUuid();
  const identity={agencyId:String(data.id),email:String(data.correo||data.accessEmail).toLowerCase(),companyName:String(data.nombreComercial||data.tradeName||data.razonSocial||''),country:String(data.pais||data.country||'')};
  CacheService.getScriptCache().put('agency-session:'+token,JSON.stringify(identity),21600);return token;
}
function agencySession_(token){
  if(!token||!/^[a-f0-9-]{72}$/i.test(String(token)))return null;
  const raw=CacheService.getScriptCache().get('agency-session:'+token);if(!raw)return null;
  const id=JSON.parse(raw);const found=findRowByEmail_(getSheet_(SHEET_AGENCIES,AGENCY_HEADERS),id.email);
  if(found.row<1||String(found.data.id)!==id.agencyId||!['aprobado','activo'].includes(String(found.data.estado).toLowerCase())||!['sí','si','yes'].includes(String(found.data.emailVerificado).toLowerCase()))return null;
  return id;
}
function agencyGoogleLogin_(credential){
  const clientId=PropertiesService.getScriptProperties().getProperty('AGENCY_GOOGLE_CLIENT_ID');
  if(!clientId||!credential||String(credential).length>10000)return json_({ok:false,message:'Acceso Google no configurado.'});
  const response=UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(credential),{muteHttpExceptions:true});
  if(response.getResponseCode()!==200)return json_({ok:false,message:'No se pudo verificar Google.'});
  const g=JSON.parse(response.getContentText());
  if(g.aud!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(g.iss)||String(g.email_verified)!=='true'||Number(g.exp)*1000<=Date.now()||!g.sub)return json_({ok:false,message:'Identidad Google no válida.'});
  const found=findRowByEmail_(getSheet_(SHEET_AGENCIES,AGENCY_HEADERS),String(g.email||'').toLowerCase());const d=found.data||{};
  if(found.row<1||!['aprobado','activo'].includes(String(d.estado).toLowerCase())||!['sí','si','yes'].includes(String(d.emailVerificado).toLowerCase()))return json_({ok:false,message:'Registra y verifica primero una agencia aprobada con ese correo.'});
  return json_({ok:true,sessionToken:agencyIssueSession_(d),agency:{id:d.id,correo:d.correo,nombreComercial:d.nombreComercial,razonSocial:d.razonSocial,representanteNombres:d.representanteNombres,pais:d.pais,estado:d.estado}});
}
function agencyCreateOrderSafe_(order){
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    if(!/^[A-Z0-9]{8,30}$/.test(String(order.code))||!Array.isArray(order.items)||!order.items.length||order.items.length>50)throw Error('Orden inválida.');
    const existing=findOrderByCode_(order.code);if(existing){if(String(existing.data.agenciaId)===String(order.account.agencyId))return json_({ok:true,code:order.code});throw Error('Código de orden en uso.');}
    if(!['PEN','USD'].includes(order.currency))throw Error('Moneda inválida.');
    const rate=AGENCY_EXCHANGE_RATE;const cur=order.currency;const conv=(p,u,c)=>cur==='PEN'?(c==='USD'&&u!=null?Number(u)*rate:Number(p||0)):(c==='USD'&&u!=null?Number(u):Number(p||0)/rate);
    let subtotal=0;const ids={};
    order.items=order.items.map(i=>{
      const s=AGENCY_PRICE_CATALOG.find(x=>x.id===i.serviceId);
      const pax=Number(i.pax);if(!s||!Number.isInteger(pax)||pax<1||pax>50||!/^\d{4}-\d{2}-\d{2}$/.test(String(i.travelDate))||i.travelDate<=Utilities.formatDate(new Date(),'America/Lima','yyyy-MM-dd')||!s.schedules.includes(i.serviceTime)||!i.id||ids[i.id])throw Error('Revisa fecha, horario y pasajeros.');
      ids[i.id]=true;const tickets=(i.entryTickets||[]).map(t=>{const x=s.entryTickets.find(y=>y.id===t.id);if(!x)throw Error('Entrada inválida.');return {id:x.id,name:x.name,pricePEN:x.pricePEN,priceUSD:x.priceUSD||null,currency:x.currency||'PEN',pax:pax};});
      if(new Set(tickets.map(t=>t.id)).size!==tickets.length)throw Error('Entrada duplicada.');
      subtotal+=conv(s.pricePEN,s.priceUSD,s.currency)*pax+tickets.reduce((a,t)=>a+conv(t.pricePEN,t.priceUSD,t.currency)*pax,0);
      return {id:String(i.id),serviceId:s.id,serviceName:s.name,travelDate:i.travelDate,serviceTime:i.serviceTime,pax:pax,unitPricePEN:s.pricePEN,unitPriceUSD:s.priceUSD,serviceCurrency:s.currency,priceUnit:s.priceUnit,entryTickets:tickets,lead:agencyCleanLead_(i.lead),passengers:agencyCleanPassengers_(i.passengers,pax),pickupHotel:String(i.pickupHotel||'').slice(0,250),pickupAddress:String(i.pickupAddress||'').slice(0,350),pickupPoint:String(i.pickupPoint||'').slice(0,600),notes:String(i.notes||'').slice(0,500),pickupWindow:''};
    });
    const total=Number((subtotal/(1-.054-.015)).toFixed(2));if(Math.abs(Number(order.total)-total)>.02)throw Error('Tarifas actualizadas. Recarga el catálogo antes de generar la orden.');
    order.subtotal=Number(subtotal.toFixed(2));order.total=total;order.fee=Number((total-subtotal).toFixed(2));order.exchangeRate=rate;order.status='Pendiente';order.paymentDueAt=new Date(Date.now()+3*3600000).toISOString();return createOrder_(order);
  }finally{lock.releaseLock();}
}
function agencyCleanLead_(p){p=p||{};const o={};['firstName','lastName','docType','docNumber','nationality','phone','language'].forEach(k=>o[k]=String(p[k]||'').trim().slice(0,150));if(o.language&&!['Español','Inglés'].includes(o.language))throw Error('Idioma inválido.');return o;}
function agencyCleanPassengers_(p,pax){return (Array.isArray(p)?p:[]).slice(0,pax-1).map(x=>{const a=agencyCleanLead_(x);return {firstName:a.firstName,lastName:a.lastName,docType:a.docType,docNumber:a.docNumber};});}
function agencyUpdateReservation_(target,payload){
  const lock=LockService.getScriptLock();lock.waitLock(20000);try{
  target=findOrderByCode_(String(target.data.codigoOrden));const items=parseJsonSafe_(target.data.serviciosJson,[]);const i=items.find(x=>String(x.id)===String(payload.itemId));if(!i||i.travelDate<=Utilities.formatDate(new Date(),'America/Lima','yyyy-MM-dd')||String(target.data.estadoPago).toLowerCase()==='vencido')throw Error('Reserva no editable.');
  i.lead=agencyCleanLead_(payload.lead);i.passengers=agencyCleanPassengers_(payload.passengers,i.pax);i.pickupHotel=String(payload.pickupHotel||'').slice(0,250);i.pickupAddress=String(payload.pickupAddress||'').slice(0,350);i.pickupPoint=[i.pickupHotel,i.pickupAddress].filter(Boolean).join(' — ');i.notes=String(payload.notes||'').slice(0,500);
  setCellByHeader_(target.sheet,target.row,target.headers,'serviciosJson',JSON.stringify(items));setCellByHeader_(target.sheet,target.row,target.headers,'titularJson',JSON.stringify(items[0]?.lead||{}));setCellByHeader_(target.sheet,target.row,target.headers,'pasajerosJson',JSON.stringify(items.flatMap(x=>x.passengers||[])));return json_({ok:true});
  }finally{lock.releaseLock();}
}
function agencyBankText_(currency){return PropertiesService.getScriptProperties().getProperty('AGENCY_BANK_'+(currency==='USD'?'USD':'PEN'))||'';}
function agencySendOrderMessage_(email,name,code,items,currency,total,due,paid){
  const esc=escapeHtml_;const rows=(items||[]).map(i=>'<li><strong>'+esc(i.serviceName)+'</strong> · '+esc(i.travelDate)+' · '+esc(i.serviceTime)+' · '+esc(i.pax)+' pax<br>'+esc([i.lead?.firstName,i.lead?.lastName].filter(Boolean).join(' ')||'Datos de pasajeros pendientes')+'<br>Recojo: '+esc(i.pickupPoint||'Por coordinar')+' · '+esc(i.pickupWindow||'Horario por confirmar')+'</li>').join('');
  const bank=agencyBankText_(currency);const html='<div style="font-family:Arial;color:#073322;max-width:640px;margin:auto"><header style="background:#073322;color:white;padding:20px"><h2>My Cusco Trip</h2><h3>'+esc(code)+'</h3></header><p>Estimada agencia '+esc(name)+',</p><p>'+(paid?'Tu pago ha sido validado. Consulta el estado y los horarios de recojo de tus reservas.':'Tu orden se ha generado. Los servicios quedan sujetos a disponibilidad y pago validado.')+'</p><ul>'+rows+'</ul><p><strong>Total: '+esc(moneyEmail_(total,currency))+'</strong></p>'+(!paid?'<p>Vencimiento: '+esc(formatDateTimeEmail_(due))+'</p>'+(bank?'<p>'+esc(bank).replace(/\n/g,'<br>')+'</p><p>Responde este correo con el comprobante para su verificación.</p>':'<p>Consulta los métodos de pago en Mis órdenes.</p>'):'')+'<p><a href="'+PORTAL_BASE_URL+'/reservas.html">Consultar mis reservas</a></p></div>';
  MailApp.sendEmail({to:email,subject:(paid?'Pago confirmado - ':'Orden generada - ')+code,body:'My Cusco Trip. Consulta tu orden '+code+' en el portal.',htmlBody:html,name:BRAND_NAME,replyTo:SUPPORT_EMAIL});
}
function agencySendPaid_(d){agencySendOrderMessage_(d.correoAgencia,d.agenciaNombre,d.codigoOrden,parseJsonSafe_(d.serviciosJson,[]),d.moneda,d.montoComisionado,'',true);}
// Ejecutar solo desde Apps Script, con el número de orden en Propiedades del script.
function agencyConfirmManualPayment(){
 const props=PropertiesService.getScriptProperties();const code=props.getProperty('AGENCY_MANUAL_ORDER_CODE');if(!code)throw Error('Configura AGENCY_MANUAL_ORDER_CODE.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);try{const t=findOrderByCode_(code);if(!t)throw Error('Orden no encontrada.');if(String(t.data.estadoPago).toLowerCase()!=='pagado'){setCellByHeader_(t.sheet,t.row,t.headers,'estadoPago','Pagado');setCellByHeader_(t.sheet,t.row,t.headers,'fechaPagoManual',new Date());}
 if(!t.data.correoConfirmacionEnviado){agencySendPaid_(t.data);setCellByHeader_(t.sheet,t.row,t.headers,'correoConfirmacionEnviado',new Date());}props.deleteProperty('AGENCY_MANUAL_ORDER_CODE');}finally{lock.releaseLock();}
}
