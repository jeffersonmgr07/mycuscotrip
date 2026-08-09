/*
My Cusco Trip - Backend ligero para Google Apps Script
Versión: 2026-08-09-v4.4-trip-planner-compact-reward

Qué hace:
- Recibe leads del popup de cupón.
- Genera cupones únicos con vigencia mínima de 48 horas y gracia hasta el final de ese día.
- Guarda pre-reservas y pasajeros en Google Sheets.
- Valida cupones vigentes al crear una reserva.
- Crea órdenes PayPal desde servidor usando credenciales privadas en Script Properties.
- Crea preferencias Mercado Pago para reservas en soles/PEN usando access token privado.
- Captura/verifica pagos PayPal y Mercado Pago, marca la reserva como pagada, genera voucher JSON y envía correos.
- Permite consultar una reserva/voucher por código y apellido desde mi-reserva.html.
- Agrega planificador de viaje para prospectos con hoja LEADS_WEB, OTP de 6 dígitos, verificación de email, UTMs y evento Lead.
- Entrega un cupón personal permanente del 10% y un solo uso después de verificar el correo.

Instalación rápida:
1) Crea un Google Sheet vacío.
2) Extensiones > Apps Script.
3) Pega este archivo completo en Code.gs.
4) Cambia SPREADSHEET_ID por el ID de tu Google Sheet.
5) Ejecuta setupScriptPropertiesExample() una vez y revisa las Propiedades del script.
6) Ejecuta setupCouponSystem() una vez y autoriza permisos.
7) Implementar > Nueva implementación > Aplicación web:
   - Ejecutar como: Tú.
   - Quién tiene acceso: Cualquier usuario con el enlace.
8) Copia la URL /exec y colócala en assets/data/backend-config.json como apiBaseUrl.

IMPORTANTE:
- No pegues PAYPAL_CLIENT_SECRET en archivos públicos del proyecto.
- PAYPAL_CLIENT_SECRET va únicamente en Propiedades del script.
*/

const BACKEND_VERSION = '2026-08-09-v4.4-trip-planner-compact-reward';
const SPREADSHEET_ID = '1wyggG0x_-f-qwnfiapu-G1nyCpIyFk8vwKKcqCYCP8s';

const SHEETS = {
  COUPONS: 'Cupones',
  RESERVATIONS: 'Reservas',
  PASSENGERS: 'Pasajeros',
  PAYMENTS: 'Pagos',
  AUDIT: 'Auditoria',
  LEADS_WEB: 'LEADS_WEB'
};

const HEADERS = {
  Cupones: [
    'FechaRegistro','CodigoCupon','Estado','Porcentaje','VigenteHasta','Nombre','WhatsApp','Correo','Pagina','Idioma','Fuente','CanjeadoEn','CodigoReserva','JSON',
    'Tipo','Valor','Moneda','Activo','VigenteDesde','MaxUsos','Usos','CorreoVinculado','ReservadoHasta','PayPalOrderID','Notas'
  ],
  Reservas: [
    'FechaRegistro','CodigoReserva','Estado','EstadoPago','VigenteHasta','ProductoID','Producto','FechaViaje','Moneda','TotalServicio','MontoPagarAhora','SaldoPendiente','ModalidadPago','TitularNombre','TitularApellido','TitularEmail','TitularWhatsApp','IdiomaSolicitado','CodigoCupon','DescuentoCupon','ProveedorPago','PayPalOrderID','PayPalCaptureID','MercadoPagoPreferenceID','MercadoPagoPaymentID','VoucherURL','ApellidoClave','JSON','VoucherJSON'
  ],
  Pasajeros: [
    'FechaRegistro','CodigoReserva','Numero','Rol','EstadoDatos','Nombres','Apellidos','TipoDocumento','NumeroDocumento','Nacionalidad','FechaNacimiento','WhatsApp','Correo','JSON'
  ],
  Pagos: [
    'FechaRegistro','CodigoReserva','Proveedor','Estado','Moneda','Monto','PayPalOrderID','PayPalCaptureID','MercadoPagoPreferenceID','MercadoPagoPaymentID','RawJSON'
  ],
  Auditoria: [
    'Fecha','Accion','CodigoReserva','Detalle','JSON'
  ],
  LEADS_WEB: [
    'ID','FechaRegistro','FechaActualizacion','Estado','Nombre','Apellido','Email','EmailVerificado',
    'WhatsApp','PaisTelefono','Adultos','Ninos','EdadesNinos','EstadoFechas','FechaInicio','FechaFin',
    'MesEstimado','SemanaEstimada','DuracionDias','EstadoVuelos','OrigenViaje','TipoServicio','Destinos',
    'OtrosDestino','AlcanceViaje','AlcanceOtrosDestinos','Comentarios','OrigenLead','PaisCampana',
    'CampanaParametro','UTMSource','UTMMedium','UTMCampaign','UTMContent','UTMTerm','FBCLID',
    'PaginaOrigen','Referrer','ClientRequestID','CodigoVerificacion','CodigoExpira','UltimoEnvioCodigo',
    'Reenvios','IntentosVerificacion','FechaVerificacion','NotificacionInternaEn','CodigoCuponBeneficio','CuponBeneficioEnviadoEn','JSON'
  ]
};

function setupSheets() {
  Object.keys(SHEETS).forEach(function(key) {
    const name = SHEETS[key];
    const headers = HEADERS[name];
    const sh = getSheet_(name, headers);
    ensureHeaders_(sh, headers);
  });
  return { ok: true, message: 'Hojas creadas/verificadas correctamente.' };
}

/**
 * Ejecuta esta función una vez después de pegar el script.
 * Crea/verifica las hojas, establece la zona horaria de la hoja y registra
 * el cupón público inicial del popup dentro de Google Sheets.
 */
function setupCouponSystem() {
  // Actualiza únicamente la configuración de cupones y conserva intactas
  // las credenciales PayPal/Mercado Pago ya guardadas.
  PropertiesService.getScriptProperties().setProperties({
    COUPON_TTL_HOURS: '48',
    COUPON_GRACE_END_OF_DAY: 'true',
    COUPON_TIME_ZONE: 'America/Lima',
    COUPON_MAX_USES: '1'
  }, false);

  repairCouponSheetSchema_();
  setupSheets();
  const timeZone = getCouponTimeZone_();
  SpreadsheetApp.openById(SPREADSHEET_ID).setSpreadsheetTimeZone(timeZone);
  const publicCoupon = upsertPublicCoupon_();
  return {
    ok: true,
    version: BACKEND_VERSION,
    message: 'Sistema de cupones configurado correctamente.',
    sheet: SHEETS.COUPONS,
    timeZone: timeZone,
    publicCoupon: publicCoupon,
    popupTtlHours: number_(getProp_('COUPON_TTL_HOURS', '48'), 48),
    graceUntilEndOfDay: boolean_(getProp_('COUPON_GRACE_END_OF_DAY', 'true'), true)
  };
}


/**
 * Ejecuta esta función una sola vez para habilitar el planificador de viaje.
 * Crea/verifica exclusivamente la hoja LEADS_WEB y agrega valores seguros
 * de configuración sin sobrescribir las credenciales de pagos ya existentes.
 */
function setupLeadPlannerSystem() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    LEAD_CODE_TTL_MINUTES: '10',
    LEAD_RESEND_COOLDOWN_SECONDS: '60',
    LEAD_MAX_RESENDS: '5',
    LEAD_MAX_VERIFY_ATTEMPTS: '8',
    LEAD_CREATE_WINDOW_MINUTES: '15',
    LEAD_CREATE_MAX_PER_WINDOW: '3',
    LEAD_TIME_ZONE: 'America/Lima',
    LEAD_NOTIFICATION_EMAIL: 'reservas@mycuscotrip.com',
    LEAD_PLAN_URL: 'https://mycuscotrip.com/planifica-tu-viaje.html',
    LEAD_REWARD_COUPON_ENABLED: 'true',
    LEAD_REWARD_COUPON_PERCENT: '10',
    LEAD_REWARD_COUPON_URL: 'https://mycuscotrip.com/go'
  }, false);

  if (!clean_(props.getProperty('LEAD_VERIFICATION_PEPPER'))) {
    props.setProperty('LEAD_VERIFICATION_PEPPER', Utilities.getUuid() + Utilities.getUuid());
  }

  const sh = getSheet_(SHEETS.LEADS_WEB, HEADERS.LEADS_WEB);
  ensureHeaders_(sh, HEADERS.LEADS_WEB);
  sh.setFrozenRows(1);

  return {
    ok: true,
    version: BACKEND_VERSION,
    sheet: SHEETS.LEADS_WEB,
    codeTtlMinutes: number_(getProp_('LEAD_CODE_TTL_MINUTES', '10'), 10),
    resendCooldownSeconds: number_(getProp_('LEAD_RESEND_COOLDOWN_SECONDS', '60'), 60),
    message: 'Planificador de viaje y verificación de leads configurados correctamente.'
  };
}

/**
 * Corrige una migración defectuosa de encabezados de la hoja Cupones.
 * La versión anterior podía dejar columnas vacías entre los encabezados
 * antiguos y los nuevos. Esta función reconstruye la hoja con el orden
 * canónico sin eliminar registros.
 */
function repairCouponSheetSchema_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEETS.COUPONS);
  if (!sh) {
    sh = ss.insertSheet(SHEETS.COUPONS);
    sh.getRange(1, 1, 1, HEADERS.Cupones.length).setValues([HEADERS.Cupones]);
    sh.setFrozenRows(1);
    return { ok: true, rows: 0, repaired: false };
  }

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) {
    sh.clearContents();
    sh.getRange(1, 1, 1, HEADERS.Cupones.length).setValues([HEADERS.Cupones]);
    sh.setFrozenRows(1);
    return { ok: true, rows: 0, repaired: false };
  }

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const existingHeaders = values[0].map(function(value) { return clean_(value); });
  const headerPositions = {};
  existingHeaders.forEach(function(header, index) {
    if (header && headerPositions[header] == null) headerPositions[header] = index;
  });

  const legacyCount = 14;
  const dataRows = values.slice(1).map(function(row) {
    return HEADERS.Cupones.map(function(header, canonicalIndex) {
      const mappedIndex = headerPositions[header];
      let value = mappedIndex == null ? '' : row[mappedIndex];

      // Recupera datos escritos en las posiciones 15-25 cuando los nombres
      // de sus encabezados quedaron desplazados más a la derecha.
      if ((value === '' || value == null) && canonicalIndex >= legacyCount && canonicalIndex < row.length) {
        value = row[canonicalIndex];
      }
      return value == null ? '' : value;
    });
  });

  const alreadyCanonical = existingHeaders.length === HEADERS.Cupones.length &&
    HEADERS.Cupones.every(function(header, index) { return existingHeaders[index] === header; });
  if (alreadyCanonical) return { ok: true, rows: dataRows.length, repaired: false };

  sh.clearContents();
  sh.getRange(1, 1, 1, HEADERS.Cupones.length).setValues([HEADERS.Cupones]);
  if (dataRows.length) sh.getRange(2, 1, dataRows.length, HEADERS.Cupones.length).setValues(dataRows);
  sh.setFrozenRows(1);
  return { ok: true, rows: dataRows.length, repaired: true };
}

function ensureHeaders_(sh, headers) {
  const currentWidth = Math.max(1, sh.getLastColumn());
  const current = sh.getLastRow()
    ? sh.getRange(1, 1, 1, currentWidth).getValues()[0].map(function(h) { return String(h || '').trim(); })
    : [];

  while (current.length && !current[current.length - 1]) current.pop();
  headers.forEach(function(header) {
    if (current.indexOf(header) === -1) current.push(header);
  });

  if (!current.length) current.push.apply(current, headers);
  sh.getRange(1, 1, 1, current.length).setValues([current]);
  sh.setFrozenRows(1);
}

function setupScriptPropertiesExample() {
  PropertiesService.getScriptProperties().setProperties({
    CORPORATE_EMAIL: 'reservas@mycuscotrip.com',
    PUBLIC_BASE_URL: 'https://mycuscotrip.com',
    PAYPAL_MODE: 'sandbox',
    PAYPAL_CLIENT_ID: 'PEGAR_PAYPAL_CLIENT_ID',
    PAYPAL_CLIENT_SECRET: 'PEGAR_PAYPAL_CLIENT_SECRET',
    MERCADOPAGO_MODE: 'sandbox',
    MERCADOPAGO_ACCESS_TOKEN: 'PEGAR_MERCADOPAGO_ACCESS_TOKEN',
    MERCADOPAGO_WEBHOOK_URL: '',
    COUPON_PERCENT: '15',
    COUPON_TTL_HOURS: '48',
    COUPON_GRACE_END_OF_DAY: 'true',
    COUPON_TIME_ZONE: 'America/Lima',
    COUPON_MAX_USES: '1',
    PUBLIC_COUPON_CODE: 'BETSWELCOME05',
    PUBLIC_COUPON_PERCENT: '5',
    COUPON_SENDER_EMAIL: 'contact@mycuscotrip.com',
    COUPON_REPLY_TO: 'contact@mycuscotrip.com',
    COUPON_EMAIL_NAME: 'My Cusco Trip',
    COUPON_LOGO_URL: 'https://mycuscotrip.com/assets/img/logos/Logo1.png',
    COUPON_CTA_URL: 'https://mycuscotrip.com/go',
    COUPON_EMAIL_TEST_TO: '',
    LEAD_REWARD_COUPON_ENABLED: 'true',
    LEAD_REWARD_COUPON_PERCENT: '10',
    LEAD_REWARD_COUPON_URL: 'https://mycuscotrip.com/go',
    RESERVATION_TTL_HOURS: '72'
  }, false);
  return { ok: true, message: 'Propiedades de ejemplo creadas. Reemplaza los valores por los reales.' };
}


/**
 * Ejecuta esta función una sola vez para registrar únicamente las propiedades
 * de la plantilla de correo. No modifica credenciales PayPal ni Mercado Pago.
 */
function setupCouponEmailProperties() {
  PropertiesService.getScriptProperties().setProperties({
    COUPON_SENDER_EMAIL: 'contact@mycuscotrip.com',
    COUPON_REPLY_TO: 'contact@mycuscotrip.com',
    COUPON_EMAIL_NAME: 'My Cusco Trip',
    COUPON_LOGO_URL: 'https://mycuscotrip.com/assets/img/logos/Logo1.png',
    COUPON_CTA_URL: 'https://mycuscotrip.com/go'
  }, false);

  return {
    ok: true,
    sender: getProp_('COUPON_SENDER_EMAIL', 'contact@mycuscotrip.com'),
    replyTo: getProp_('COUPON_REPLY_TO', 'contact@mycuscotrip.com'),
    logoUrl: getProp_('COUPON_LOGO_URL', 'https://mycuscotrip.com/assets/img/logos/Logo1.png'),
    ctaUrl: getProp_('COUPON_CTA_URL', 'https://mycuscotrip.com/go'),
    alias: testCouponSenderAlias_()
  };
}

function clearPayPalCache() {
  const cache = CacheService.getScriptCache();
  cache.remove('PAYPAL_ACCESS_TOKEN');
  cache.remove('PAYPAL_ACCESS_TOKEN_SANDBOX');
  cache.remove('PAYPAL_ACCESS_TOKEN_LIVE');
  return { ok: true, message: 'Cache de token PayPal limpiado.' };
}

function testPayPalToken() {
  clearPayPalCache();
  const mode = getProp_('PAYPAL_MODE', 'sandbox') === 'live' ? 'live' : 'sandbox';
  const base = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const token = getPayPalAccessToken_(base);
  const result = {
    ok: true,
    mode: mode,
    base: base,
    tokenPreview: token ? token.slice(0, 12) + '...' : '',
    message: 'PayPal generó token correctamente.'
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testCreatePayPalOrder() {
  const result = paypalRequest_('post', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: 'TESTPAYPAL',
      custom_id: 'TESTPAYPAL',
      description: 'Prueba My Cusco Trip',
      amount: { currency_code: 'USD', value: '1.00' }
    }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'My Cusco Trip',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: getPublicBaseUrl_() + '/paypal-retorno.html?test=1',
          cancel_url: getPublicBaseUrl_() + '/product.html?payment=cancelled&test=1'
        }
      }
    }
  });
  const approvalUrl = getPayPalApprovalUrl_(result);
  const output = {
    ok: true,
    id: result.id,
    status: result.status,
    approvalUrl: approvalUrl,
    links: result.links || []
  };
  Logger.log(JSON.stringify(output, null, 2));
  return output;
}

function doGet(e) {
  try {
    const params = e && e.parameter || {};
    const action = String(params.action || 'health').trim();
    if (action === 'health') return json_({ ok: true, service: 'my-cusco-trip-apps-script', version: BACKEND_VERSION, time: new Date().toISOString() });
    if (action === 'couponHealth') return json_(couponHealth_(params));
    if (action === 'validateCoupon') return json_(validateCoupon_(params));
    if (action === 'lookupReservation') return json_(lookupReservation_(params));
    return json_({ ok: false, error: 'Acción GET no reconocida.' });
  } catch (err) {
    return json_({ ok: false, error: getErrorMessage_(err) });
  }
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const action = String(payload.action || '').trim();

    if (action === 'createCouponLead') return json_(createCouponLead_(payload));
    if (action === 'validateCoupon') return json_(validateCoupon_(payload));
    if (action === 'createPreReservation') return json_(createPreReservation_(payload));
    if (action === 'createPayPalOrder') return json_(createPayPalOrder_(payload));
    if (action === 'capturePayPalOrder') return json_(capturePayPalOrder_(payload));
    if (action === 'createMercadoPagoPreference') return json_(createMercadoPagoPreference_(payload));
    if (action === 'captureMercadoPagoPayment') return json_(captureMercadoPagoPayment_(payload));
    if (action === 'lookupReservation') return json_(lookupReservation_(payload));
    if (action === 'createTravelLead') return json_(createTravelLead_(payload));
    if (action === 'resendTravelLeadCode') return json_(resendTravelLeadCode_(payload));
    if (action === 'verifyTravelLeadEmail') return json_(verifyTravelLeadEmail_(payload));

    return json_({ ok: false, error: 'Acción POST no reconocida: ' + action });
  } catch (err) {
    logAudit_('ERROR', '', getErrorMessage_(err), { stack: err && err.stack });
    return json_({ ok: false, error: getErrorMessage_(err) });
  }
}


/* ========================================================================
   PLANIFICADOR DE VIAJE / LEADS WEB
   ======================================================================== */

function createTravelLead_(p) {
  const raw = p && p.payload && typeof p.payload === 'object' ? p.payload : (p || {});
  const lead = validateTravelLeadPayload_(raw);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const existingByRequest = findTravelLeadByClientRequestId_(lead.clientRequestId);
    if (existingByRequest) {
      const row = existingByRequest.row;
      const state = clean_(row.Estado);
      return {
        ok: true,
        existing: true,
        leadId: row.ID,
        status: state,
        maskedEmail: maskEmail_(row.Email),
        codeExpiresAt: toIsoSafe_(row.CodigoExpira),
        resendAvailableAt: calculateResendAvailableAt_(row.UltimoEnvioCodigo),
        emailSent: true,
        alreadyVerified: normalizeText_(state) === 'verified'
      };
    }

    enforceTravelLeadCreateRateLimit_(lead.email, lead.whatsapp);

    const now = new Date();
    const leadId = generateUniqueTravelLeadId_();
    const code = generateTravelLeadVerificationCode_();
    const codeExpiry = addMinutes_(now, number_(getProp_('LEAD_CODE_TTL_MINUTES', '10'), 10));
    const codeHash = hashTravelLeadVerificationCode_(leadId, lead.email, code);

    const rowObject = {
      ID: leadId,
      FechaRegistro: now,
      FechaActualizacion: now,
      Estado: 'PENDING_EMAIL',
      Nombre: lead.name,
      Apellido: lead.lastName,
      Email: lead.email,
      EmailVerificado: false,
      WhatsApp: lead.whatsapp,
      PaisTelefono: lead.phoneCountry + (lead.phoneDialCode ? ' (' + lead.phoneDialCode + ')' : ''),
      Adultos: lead.adults,
      Ninos: lead.children,
      EdadesNinos: lead.childAges.join(', '),
      EstadoFechas: travelLeadLabel_('dateStatus', lead.dateStatus),
      FechaInicio: lead.startDate,
      FechaFin: lead.endDate,
      MesEstimado: lead.estimatedMonthLabel || lead.estimatedMonth,
      SemanaEstimada: travelLeadLabel_('week', lead.estimatedWeek),
      DuracionDias: travelLeadDurationLabel_(lead),
      EstadoVuelos: travelLeadLabel_('flightStatus', lead.flightStatus),
      OrigenViaje: lead.travelOrigin,
      TipoServicio: travelLeadLabel_('serviceType', lead.serviceType),
      Destinos: lead.destinations.map(function(value) { return travelLeadLabel_('destination', value); }).join(', '),
      OtrosDestino: lead.otherDestination,
      AlcanceViaje: travelLeadLabel_('scope', lead.scope),
      AlcanceOtrosDestinos: lead.scopeExtras.map(function(value) { return travelLeadLabel_('destination', value); }).join(', '),
      Comentarios: lead.comments,
      OrigenLead: lead.originLead,
      PaisCampana: lead.campaignCountry,
      CampanaParametro: lead.campaignParam,
      UTMSource: lead.utmSource,
      UTMMedium: lead.utmMedium,
      UTMCampaign: lead.utmCampaign,
      UTMContent: lead.utmContent,
      UTMTerm: lead.utmTerm,
      FBCLID: lead.fbclid,
      PaginaOrigen: lead.pageOrigin,
      Referrer: lead.referrer,
      ClientRequestID: lead.clientRequestId,
      CodigoVerificacion: codeHash,
      CodigoExpira: codeExpiry,
      UltimoEnvioCodigo: now,
      Reenvios: 0,
      IntentosVerificacion: 0,
      FechaVerificacion: '',
      NotificacionInternaEn: '',
      CodigoCuponBeneficio: '',
      CuponBeneficioEnviadoEn: '',
      JSON: JSON.stringify(lead)
    };

    appendTravelLeadRow_(rowObject);
    const emailResult = sendTravelLeadVerificationEmail_(rowObject, code);

    logAudit_('createTravelLead', leadId, 'Prospecto web creado en estado PENDING_EMAIL', {
      email: lead.email,
      source: lead.originLead,
      campaign: lead.utmCampaign || lead.campaignParam,
      emailSent: Boolean(emailResult && emailResult.sent)
    });

    return {
      ok: true,
      leadId: leadId,
      status: 'PENDING_EMAIL',
      maskedEmail: maskEmail_(lead.email),
      codeExpiresAt: codeExpiry.toISOString(),
      resendAvailableAt: addSeconds_(now, number_(getProp_('LEAD_RESEND_COOLDOWN_SECONDS', '60'), 60)).toISOString(),
      emailSent: Boolean(emailResult && emailResult.sent)
    };
  } finally {
    lock.releaseLock();
  }
}

function resendTravelLeadCode_(p) {
  const raw = p && p.payload && typeof p.payload === 'object' ? p.payload : (p || {});
  const leadId = clean_(raw.leadId);
  const email = cleanEmail_(raw.email);
  if (!leadId || !isValidEmail_(email)) {
    return { ok: false, errorCode: 'INVALID_REQUEST', error: 'Solicitud de reenvío inválida.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const item = findTravelLeadById_(leadId);
    if (!item || cleanEmail_(item.row.Email) !== email) {
      return { ok: false, errorCode: 'LEAD_NOT_FOUND', error: 'No encontramos la solicitud pendiente.' };
    }

    const row = item.row;
    if (normalizeText_(row.Estado) === 'verified') {
      return { ok: false, errorCode: 'ALREADY_VERIFIED', error: 'Este correo ya fue verificado.' };
    }

    const now = new Date();
    const cooldown = Math.max(15, number_(getProp_('LEAD_RESEND_COOLDOWN_SECONDS', '60'), 60));
    const lastSentAt = parseDate_(row.UltimoEnvioCodigo);
    if (lastSentAt) {
      const elapsed = Math.floor((now.getTime() - lastSentAt.getTime()) / 1000);
      if (elapsed < cooldown) {
        return {
          ok: false,
          errorCode: 'RESEND_COOLDOWN',
          error: 'Espera unos segundos antes de solicitar otro código.',
          retryAfterSeconds: cooldown - elapsed
        };
      }
    }

    const resendCount = Math.max(0, Math.floor(number_(row.Reenvios, 0)));
    const maxResends = Math.max(1, Math.floor(number_(getProp_('LEAD_MAX_RESENDS', '5'), 5)));
    if (resendCount >= maxResends) {
      return {
        ok: false,
        errorCode: 'RESEND_LIMIT',
        error: 'Alcanzaste el límite de reenvíos para esta solicitud. Puedes completar nuevamente el formulario más adelante.'
      };
    }

    const code = generateTravelLeadVerificationCode_();
    const expiry = addMinutes_(now, number_(getProp_('LEAD_CODE_TTL_MINUTES', '10'), 10));
    const codeHash = hashTravelLeadVerificationCode_(leadId, email, code);

    updateRowFields_(item, {
      FechaActualizacion: now,
      CodigoVerificacion: codeHash,
      CodigoExpira: expiry,
      UltimoEnvioCodigo: now,
      Reenvios: resendCount + 1,
      IntentosVerificacion: 0
    });

    const refreshed = findTravelLeadById_(leadId);
    const emailResult = sendTravelLeadVerificationEmail_(refreshed ? refreshed.row : row, code);

    logAudit_('resendTravelLeadCode', leadId, 'Código de verificación reenviado', {
      resendCount: resendCount + 1,
      emailSent: Boolean(emailResult && emailResult.sent)
    });

    return {
      ok: true,
      leadId: leadId,
      status: 'PENDING_EMAIL',
      codeExpiresAt: expiry.toISOString(),
      resendAvailableAt: addSeconds_(now, cooldown).toISOString(),
      emailSent: Boolean(emailResult && emailResult.sent)
    };
  } finally {
    lock.releaseLock();
  }
}

function verifyTravelLeadEmail_(p) {
  const raw = p && p.payload && typeof p.payload === 'object' ? p.payload : (p || {});
  const leadId = clean_(raw.leadId);
  const email = cleanEmail_(raw.email);
  const code = String(raw.code || '').replace(/\D/g, '').slice(0, 6);

  if (!leadId || !isValidEmail_(email) || !/^\d{6}$/.test(code)) {
    return { ok: false, errorCode: 'INVALID_REQUEST', error: 'Ingresa un código válido de 6 dígitos.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let verifiedRow = null;
  let shouldNotify = false;
  let shouldTrackLead = false;
  try {
    const item = findTravelLeadById_(leadId);
    if (!item || cleanEmail_(item.row.Email) !== email) {
      return { ok: false, errorCode: 'LEAD_NOT_FOUND', error: 'No encontramos la solicitud pendiente.' };
    }

    const row = item.row;
    const alreadyVerified = normalizeText_(row.Estado) === 'verified' || boolean_(row.EmailVerificado, false);

    if (alreadyVerified) {
      verifiedRow = row;
      shouldNotify = !clean_(row.NotificacionInternaEn);
    } else {
      const maxAttempts = Math.max(3, Math.floor(number_(getProp_('LEAD_MAX_VERIFY_ATTEMPTS', '8'), 8)));
      const attempts = Math.max(0, Math.floor(number_(row.IntentosVerificacion, 0)));
      if (attempts >= maxAttempts) {
        return {
          ok: false,
          errorCode: 'TOO_MANY_ATTEMPTS',
          error: 'Se alcanzó el límite de intentos. Solicita un nuevo código.'
        };
      }

      const now = new Date();
      const expiry = parseDate_(row.CodigoExpira);
      if (!expiry || expiry.getTime() < now.getTime()) {
        return {
          ok: false,
          errorCode: 'CODE_EXPIRED',
          error: 'El código expiró. Solicita uno nuevo.',
          canResend: true
        };
      }

      const expected = clean_(row.CodigoVerificacion);
      const actual = hashTravelLeadVerificationCode_(leadId, email, code);
      if (!expected || !constantTimeEquals_(expected, actual)) {
        updateRowFields_(item, {
          FechaActualizacion: now,
          IntentosVerificacion: attempts + 1
        });
        return {
          ok: false,
          errorCode: 'INVALID_CODE',
          error: 'El código no es correcto. Revisa los 6 dígitos e inténtalo nuevamente.',
          attemptsRemaining: Math.max(0, maxAttempts - attempts - 1)
        };
      }

      updateRowFields_(item, {
        FechaActualizacion: now,
        Estado: 'VERIFIED',
        EmailVerificado: true,
        CodigoVerificacion: '',
        CodigoExpira: '',
        FechaVerificacion: now,
        IntentosVerificacion: attempts + 1
      });

      const updated = findTravelLeadById_(leadId);
      verifiedRow = updated ? updated.row : Object.assign({}, row, {
        Estado: 'VERIFIED',
        EmailVerificado: true,
        FechaVerificacion: now
      });
      shouldNotify = !clean_(verifiedRow.NotificacionInternaEn);
      shouldTrackLead = true;
    }
  } finally {
    lock.releaseLock();
  }

  // El beneficio se crea únicamente después de verificar el correo.
  // La función es idempotente: un mismo email no recibe múltiples cupones
  // permanentes por completar nuevamente este planificador.
  if (verifiedRow) {
    try {
      ensureTravelLeadRewardCoupon_(verifiedRow);
      const refreshedWithCoupon = findTravelLeadById_(leadId);
      if (refreshedWithCoupon) verifiedRow = refreshedWithCoupon.row;
    } catch (rewardError) {
      // La verificación del prospecto no debe fallar si el beneficio no pudo
      // generarse o enviarse. Se registra para revisión administrativa.
      logAudit_('TRAVEL_LEAD_REWARD_ERROR', leadId, getErrorMessage_(rewardError), { email: email });
    }
  }

  if (verifiedRow && shouldNotify) {
    const notification = sendTravelLeadInternalNotification_(verifiedRow);
    if (notification && notification.sent) {
      const latest = findTravelLeadById_(leadId);
      if (latest) updateRowFields_(latest, { NotificacionInternaEn: new Date(), FechaActualizacion: new Date() });
    }
  }

  logAudit_('verifyTravelLeadEmail', leadId, 'Prospecto verificado correctamente', {
    email: email,
    source: verifiedRow && verifiedRow.OrigenLead || '',
    rewardCoupon: verifiedRow && verifiedRow.CodigoCuponBeneficio || ''
  });

  return buildTravelLeadVerifiedResponse_(verifiedRow, shouldTrackLead);
}

function validateTravelLeadPayload_(raw) {
  const lead = {
    clientRequestId: truncate_(clean_(raw.clientRequestId || Utilities.getUuid()), 100),
    locale: normalizeLocale_(raw.locale || 'es'),
    name: truncate_(clean_(raw.name), 60),
    lastName: truncate_(clean_(raw.lastName), 60),
    email: cleanEmail_(raw.email),
    whatsapp: normalizeTravelLeadPhone_(raw.whatsapp),
    phoneCountry: truncate_(clean_(raw.phoneCountry).toUpperCase(), 3),
    phoneDialCode: truncate_(clean_(raw.phoneDialCode), 8),
    adults: Math.floor(number_(raw.adults, 0)),
    children: Math.floor(number_(raw.children, 0)),
    childAges: Array.isArray(raw.childAges) ? raw.childAges.slice(0, 20).map(function(v) { return Math.floor(number_(v, -1)); }) : [],
    dateStatus: clean_(raw.dateStatus),
    startDate: normalizeLeadDate_(raw.startDate),
    endDate: normalizeLeadDate_(raw.endDate),
    estimatedMonth: truncate_(clean_(raw.estimatedMonth), 7),
    estimatedMonthLabel: truncate_(clean_(raw.estimatedMonthLabel), 40),
    estimatedWeek: clean_(raw.estimatedWeek),
    duration: truncate_(clean_(raw.duration), 12),
    flightStatus: clean_(raw.flightStatus),
    travelOrigin: truncate_(clean_(raw.travelOrigin), 100),
    serviceType: clean_(raw.serviceType),
    destinations: sanitizeLeadArray_(raw.destinations, 15),
    otherDestination: truncate_(clean_(raw.otherDestination), 120),
    scope: clean_(raw.scope),
    scopeExtras: sanitizeLeadArray_(raw.scopeExtras, 10),
    comments: truncate_(clean_(raw.comments), 1000),
    originLead: truncate_(clean_(raw.originLead || 'WEB').toUpperCase(), 30),
    campaignCountry: truncate_(clean_(raw.campaignCountry).toUpperCase(), 5),
    campaignParam: truncate_(clean_(raw.campaignParam), 120),
    utmSource: truncate_(clean_(raw.utmSource), 180),
    utmMedium: truncate_(clean_(raw.utmMedium), 180),
    utmCampaign: truncate_(clean_(raw.utmCampaign), 220),
    utmContent: truncate_(clean_(raw.utmContent), 220),
    utmTerm: truncate_(clean_(raw.utmTerm), 220),
    fbclid: truncate_(clean_(raw.fbclid), 300),
    pageOrigin: truncate_(clean_(raw.pageOrigin), 500),
    referrer: truncate_(clean_(raw.referrer), 500)
  };

  if (lead.name.length < 2) throw new Error('Nombre requerido.');
  if (lead.lastName.length < 2) throw new Error('Apellido requerido.');
  if (!isValidEmail_(lead.email)) throw new Error('Correo electrónico inválido.');
  if (!isValidPhone_(lead.whatsapp)) throw new Error('WhatsApp inválido.');
  if (lead.adults < 1 || lead.adults > 20) throw new Error('La cantidad de adultos no es válida.');
  if (lead.children < 0 || lead.children > 20) throw new Error('La cantidad de niños no es válida.');
  if (lead.children !== lead.childAges.length) throw new Error('Completa la edad de cada niño.');
  if (lead.childAges.some(function(age) { return age < 0 || age > 17; })) throw new Error('La edad de los niños debe estar entre 0 y 17 años.');

  const allowedDateStatuses = ['exact','approximate','planning'];
  if (allowedDateStatuses.indexOf(lead.dateStatus) < 0) throw new Error('Indica el estado de tus fechas.');

  if (lead.dateStatus === 'exact') {
    if (!lead.startDate || !lead.endDate) throw new Error('Completa la fecha de llegada y salida.');
    const days = calculateInclusiveDays_(lead.startDate, lead.endDate);
    if (days <= 0) throw new Error('La fecha de salida debe ser igual o posterior a la llegada.');
    lead.duration = String(days);
    lead.estimatedMonth = '';
    lead.estimatedMonthLabel = '';
    lead.estimatedWeek = '';
  } else {
    if (!/^\d{4}-\d{2}$/.test(lead.estimatedMonth)) throw new Error('Selecciona un mes y año aproximados.');
    if (lead.dateStatus === 'approximate' && ['first','second','third','fourth','flexible'].indexOf(lead.estimatedWeek) < 0) {
      throw new Error('Selecciona una semana aproximada.');
    }
    if (['3-4','5','6','7','8-10','11+','unknown'].indexOf(lead.duration) < 0) {
      throw new Error('Selecciona una duración aproximada.');
    }
    lead.startDate = '';
    lead.endDate = '';
  }

  if (lead.dateStatus === 'planning') {
    lead.flightStatus = 'planning';
    lead.travelOrigin = '';
  } else if (['purchased','dates_no_ticket','planning'].indexOf(lead.flightStatus) < 0) {
    throw new Error('Indica el estado de tus vuelos.');
  }
  if (['tours','tours_hotel','tours_hotel_transfers','complete','unsure'].indexOf(lead.serviceType) < 0) throw new Error('Selecciona el tipo de servicio.');

  const allowedDestinations = ['machu_picchu','cusco','sacred_valley','rainbow_mountain','humantay','lima','paracas_ica','arequipa','puno','amazon','other','recommend'];
  lead.destinations = lead.destinations.filter(function(value) { return allowedDestinations.indexOf(value) >= 0; });
  if (!lead.destinations.length) throw new Error('Selecciona al menos un destino o solicita una recomendación.');

  // El alcance dejó de ser una pregunta obligatoria en la versión compacta.
  // Se conserva compatibilidad con formularios anteriores que todavía lo envíen.
  const allowedScopes = ['cusco_machu','cusco_lima','cusco_others','recommend'];
  if (lead.scope && allowedScopes.indexOf(lead.scope) < 0) lead.scope = '';
  if (lead.scope === 'cusco_others') {
    const allowedScopeExtras = ['arequipa','puno','paracas_ica','amazon','other'];
    lead.scopeExtras = lead.scopeExtras.filter(function(value) { return allowedScopeExtras.indexOf(value) >= 0; });
  } else {
    lead.scopeExtras = [];
  }

  return lead;
}

function appendTravelLeadRow_(rowObject) {
  const sh = getSheet_(SHEETS.LEADS_WEB, HEADERS.LEADS_WEB);
  ensureHeaders_(sh, HEADERS.LEADS_WEB);
  const values = HEADERS.LEADS_WEB.map(function(header) {
    const value = rowObject[header];
    return value == null ? '' : value;
  });
  sh.appendRow(values);
}

function findTravelLeadById_(leadId) {
  const normalized = clean_(leadId);
  if (!normalized) return null;
  return readRows_(SHEETS.LEADS_WEB, HEADERS.LEADS_WEB).find(function(item) {
    return clean_(item.row.ID) === normalized;
  }) || null;
}

function findTravelLeadByClientRequestId_(clientRequestId) {
  const normalized = clean_(clientRequestId);
  if (!normalized) return null;
  return readRows_(SHEETS.LEADS_WEB, HEADERS.LEADS_WEB).find(function(item) {
    return clean_(item.row.ClientRequestID) === normalized;
  }) || null;
}

function enforceTravelLeadCreateRateLimit_(email, whatsapp) {
  const windowMinutes = Math.max(5, number_(getProp_('LEAD_CREATE_WINDOW_MINUTES', '15'), 15));
  const maxCreates = Math.max(1, Math.floor(number_(getProp_('LEAD_CREATE_MAX_PER_WINDOW', '3'), 3)));
  const threshold = Date.now() - windowMinutes * 60 * 1000;
  const normalizedEmail = cleanEmail_(email);
  const normalizedPhone = String(whatsapp || '').replace(/\D/g, '');

  const recent = readRows_(SHEETS.LEADS_WEB, HEADERS.LEADS_WEB).filter(function(item) {
    const created = parseDate_(item.row.FechaRegistro);
    if (!created || created.getTime() < threshold) return false;
    const sameEmail = cleanEmail_(item.row.Email) === normalizedEmail;
    const samePhone = String(item.row.WhatsApp || '').replace(/\D/g, '') === normalizedPhone;
    return sameEmail || samePhone;
  }).length;

  if (recent >= maxCreates) {
    throw new Error('Has realizado varias solicitudes en poco tiempo. Espera unos minutos antes de intentarlo nuevamente.');
  }
}

function generateUniqueTravelLeadId_() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      Utilities.getUuid() + '|' + new Date().getTime() + '|' + attempt
    );
    let value = 0;
    for (let i = 0; i < 4; i++) value = (value * 256 + (bytes[i] & 0xff)) >>> 0;
    const numeric = 100000 + (value % 900000);
    const id = 'MCT-LEAD-' + numeric;
    if (!findTravelLeadById_(id)) return id;
  }
  throw new Error('No se pudo generar un ID único para la solicitud.');
}

function generateTravelLeadVerificationCode_() {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + '|' + new Date().getTime() + '|' + Math.random()
  );
  let value = 0;
  for (let i = 0; i < 4; i++) value = (value * 256 + (bytes[i] & 0xff)) >>> 0;
  return String(100000 + (value % 900000));
}

function hashTravelLeadVerificationCode_(leadId, email, code) {
  const pepper = ensureTravelLeadPepper_();
  const material = [clean_(leadId), cleanEmail_(email), String(code || ''), pepper].join('|');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, material, Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function ensureTravelLeadPepper_() {
  const props = PropertiesService.getScriptProperties();
  let pepper = clean_(props.getProperty('LEAD_VERIFICATION_PEPPER'));
  if (!pepper) {
    pepper = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('LEAD_VERIFICATION_PEPPER', pepper);
  }
  return pepper;
}

function constantTimeEquals_(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

function sendTravelLeadVerificationEmail_(row, code) {
  const email = cleanEmail_(row.Email || row.email);
  if (!isValidEmail_(email)) return { sent: false, error: 'Correo inválido.' };

  const name = clean_(row.Nombre || row.name || 'viajero');
  const sender = getCouponSenderConfig_();
  const logoBlob = fetchCouponLogoBlob_();
  const planUrl = getProp_('LEAD_PLAN_URL', 'https://mycuscotrip.com/planifica-tu-viaje.html');
  const subject = 'Confirma los datos de tu viaje | My Cusco Trip';
  const logoHtml = logoBlob
    ? '<img src="cid:mctLogo" width="190" alt="My Cusco Trip" style="display:block;width:190px;max-width:72%;height:auto;margin:0 auto 15px;border:0;background:transparent">'
    : '<div style="font-size:21px;font-weight:800;color:#fff;margin-bottom:12px">My Cusco Trip</div>';

  const safeName = escapeHtml_(name);
  const safeCode = escapeHtml_(code);
  const safePlanUrl = escapeHtml_(planUrl);
  const htmlBody = [
    '<!doctype html><html><body style="margin:0;padding:0;background:#f2f6f3;font-family:Arial,Helvetica,sans-serif;color:#25322d">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f6f3;padding:24px 10px"><tr><td align="center">',
    '<table role="presentation" width="620" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:#fff;border-radius:20px;overflow:hidden">',
    '<tr><td align="center" style="background:#0a3a26;padding:28px 24px;color:#fff">',
    logoHtml,
    '<h1 style="margin:0;color:#fff;font-size:26px;line-height:1.2">Confirma los datos de tu viaje</h1>',
    '</td></tr>',
    '<tr><td style="padding:28px 26px">',
    '<p style="margin:0 0 15px;font-size:16px;line-height:1.65">Hola ' + safeName + ',</p>',
    '<p style="margin:0 0 20px;font-size:16px;line-height:1.65">Gracias por confiar en My Cusco Trip para ayudarte a planificar tu próximo viaje a Perú.</p>',
    '<p style="margin:0 0 12px;text-align:center;color:#61716a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.7px">Tu código de verificación es</p>',
    '<div style="margin:0 auto 20px;max-width:310px;padding:17px 18px;border-radius:16px;background:#eef6f1;border:1px solid #d7e8de;text-align:center;color:#0a3a26;font-size:34px;line-height:1;font-weight:800;letter-spacing:8px">' + safeCode + '</div>',
    '<p style="margin:0 0 18px;text-align:center;font-size:15px;line-height:1.6;color:#4b5b54">Este código estará disponible durante <strong>10 minutos</strong>.</p>',
    '<p style="margin:0 0 22px;font-size:14px;line-height:1.65;color:#6b7772">Si no solicitaste esta propuesta, puedes ignorar este correo.</p>',
    '<p style="margin:0;text-align:center"><a href="' + safePlanUrl + '" style="display:inline-block;background:#0a3a26;color:#fff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:12px">Volver a My Cusco Trip</a></p>',
    '</td></tr>',
    '<tr><td align="center" style="background:#eef3ef;padding:18px 22px;color:#68766f;font-size:12px;line-height:1.5">My Cusco Trip · WhatsApp +51 900 608 980</td></tr>',
    '</table></td></tr></table></body></html>'
  ].join('');

  const plainBody = [
    'Hola ' + name + ',',
    '',
    'Gracias por confiar en My Cusco Trip para ayudarte a planificar tu próximo viaje a Perú.',
    '',
    'Tu código de verificación es: ' + code,
    '',
    'Este código estará disponible durante 10 minutos.',
    '',
    'My Cusco Trip',
    'WhatsApp +51 900 608 980'
  ].join('\n');

  const options = {
    htmlBody: htmlBody,
    name: sender.name,
    replyTo: sender.replyTo
  };
  if (sender.canUseAlias) options.from = sender.senderEmail;
  if (logoBlob) options.inlineImages = { mctLogo: logoBlob };

  try {
    GmailApp.sendEmail(email, subject, plainBody, options);
    return { sent: true, fromAlias: sender.canUseAlias, logoEmbedded: Boolean(logoBlob) };
  } catch (gmailError) {
    try {
      const fallback = {
        to: email,
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody,
        name: sender.name,
        replyTo: sender.replyTo
      };
      if (logoBlob) fallback.inlineImages = { mctLogo: logoBlob };
      MailApp.sendEmail(fallback);
      return { sent: true, fallback: true, fromAlias: false, logoEmbedded: Boolean(logoBlob) };
    } catch (fallbackError) {
      logAudit_('TRAVEL_LEAD_EMAIL_ERROR', clean_(row.ID), getErrorMessage_(fallbackError), {
        email: email,
        gmailError: getErrorMessage_(gmailError)
      });
      return { sent: false, error: getErrorMessage_(fallbackError) };
    }
  }
}

/**
 * Genera o reutiliza el beneficio del planificador: 10% permanente y un solo uso.
 * Se entrega solo tras verificar el email y nunca crea más de un beneficio por correo.
 */
function ensureTravelLeadRewardCoupon_(row) {
  if (!boolean_(getProp_('LEAD_REWARD_COUPON_ENABLED', 'true'), true)) {
    return { ok: true, enabled: false };
  }

  const leadId = clean_(row && row.ID);
  const email = cleanEmail_(row && row.Email);
  if (!leadId || !isValidEmail_(email)) return { ok: false, error: 'Lead o correo inválido para beneficio.' };

  const percent = Math.max(1, Math.min(100, number_(getProp_('LEAD_REWARD_COUPON_PERCENT', '10'), 10)));
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let couponCode = '';
  let created = false;
  let available = false;
  let alreadyRedeemed = false;
  try {
    const leadItem = findTravelLeadById_(leadId);
    if (!leadItem) return { ok: false, error: 'No se encontró el lead verificado.' };

    const linkedCode = normalizeCode_(leadItem.row.CodigoCuponBeneficio || '');
    let coupon = linkedCode ? findCoupon_(linkedCode) : null;
    if (!coupon) coupon = findTravelLeadRewardCouponByEmail_(email);

    if (coupon) {
      couponCode = normalizeCode_(coupon.row.CodigoCupon);
      const status = normalizeText_(coupon.row.Estado);
      const uses = Math.max(0, Math.floor(number_(coupon.row.Usos, 0)));
      const active = coupon.row.Activo === '' || coupon.row.Activo == null ? true : boolean_(coupon.row.Activo, true);
      alreadyRedeemed = uses >= 1 || status.indexOf('canje') >= 0 || status.indexOf('usado') >= 0;
      available = active && !alreadyRedeemed;
    } else {
      const payload = parseJsonSafe_(leadItem.row.JSON, {});
      couponCode = generateUniqueCouponCode_();
      const record = {
        couponCode: couponCode,
        status: 'Vigente',
        type: 'percent',
        value: percent,
        currency: 'USD',
        active: true,
        startsAt: new Date().toISOString(),
        expiresAt: '',
        maxUses: 1,
        uses: 0,
        name: [clean_(leadItem.row.Nombre), clean_(leadItem.row.Apellido)].filter(Boolean).join(' ').trim(),
        whatsapp: clean_(leadItem.row.WhatsApp),
        email: email,
        page: clean_(leadItem.row.PaginaOrigen || getProp_('LEAD_PLAN_URL', 'https://mycuscotrip.com/planifica-tu-viaje.html')),
        locale: normalizeLocale_(payload.locale || 'es'),
        source: 'trip_planner_verified',
        createdAt: new Date().toISOString(),
        notes: 'Cupón beneficio por prospecto verificado. 10% permanente, personal y de un solo uso. Lead: ' + leadId
      };
      appendCouponRecord_(record);
      created = true;
      available = true;
    }

    updateRowFields_(leadItem, {
      CodigoCuponBeneficio: couponCode,
      FechaActualizacion: new Date()
    });
  } finally {
    lock.releaseLock();
  }

  let emailSent = hasTravelLeadRewardCouponBeenSent_(email, couponCode);
  if (available && !emailSent) {
    const refreshed = findTravelLeadById_(leadId);
    const emailResult = sendTravelLeadRewardCouponEmail_(refreshed ? refreshed.row : row, couponCode, percent);
    emailSent = Boolean(emailResult && emailResult.sent);
    if (emailSent) {
      const latest = findTravelLeadById_(leadId);
      if (latest) updateRowFields_(latest, { CuponBeneficioEnviadoEn: new Date(), FechaActualizacion: new Date() });
    }
  }

  return {
    ok: true,
    enabled: true,
    couponCode: available ? couponCode : '',
    percent: percent,
    created: created,
    available: available,
    alreadyRedeemed: alreadyRedeemed,
    emailSent: emailSent
  };
}

function findTravelLeadRewardCouponByEmail_(email) {
  const normalized = cleanEmail_(email);
  if (!normalized) return null;
  const matches = readRows_(SHEETS.COUPONS, HEADERS.Cupones).filter(function(item) {
    const source = normalizeText_(item.row.Fuente);
    const linkedEmail = cleanEmail_(item.row.CorreoVinculado || item.row.Correo || '');
    return source === 'trip_planner_verified' && linkedEmail === normalized;
  });
  return matches.length ? matches[matches.length - 1] : null;
}

function hasTravelLeadRewardCouponBeenSent_(email, couponCode) {
  const normalizedEmail = cleanEmail_(email);
  const normalizedCode = normalizeCode_(couponCode);
  if (!normalizedEmail || !normalizedCode) return false;
  return readRows_(SHEETS.LEADS_WEB, HEADERS.LEADS_WEB).some(function(item) {
    return cleanEmail_(item.row.Email) === normalizedEmail &&
      normalizeCode_(item.row.CodigoCuponBeneficio) === normalizedCode &&
      Boolean(parseDate_(item.row.CuponBeneficioEnviadoEn));
  });
}

function sendTravelLeadRewardCouponEmail_(row, couponCode, percent) {
  const email = cleanEmail_(row && row.Email);
  if (!isValidEmail_(email) || !couponCode) return { sent: false, error: 'Datos de cupón incompletos.' };

  const payload = parseJsonSafe_(row.JSON, {});
  const locale = normalizeLocale_(payload.locale || 'es');
  const name = clean_(row.Nombre || 'viajero');
  const ctaUrl = getProp_('LEAD_REWARD_COUPON_URL', 'https://mycuscotrip.com/go');
  const sender = getCouponSenderConfig_();
  const logoBlob = fetchCouponLogoBlob_();
  const copy = travelLeadRewardCouponCopy_(locale, percent);
  const logoHtml = logoBlob
    ? '<img src="cid:mctLogo" width="190" alt="My Cusco Trip" style="display:block;width:190px;max-width:72%;height:auto;margin:0 auto 15px;border:0;background:transparent">'
    : '<div style="font-size:21px;font-weight:800;color:#fff;margin-bottom:12px">My Cusco Trip</div>';

  const htmlBody = [
    '<!doctype html><html><body style="margin:0;padding:0;background:#f2f6f3;font-family:Arial,Helvetica,sans-serif;color:#25322d">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f6f3;padding:24px 10px"><tr><td align="center">',
    '<table role="presentation" width="620" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:#fff;border-radius:20px;overflow:hidden">',
    '<tr><td align="center" style="background:#0a3a26;padding:28px 24px;color:#fff">',
    logoHtml,
    '<h1 style="margin:0;color:#fff;font-size:26px;line-height:1.2">' + escapeHtml_(copy.title) + '</h1>',
    '</td></tr>',
    '<tr><td style="padding:28px 26px">',
    '<p style="margin:0 0 16px;font-size:16px;line-height:1.65">' + escapeHtml_(copy.hello.replace('{name}', name)) + '</p>',
    '<p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#4b5b54">' + escapeHtml_(copy.intro) + '</p>',
    '<div style="padding:18px;border-radius:16px;background:#eef6f1;border:1px solid #d7e8de;text-align:center">',
    '<div style="font-size:12px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:#547063;margin-bottom:7px">' + escapeHtml_(copy.codeLabel) + '</div>',
    '<div style="font-size:27px;font-weight:800;color:#0a3a26;letter-spacing:1.2px">' + escapeHtml_(couponCode) + '</div>',
    '</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0 22px"><tr>',
    '<td width="50%" style="padding-right:6px"><div style="padding:14px 10px;background:#0a3a26;border-radius:14px;text-align:center;color:#fff"><div style="font-size:11px;text-transform:uppercase;color:#cfe3d7;margin-bottom:5px">' + escapeHtml_(copy.discountLabel) + '</div><strong style="font-size:21px">' + escapeHtml_(String(percent)) + '%</strong></div></td>',
    '<td width="50%" style="padding-left:6px"><div style="padding:14px 10px;background:#f7f2df;border:1px solid #eadcae;border-radius:14px;text-align:center;color:#5f4b18"><div style="font-size:11px;text-transform:uppercase;color:#806b32;margin-bottom:5px">' + escapeHtml_(copy.validityLabel) + '</div><strong style="font-size:15px">' + escapeHtml_(copy.validity) + '</strong></div></td>',
    '</tr></table>',
    '<p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#4b5b54">' + escapeHtml_(copy.use) + '</p>',
    '<p style="margin:0;text-align:center"><a href="' + escapeHtml_(ctaUrl) + '" style="display:inline-block;background:#0a3a26;color:#fff;text-decoration:none;font-weight:800;padding:15px 23px;border-radius:12px">' + escapeHtml_(copy.cta) + '</a></p>',
    '</td></tr>',
    '<tr><td align="center" style="background:#eef3ef;padding:18px 22px;color:#68766f;font-size:12px;line-height:1.5">My Cusco Trip · WhatsApp +51 900 608 980</td></tr>',
    '</table></td></tr></table></body></html>'
  ].join('');

  const plainBody = [
    copy.title,
    '',
    copy.hello.replace('{name}', name),
    copy.intro,
    '',
    copy.codeLabel + ': ' + couponCode,
    copy.discountLabel + ': ' + percent + '%',
    copy.validityLabel + ': ' + copy.validity,
    '',
    copy.use,
    ctaUrl
  ].join('\n');

  const options = { htmlBody: htmlBody, name: sender.name, replyTo: sender.replyTo };
  if (sender.canUseAlias) options.from = sender.senderEmail;
  if (logoBlob) options.inlineImages = { mctLogo: logoBlob };

  try {
    GmailApp.sendEmail(email, copy.subject, plainBody, options);
    return { sent: true, fromAlias: sender.canUseAlias };
  } catch (gmailError) {
    try {
      const fallback = { to: email, subject: copy.subject, body: plainBody, htmlBody: htmlBody, name: sender.name, replyTo: sender.replyTo };
      if (logoBlob) fallback.inlineImages = { mctLogo: logoBlob };
      MailApp.sendEmail(fallback);
      return { sent: true, fallback: true };
    } catch (fallbackError) {
      logAudit_('TRAVEL_LEAD_REWARD_EMAIL_ERROR', clean_(row.ID), getErrorMessage_(fallbackError), {
        email: email,
        couponCode: couponCode,
        gmailError: getErrorMessage_(gmailError)
      });
      return { sent: false, error: getErrorMessage_(fallbackError) };
    }
  }
}

function travelLeadRewardCouponCopy_(locale, percent) {
  const lang = normalizeLocale_(locale);
  const copies = {
    es: {
      subject: 'Tu cupón del ' + percent + '% está listo | My Cusco Trip',
      title: '¡Tu beneficio está listo!',
      hello: 'Hola {name},',
      intro: 'Gracias por completar y verificar los datos de tu viaje. Te dejamos un beneficio personal para tu próxima reserva con My Cusco Trip.',
      codeLabel: 'Tu código', discountLabel: 'Descuento', validityLabel: 'Vigencia', validity: 'Sin vencimiento · 1 uso',
      use: 'Guarda este código. Podrás aplicarlo en el campo de cupón al momento de reservar. Los cupones no son acumulables entre sí.',
      cta: 'Ver opciones de viaje'
    },
    en: {
      subject: 'Your ' + percent + '% coupon is ready | My Cusco Trip',
      title: 'Your benefit is ready!',
      hello: 'Hello {name},',
      intro: 'Thank you for completing and verifying your trip details. Here is a personal benefit for your next My Cusco Trip booking.',
      codeLabel: 'Your code', discountLabel: 'Discount', validityLabel: 'Validity', validity: 'No expiration · 1 use',
      use: 'Keep this code and enter it in the coupon field when booking. Coupons cannot be combined.',
      cta: 'See travel options'
    },
    pt: {
      subject: 'Seu cupom de ' + percent + '% está pronto | My Cusco Trip',
      title: 'Seu benefício está pronto!',
      hello: 'Olá {name},',
      intro: 'Obrigado por preencher e verificar os dados da sua viagem. Aqui está um benefício pessoal para sua próxima reserva com a My Cusco Trip.',
      codeLabel: 'Seu código', discountLabel: 'Desconto', validityLabel: 'Validade', validity: 'Sem vencimento · 1 uso',
      use: 'Guarde este código e use-o no campo de cupom ao reservar. Os cupons não são cumulativos.',
      cta: 'Ver opções de viagem'
    }
  };
  return copies[lang] || copies.es;
}

function sendTravelLeadInternalNotification_(row) {
  const to = cleanEmail_(getProp_('LEAD_NOTIFICATION_EMAIL', 'reservas@mycuscotrip.com'));
  if (!isValidEmail_(to)) return { sent: false, error: 'LEAD_NOTIFICATION_EMAIL inválido.' };

  const name = [clean_(row.Nombre), clean_(row.Apellido)].filter(Boolean).join(' ').trim();
  const when = clean_(row.FechaInicio) || clean_(row.MesEstimado) || 'Por definir';
  const subject = 'Nuevo prospecto verificado | ' + (name || 'Sin nombre') + ' | ' + when;
  const phoneDigits = String(row.WhatsApp || '').replace(/\D/g, '');
  const waUrl = phoneDigits ? 'https://wa.me/' + phoneDigits : 'https://wa.me/51900608980';

  const passengers = [
    number_(row.Adultos, 0) + ' adulto(s)',
    number_(row.Ninos, 0) > 0 ? number_(row.Ninos, 0) + ' niño(s)' : ''
  ].filter(Boolean).join(' · ');

  const rows = [
    ['Nombre', name],
    ['WhatsApp', clean_(row.WhatsApp)],
    ['Email', clean_(row.Email)],
    ['Pasajeros', passengers],
    ['Fechas', row.FechaInicio ? (clean_(row.FechaInicio) + ' → ' + clean_(row.FechaFin)) : clean_(row.MesEstimado) + (row.SemanaEstimada ? ' · ' + clean_(row.SemanaEstimada) : '')],
    ['Duración', clean_(row.DuracionDias)],
    ['Vuelos', clean_(row.EstadoVuelos)],
    ['Servicio solicitado', clean_(row.TipoServicio)],
    ['Destinos', clean_(row.Destinos)],
    ['Alcance', clean_(row.AlcanceViaje)],
    ['Comentarios', clean_(row.Comentarios) || 'Sin comentarios'],
    ['Cupón beneficio', clean_(row.CodigoCuponBeneficio)],
    ['Origen lead', clean_(row.OrigenLead)],
    ['Campaña', clean_(row.UTMCampaign || row.CampanaParametro)]
  ].filter(function(pair) { return clean_(pair[1]); });

  const htmlRows = rows.map(function(pair) {
    return '<tr><td style="padding:8px 10px;border-bottom:1px solid #e5ece8;color:#6b7772;font-size:13px;width:34%">' + escapeHtml_(pair[0]) + '</td><td style="padding:8px 10px;border-bottom:1px solid #e5ece8;color:#17372a;font-size:14px;font-weight:700">' + escapeHtml_(pair[1]) + '</td></tr>';
  }).join('');

  const htmlBody = [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#25322d;max-width:680px;margin:auto">',
    '<div style="background:#0a3a26;color:#fff;padding:22px 24px;border-radius:18px 18px 0 0"><h2 style="margin:0;color:#fff">Nuevo prospecto verificado</h2><p style="margin:7px 0 0;color:#dbeadf">' + escapeHtml_(row.ID) + '</p></div>',
    '<div style="border:1px solid #dbe5df;border-top:0;padding:18px 18px 24px;border-radius:0 0 18px 18px;background:#fff">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">' + htmlRows + '</table>',
    '<p style="text-align:center;margin:22px 0 0"><a href="' + escapeHtml_(waUrl) + '" style="display:inline-block;background:#0a3a26;color:#fff;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:12px">Contactar por WhatsApp</a></p>',
    '</div></div>'
  ].join('');

  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: rows.map(function(pair) { return pair[0] + ': ' + pair[1]; }).join('\n'),
      htmlBody: htmlBody,
      name: 'My Cusco Trip'
    });
    return { sent: true };
  } catch (err) {
    logAudit_('TRAVEL_LEAD_INTERNAL_EMAIL_ERROR', clean_(row.ID), getErrorMessage_(err), { to: to });
    return { sent: false, error: getErrorMessage_(err) };
  }
}

function buildTravelLeadVerifiedResponse_(row, shouldTrackLead) {
  const totalTravelers = Math.max(0, number_(row.Adultos, 0)) + Math.max(0, number_(row.Ninos, 0));
  const name = clean_(row.Nombre);
  const when = clean_(row.FechaInicio) || clean_(row.MesEstimado) || 'fecha por definir';
  const message = 'Hola, soy ' + name + '. Ya completé los datos de mi viaje en My Cusco Trip. Somos ' +
    totalTravelers + ' ' + (totalTravelers === 1 ? 'viajero' : 'viajeros') + ' y estamos planificando viajar en ' + when + '.';

  const linkedRewardCode = normalizeCode_(row.CodigoCuponBeneficio || '');
  const rewardCoupon = linkedRewardCode ? findCoupon_(linkedRewardCode) : null;
  let rewardAvailable = false;
  if (rewardCoupon) {
    const status = normalizeText_(rewardCoupon.row.Estado);
    const uses = Math.max(0, Math.floor(number_(rewardCoupon.row.Usos, 0)));
    const maxUses = Math.max(0, Math.floor(number_(rewardCoupon.row.MaxUsos, 1)));
    const active = rewardCoupon.row.Activo === '' || rewardCoupon.row.Activo == null ? true : boolean_(rewardCoupon.row.Activo, true);
    rewardAvailable = active && status.indexOf('canje') < 0 && status.indexOf('usado') < 0 && (maxUses <= 0 || uses < maxUses);
  }

  return {
    ok: true,
    verified: true,
    leadId: clean_(row.ID),
    status: 'VERIFIED',
    name: name,
    totalTravelers: totalTravelers,
    travelWhen: when,
    whatsappUrl: 'https://wa.me/51900608980?text=' + encodeURIComponent(message),
    rewardCouponCode: rewardAvailable ? linkedRewardCode : '',
    rewardCouponPercent: number_(getProp_('LEAD_REWARD_COUPON_PERCENT', '10'), 10),
    rewardCouponPermanent: true,
    rewardCouponSingleUse: true,
    rewardCouponAvailable: rewardAvailable,
    shouldTrackLead: Boolean(shouldTrackLead),
    metaEventId: 'MCT-TRIP-' + clean_(row.ID)
  };
}

function travelLeadLabel_(kind, value) {
  const maps = {
    dateStatus: {
      exact: 'Fechas definidas',
      approximate: 'Fecha aproximada',
      planning: 'Todavía planificando'
    },
    week: {
      first: 'Primera semana',
      second: 'Segunda semana',
      third: 'Tercera semana',
      fourth: 'Cuarta semana',
      flexible: 'Última semana / flexible'
    },
    flightStatus: {
      purchased: 'Vuelos comprados',
      dates_no_ticket: 'Tiene fechas, vuelos aún no comprados',
      planning: 'Todavía planificando vuelos'
    },
    serviceType: {
      tours: 'Solo tours y experiencias',
      tours_hotel: 'Tours + alojamiento',
      tours_hotel_transfers: 'Tours + alojamiento + traslados',
      complete: 'Viaje completo',
      unsure: 'Todavía no está seguro/a'
    },
    scope: {
      cusco_machu: 'Solo Cusco + Machu Picchu',
      cusco_lima: 'Cusco + Lima',
      cusco_others: 'Cusco + otros destinos',
      recommend: 'Quiere una recomendación'
    },
    destination: {
      machu_picchu: 'Machu Picchu',
      cusco: 'Cusco',
      sacred_valley: 'Valle Sagrado',
      rainbow_mountain: 'Montaña de 7 Colores',
      humantay: 'Laguna Humantay',
      lima: 'Lima',
      paracas_ica: 'Paracas / Ica',
      arequipa: 'Arequipa',
      puno: 'Puno / Lago Titicaca',
      amazon: 'Amazonía',
      other: 'Otros',
      recommend: 'Quiere recomendación'
    }
  };
  return maps[kind] && maps[kind][value] ? maps[kind][value] : clean_(value);
}

function travelLeadDurationLabel_(lead) {
  if (lead.dateStatus === 'exact') {
    const days = calculateInclusiveDays_(lead.startDate, lead.endDate);
    return days > 0 ? days + ' días' : '';
  }
  const labels = {
    '3-4': '3–4 días',
    '5': '5 días',
    '6': '6 días',
    '7': '7 días',
    '8-10': '8–10 días',
    '11+': 'Más de 10 días',
    unknown: 'Todavía no lo sabe'
  };
  return labels[lead.duration] || clean_(lead.duration);
}

function normalizeTravelLeadPhone_(value) {
  const raw = clean_(value);
  const digits = raw.replace(/\D/g, '');
  return digits ? '+' + digits : '';
}

function sanitizeLeadArray_(value, max) {
  if (!Array.isArray(value)) return [];
  const out = [];
  value.slice(0, max || 20).forEach(function(item) {
    const cleaned = truncate_(clean_(item), 80);
    if (cleaned && out.indexOf(cleaned) < 0) out.push(cleaned);
  });
  return out;
}

function normalizeLeadDate_(value) {
  const text = clean_(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function calculateInclusiveDays_(start, end) {
  if (!start || !end) return 0;
  const a = new Date(start + 'T12:00:00');
  const b = new Date(end + 'T12:00:00');
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const diff = Math.floor((b.getTime() - a.getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
}

function addMinutes_(date, minutes) {
  return new Date(date.getTime() + number_(minutes, 0) * 60 * 1000);
}

function addSeconds_(date, seconds) {
  return new Date(date.getTime() + number_(seconds, 0) * 1000);
}

function calculateResendAvailableAt_(lastSent) {
  const date = parseDate_(lastSent);
  if (!date) return '';
  return addSeconds_(date, number_(getProp_('LEAD_RESEND_COOLDOWN_SECONDS', '60'), 60)).toISOString();
}

function toIsoSafe_(value) {
  const date = parseDate_(value);
  return date ? date.toISOString() : '';
}

function maskEmail_(email) {
  const cleanEmail = cleanEmail_(email);
  const parts = cleanEmail.split('@');
  if (parts.length !== 2) return cleanEmail;
  const user = parts[0];
  const visible = user.length <= 2 ? user.slice(0, 1) : user.slice(0, 2);
  return visible + Array(Math.max(3, user.length - visible.length + 1)).join('*') + '@' + parts[1];
}

/**
 * Prueba manual visible en el selector de Apps Script.
 * Requiere LEAD_EMAIL_TEST_TO en Propiedades del script.
 */
function testLeadPlannerEmail() {
  const target = cleanEmail_(getProp_('LEAD_EMAIL_TEST_TO', ''));
  if (!isValidEmail_(target)) throw new Error('Configura LEAD_EMAIL_TEST_TO con un correo válido.');
  const record = {
    ID: 'MCT-LEAD-TEST',
    Nombre: 'Viajero de prueba',
    Email: target
  };
  return sendTravelLeadVerificationEmail_(record, '583921');
}


function createCouponLead_(p) {
  const name = clean_(p.name);
  const whatsapp = clean_(p.whatsapp);
  const email = cleanEmail_(p.email);
  const locale = normalizeLocale_(p.locale || p.language || 'es');

  if (!name || name.length < 2) return { ok: false, error: couponMessage_(locale, 'NAME_REQUIRED') };
  if (!isValidEmail_(email)) return { ok: false, error: couponMessage_(locale, 'EMAIL_INVALID') };
  if (!isValidPhone_(whatsapp)) return { ok: false, error: couponMessage_(locale, 'PHONE_INVALID') };

  const percent = Math.max(0, number_(getProp_('COUPON_PERCENT', '15'), 15));
  const ttlHours = Math.max(1, number_(getProp_('COUPON_TTL_HOURS', '48'), 48));
  const maxUses = Math.max(1, Math.floor(number_(getProp_('COUPON_MAX_USES', '1'), 1)));
  const now = new Date();
  const expiresAt = calculateCouponExpiry_(now, ttlHours);
  const lock = LockService.getScriptLock();

  lock.waitLock(15000);
  try {
    const code = generateUniqueCouponCode_();
    const record = {
      couponCode: code,
      status: 'Vigente',
      type: 'percent',
      value: percent,
      currency: 'USD',
      active: true,
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxUses: maxUses,
      uses: 0,
      name: name,
      whatsapp: whatsapp,
      email: email,
      page: clean_(p.page),
      locale: locale,
      source: clean_(p.source || 'coupon_popup'),
      createdAt: now.toISOString(),
      notes: 'Cupón personal generado automáticamente desde el popup.'
    };

    appendCouponRecord_(record);
    sendCouponEmails_(record);
    logAudit_('createCouponLead', '', 'Cupón generado ' + code, record);

    return {
      ok: true,
      couponCode: code,
      type: record.type,
      value: record.value,
      currency: record.currency,
      discountPercent: percent,
      expiresAt: record.expiresAt,
      message: couponMessage_(locale, 'COUPON_CREATED')
    };
  } finally {
    lock.releaseLock();
  }
}

function validateCoupon_(p) {
  const locale = normalizeLocale_(p.locale || p.language || 'es');
  const code = normalizeCode_(p.couponCode || p.code);
  if (!code) return couponInvalid_(locale, 'COUPON_EMPTY');

  if (isPublicCouponCode_(code)) ensurePublicCouponReady_();
  const coupon = findCoupon_(code);
  if (!coupon) return couponInvalid_(locale, 'COUPON_NOT_FOUND', true);

  const row = coupon.row;
  const status = normalizeText_(row.Estado);
  const active = row.Activo === '' || row.Activo == null ? true : boolean_(row.Activo, true);

  if (!active || status.indexOf('inactiv') >= 0 || status.indexOf('deshabil') >= 0) {
    return couponInvalid_(locale, 'COUPON_INACTIVE', true);
  }
  if (status.indexOf('canje') >= 0 || status.indexOf('usado') >= 0) {
    return couponInvalid_(locale, 'COUPON_ALREADY_USED', true);
  }
  if (status.indexOf('anulad') >= 0 || status.indexOf('cancel') >= 0) {
    return couponInvalid_(locale, 'COUPON_INACTIVE', true);
  }

  const now = new Date();
  const startsAt = parseDate_(row.VigenteDesde);
  if (startsAt && startsAt.getTime() > now.getTime()) {
    return couponInvalid_(locale, 'COUPON_NOT_STARTED', true);
  }

  const expiresAt = parseDate_(row.VigenteHasta);
  if (expiresAt && expiresAt.getTime() < now.getTime()) {
    updateCouponStatus_(code, 'Expirado');
    return couponInvalid_(locale, 'COUPON_EXPIRED', true);
  }

  const maxUses = Math.max(0, Math.floor(number_(row.MaxUsos, 0)));
  const uses = Math.max(0, Math.floor(number_(row.Usos, 0)));
  if (maxUses > 0 && uses >= maxUses) {
    updateCouponStatus_(code, 'Canjeado');
    return couponInvalid_(locale, 'COUPON_ALREADY_USED', true);
  }

  const linkedEmail = cleanEmail_(row.CorreoVinculado || row.Correo || '');
  const suppliedEmail = cleanEmail_(p.email || p.holderEmail || '');
  if (linkedEmail && suppliedEmail && linkedEmail !== suppliedEmail) {
    return couponInvalid_(locale, 'COUPON_EMAIL_MISMATCH', true);
  }

  const type = normalizeCouponType_(row.Tipo || (number_(row.Porcentaje, 0) > 0 ? 'percent' : 'fixed'));
  const value = Math.max(0, number_(row.Valor, type === 'percent' ? number_(row.Porcentaje, 0) : 0));
  const currency = normalizeCurrency_(row.Moneda || p.currency || 'USD');
  if (value <= 0) return couponInvalid_(locale, 'COUPON_INVALID_VALUE', true);

  const subtotal = Math.max(0, number_(p.subtotal || p.serviceTotal || 0, 0));
  const requestCurrency = normalizeCurrency_(p.currency || currency || 'USD');
  if (type === 'fixed' && p.currency && currency !== requestCurrency) {
    return couponInvalid_(locale, 'COUPON_CURRENCY_MISMATCH', true);
  }
  let discountAmount = 0;
  if (subtotal > 0) {
    if (type === 'percent') discountAmount = round2_(subtotal * value / 100);
    else if (currency === requestCurrency) discountAmount = round2_(Math.min(subtotal, value));
  }

  return {
    ok: true,
    valid: true,
    couponCode: row.CodigoCupon,
    type: type,
    value: value,
    currency: currency,
    discountPercent: type === 'percent' ? value : 0,
    discountAmount: discountAmount,
    expiresAt: expiresAt ? expiresAt.toISOString() : '',
    maxUses: maxUses,
    uses: uses,
    requiresEmailMatch: Boolean(linkedEmail),
    label: couponLabel_(type, value, currency, locale),
    reason: null,
    message: couponMessage_(locale, 'COUPON_VALID')
  };
}

function createPreReservation_(p) {
  const payload = p.payload && typeof p.payload === 'object' ? p.payload : p;
  const code = normalizeCode_(payload.code || payload.reservationCode) || generateReservationCode_();
  const holder = payload.holder || {};
  const holderEmail = cleanEmail_(holder.email);
  const holderLastName = clean_(holder.lastName || payload.lastName || '');
  const holderFirstName = clean_(holder.firstName || '');
  const language = clean_(holder.language || payload.language || payload.holderLanguage || 'Español');

  if (!holderFirstName || !holderLastName) return { ok: false, error: 'Datos del titular incompletos.' };
  if (!isValidEmail_(holderEmail)) return { ok: false, error: 'Correo del titular inválido.' };

  const now = new Date();
  const reservationTtl = number_(getProp_('RESERVATION_TTL_HOURS', '72'), 72);
  const expiresAt = addHours_(now, reservationTtl);
  const currency = normalizeCurrency_(payload.currency || payload.checkoutPayload && payload.checkoutPayload.currency || 'USD');
  let amountNow = round2_(payload.payNowValue || payload.checkoutPayload && payload.checkoutPayload.amountToPayNowValue || 0);
  const serviceTotal = round2_(payload.serviceTotalValue || 0);
  const payLater = round2_(payload.payLaterValue || 0);

  if (amountNow <= 0) return { ok: false, error: 'El monto a pagar ahora debe ser mayor a cero.' };

  let couponData = null;
  let couponDiscount = 0;
  const couponCode = normalizeCode_(payload.couponCode || payload.appliedCoupon && payload.appliedCoupon.couponCode || '');
  if (couponCode) {
    const validation = validateCoupon_({
      couponCode: couponCode,
      email: holderEmail,
      subtotal: serviceTotal,
      currency: currency,
      reservationCode: code,
      locale: language
    });
    if (!validation.valid) return { ok: false, error: validation.message || 'Cupón inválido.', couponStatus: validation };
    couponData = validation;
    couponDiscount = round2_(validation.discountAmount || calculateCouponDiscount_(validation, serviceTotal, currency));

    // Para las landings de pago completo, el backend verifica que el total
    // mostrado coincida con el cupón almacenado en Google Sheets.
    const isLanding = Boolean(payload.landingId || String(payload.source || '').indexOf('landing') >= 0);
    if (isLanding && String(payload.paymentMode || '').toLowerCase() === 'full') {
      const expectedAmount = round2_(Math.max(0, serviceTotal - couponDiscount));
      if (Math.abs(expectedAmount - amountNow) > 0.05) {
        return {
          ok: false,
          error: couponMessage_(normalizeLocale_(language), 'COUPON_TOTAL_MISMATCH'),
          expectedAmount: expectedAmount,
          receivedAmount: amountNow
        };
      }
      amountNow = expectedAmount;
    }
  }

  const existing = findReservation_(code);
  if (existing) {
    return { ok: false, error: 'Ya existe una reserva con ese código. Intenta nuevamente.' };
  }

  const publicBaseUrl = getPublicBaseUrl_();
  const voucherUrl = publicBaseUrl + '/detalle-reserva.html?codigo=' + encodeURIComponent(code);
  const rowPayload = Object.assign({}, payload, {
    code: code,
    holder: Object.assign({}, holder, { email: holderEmail, language: language }),
    couponCode: couponCode,
    couponDiscount: couponDiscount,
    expiresAt: expiresAt.toISOString()
  });

  getSheet_(SHEETS.RESERVATIONS, HEADERS.Reservas).appendRow([
    now,
    code,
    'Pendiente de pago',
    'Pendiente',
    expiresAt,
    clean_(payload.productId),
    clean_(payload.productTitle),
    clean_(payload.date),
    currency,
    serviceTotal,
    amountNow,
    payLater,
    clean_(payload.paymentMode),
    holderFirstName,
    holderLastName,
    holderEmail,
    clean_(holder.whatsapp),
    language,
    couponCode,
    couponDiscount,
    clean_(payload.paymentProvider || payload.checkoutPayload && payload.checkoutPayload.provider || ''),
    '',
    '',
    '',
    '',
    voucherUrl,
    normalizeText_(holderLastName),
    JSON.stringify(rowPayload),
    ''
  ]);

  savePassengers_(code, payload.passengers || [], holder);
  logAudit_('createPreReservation', code, 'Pre-reserva creada', rowPayload);

  return {
    ok: true,
    code: code,
    reservationCode: code,
    expiresAt: expiresAt.toISOString(),
    voucherUrl: voucherUrl,
    amountToPayNow: amountNow,
    currency: currency,
    coupon: couponData
  };
}

function createPayPalOrder_(p) {
  const payload = p.payload && typeof p.payload === 'object' ? p.payload : p;
  const code = normalizeCode_(payload.reservationCode || payload.code);
  if (!code) return { ok: false, error: 'Código de reserva requerido.' };

  const reservation = findReservation_(code);
  if (!reservation) return { ok: false, error: 'Reserva no encontrada.' };
  ensureReservationCanPay_(reservation);

  const row = reservation.row;
  const currency = normalizeCurrency_(row.Moneda || payload.currency || 'USD');
  if (currency !== 'USD') {
    return { ok: false, error: 'PayPal está configurado para reservas cotizadas en dólares/USD. Usa Mercado Pago para soles/PEN.' };
  }
  const amount = round2_(row.MontoPagarAhora || payload.amountToPayNowValue || payload.amount || 0);
  if (amount <= 0) return { ok: false, error: 'Monto de pago inválido.' };

  if (row.CodigoCupon) {
    const couponValidation = validateCoupon_({
      couponCode: row.CodigoCupon,
      email: row.TitularEmail,
      subtotal: row.TotalServicio,
      currency: currency,
      reservationCode: code,
      locale: row.IdiomaSolicitado || 'es'
    });
    if (!couponValidation.valid) {
      return {
        ok: false,
        error: couponValidation.message || 'El cupón ya no está disponible.',
        couponStatus: couponValidation
      };
    }
  }

  const returnUrl = buildReturnUrl_(code);
  const cancelUrl = buildCancelUrl_(code, row);
  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: code,
      custom_id: code,
      description: truncate_(clean_(row.Producto || payload.productTitle || 'Reserva My Cusco Trip'), 127),
      amount: {
        currency_code: currency,
        value: amount.toFixed(2)
      }
    }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'My Cusco Trip',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      }
    }
  };

  const paypalOrder = paypalRequest_('post', '/v2/checkout/orders', orderPayload);
  const approvalUrl = getPayPalApprovalUrl_(paypalOrder);
  if (!approvalUrl) {
    logAudit_('PAYPAL_NO_APPROVAL_URL', code, 'PayPal creó la orden pero no se encontró URL de aprobación', {
      paypalOrderId: paypalOrder && paypalOrder.id,
      paypalStatus: paypalOrder && paypalOrder.status,
      paypalLinks: paypalOrder && paypalOrder.links || [],
      paypalOrder: paypalOrder
    });
    return {
      ok: false,
      error: 'PayPal no devolvió enlace de aprobación.',
      paypalOrderId: paypalOrder && paypalOrder.id || '',
      paypalStatus: paypalOrder && paypalOrder.status || '',
      paypalLinks: paypalOrder && paypalOrder.links || [],
      paypal: paypalOrder
    };
  }

  updateReservationFields_(code, {
    ProveedorPago: 'PayPal',
    PayPalOrderID: paypalOrder.id,
    JSON: mergeReservationJson_(row.JSON, { paypalOrder: paypalOrder, paypalReturnUrl: returnUrl })
  });
  associateCouponWithPayment_(row.CodigoCupon, code, paypalOrder.id);

  appendPayment_(code, 'PayPal', 'ORDER_CREATED', currency, amount, paypalOrder.id, '', '', '', paypalOrder);
  logAudit_('createPayPalOrder', code, 'Orden PayPal creada ' + paypalOrder.id, paypalOrder);

  return {
    ok: true,
    reservationCode: code,
    orderID: paypalOrder.id,
    paypalOrderId: paypalOrder.id,
    approvalUrl: approvalUrl,
    status: paypalOrder.status,
    links: paypalOrder.links || []
  };
}

function capturePayPalOrder_(p) {
  const orderId = clean_(p.orderID || p.orderId || p.token || p.paypalOrderId);
  const code = normalizeCode_(p.reservationCode || p.code || '');
  if (!orderId) return { ok: false, error: 'PayPal order ID requerido.' };

  const capture = paypalRequest_('post', '/v2/checkout/orders/' + encodeURIComponent(orderId) + '/capture', {});
  const completed = String(capture.status || '').toUpperCase() === 'COMPLETED';

  let reservation = code ? findReservation_(code) : findReservationByPayPalOrder_(orderId);
  if (!reservation) return { ok: false, error: 'Reserva no encontrada para este pago.', paypal: capture };

  const reservationCode = reservation.row.CodigoReserva;
  const captureId = getCaptureId_(capture);
  const currency = reservation.row.Moneda || getCaptureCurrency_(capture);
  const amount = round2_(reservation.row.MontoPagarAhora || getCaptureAmount_(capture));

  appendPayment_(reservationCode, 'PayPal', capture.status || 'CAPTURED', currency, amount, orderId, captureId, '', '', capture);

  if (!completed) {
    updateReservationFields_(reservationCode, {
      ProveedorPago: 'PayPal',
      EstadoPago: capture.status || 'No completado',
      PayPalCaptureID: captureId,
      JSON: mergeReservationJson_(reservation.row.JSON, { paypalCapture: capture })
    });
    return { ok: false, paid: false, status: capture.status, reservationCode: reservationCode, paypal: capture };
  }

  const voucher = buildVoucherFromReservation_(reservationCode, capture);
  const voucherUrl = getPublicBaseUrl_() + '/detalle-reserva.html?codigo=' + encodeURIComponent(reservationCode);

  updateReservationFields_(reservationCode, {
    Estado: 'Confirmada',
    ProveedorPago: 'PayPal',
    EstadoPago: 'Pagado',
    PayPalCaptureID: captureId,
    VoucherURL: voucherUrl,
    VoucherJSON: JSON.stringify(voucher),
    JSON: mergeReservationJson_(reservation.row.JSON, { paypalCapture: capture, voucher: voucher })
  });

  markCouponRedeemedForReservation_(reservationCode);
  sendReservationPaidEmails_(reservationCode, voucher, capture);
  logAudit_('capturePayPalOrder', reservationCode, 'Pago capturado ' + captureId, capture);

  return {
    ok: true,
    paid: true,
    status: capture.status,
    reservationCode: reservationCode,
    captureID: captureId,
    voucherUrl: voucherUrl,
    voucher: voucher
  };
}

function lookupReservation_(p) {
  const code = normalizeCode_(p.code || p.codigo || p.reservationCode);
  const lastName = normalizeText_(p.lastName || p.apellido || '');
  if (!code) return { ok: false, error: 'Código requerido.' };

  const reservation = findReservation_(code);
  if (!reservation) return { ok: true, found: false, message: 'No existe una reserva con esos datos.' };

  if (lastName && normalizeText_(reservation.row.ApellidoClave || reservation.row.TitularApellido) !== lastName) {
    return { ok: true, found: false, message: 'No existe una reserva con esos datos.' };
  }

  const voucherRaw = reservation.row.VoucherJSON;
  let voucher = null;
  if (voucherRaw) {
    try { voucher = JSON.parse(voucherRaw); } catch (err) { voucher = null; }
  }
  if (!voucher) voucher = buildVoucherFromReservation_(code, null, true);

  return {
    ok: true,
    found: true,
    reservationCode: code,
    status: reservation.row.Estado,
    paymentStatus: reservation.row.EstadoPago,
    voucher: voucher
  };
}

function savePassengers_(code, passengers, holder) {
  const sh = getSheet_(SHEETS.PASSENGERS, HEADERS.Pasajeros);
  const now = new Date();
  (Array.isArray(passengers) ? passengers : []).forEach(function(passenger, index) {
    sh.appendRow([
      now,
      code,
      passenger.passengerNumber || index + 1,
      clean_(passenger.role),
      clean_(passenger.completionStatus),
      clean_(passenger.firstName),
      clean_(passenger.lastName),
      clean_(passenger.documentType),
      clean_(passenger.documentNumber),
      clean_(passenger.nationality),
      clean_(passenger.birthdate),
      clean_(passenger.whatsapp || (index === 0 ? holder.whatsapp : '')),
      cleanEmail_(passenger.email || (index === 0 ? holder.email : '')),
      JSON.stringify(passenger)
    ]);
  });
}

function buildVoucherFromReservation_(code, capture, allowPending) {
  const reservation = findReservation_(code);
  if (!reservation) return null;
  const row = reservation.row;
  const payload = parseJsonSafe_(row.JSON, {});
  const passengers = getPassengersByReservation_(code);
  const holderName = [row.TitularNombre, row.TitularApellido].filter(Boolean).join(' ').trim();
  const lang = row.IdiomaSolicitado || payload.holder && payload.holder.language || 'Español';

  return {
    codigo: row.CodigoReserva,
    apellido: row.TitularApellido,
    fechaVoucher: formatDateHuman_(new Date(), lang),
    fechaEmision: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    fechaViaje: row.FechaViaje || payload.date || '',
    duracion: payload.duration || payload.summary && payload.summary.duration || row.FechaViaje || payload.date || '',
    idioma: lang,
    titularReserva: holderName,
    telefonoContacto: row.TitularWhatsApp || '',
    cantidadPaxs: passengers.length || payload.totalPassengers || 1,
    destino: payload.summary && payload.summary.destination || 'Cusco - Perú',
    packTour: row.Producto || payload.productTitle || 'Servicio turístico My Cusco Trip',
    agenteAsignado: 'Jefferson García',
    agenteTelefono: '+51 900 608 980',
    codigoCupon: row.CodigoCupon || '',
    turistas: passengers.map(function(p) {
      return {
        nombreCompleto: [p.Nombres, p.Apellidos].filter(Boolean).join(' ').trim(),
        tipoDocumento: p.TipoDocumento || '',
        numeroDocumento: p.NumeroDocumento || '',
        nacionalidad: p.Nacionalidad || '',
        fechaNacimiento: p.FechaNacimiento || '',
        telefono: p.WhatsApp || ''
      };
    }),
    servicios: buildServicesFromPayload_(payload),
    incluye: payload.productIncludes || payload.includes || [],
    noIncluye: payload.productExcludes || payload.excludes || [],
    pagos: {
      estado: row.EstadoPago,
      moneda: row.Moneda,
      totalServicio: Number(row.TotalServicio || 0),
      pagadoAhora: Number(row.MontoPagarAhora || 0),
      saldoPendiente: Number(row.SaldoPendiente || 0),
      paypalOrderId: row.PayPalOrderID || '',
      paypalCaptureId: row.PayPalCaptureID || getCaptureId_(capture),
      proveedor: row.ProveedorPago || '',
      mercadoPagoPreferenceId: row.MercadoPagoPreferenceID || '',
      mercadoPagoPaymentId: row.MercadoPagoPaymentID || ''
    },
    informacionAdicional: [
      'Presentarse con anticipación a cada servicio.',
      'Llevar documento original usado para la reserva.',
      'Coordinar cambios o datos pendientes con su agente asignado.'
    ]
  };
}

function buildServicesFromPayload_(payload) {
  const summary = payload.summary || {};
  const services = [];
  if (payload.productTitle || summary.title) {
    services.push({
      codigo: payload.productId || payload.productSlug || 'MCT001',
      nombre: payload.productTitle || summary.title,
      fecha: payload.date || summary.date || '',
      horaInicio: summary.departureTime || '-',
      horaFin: '-',
      incluido: true
    });
  }
  if (Array.isArray(summary.extras)) {
    summary.extras.forEach(function(extra, index) {
      services.push({ codigo: 'EXT' + String(index + 1).padStart(3, '0'), nombre: extra, fecha: payload.date || summary.date || '', horaInicio: '-', horaFin: '-', incluido: false });
    });
  }
  return services;
}

function sendCouponEmails_(record) {
  const corporate = getProp_('CORPORATE_EMAIL', 'reservas@mycuscotrip.com');
  const locale = normalizeLocale_(record.locale || 'es');
  const expiryLabel = formatCouponExpiry_(parseDate_(record.expiresAt), locale);
  const discountLabel = couponLabel_(record.type, record.value, record.currency, locale);
  const subjectAdmin = 'Nuevo lead de cupón - ' + record.couponCode;
  const bodyAdmin = [
    'Nuevo lead capturado desde el popup de cupón.',
    '',
    'Nombre: ' + record.name,
    'WhatsApp: ' + record.whatsapp,
    'Correo: ' + record.email,
    'Cupón: ' + record.couponCode,
    'Descuento: ' + discountLabel,
    'Vigente hasta: ' + expiryLabel,
    'Página: ' + record.page
  ].join('\n');

  // El aviso administrativo no debe bloquear la creación del cupón si falla.
  try {
    MailApp.sendEmail(corporate, subjectAdmin, bodyAdmin);
  } catch (adminError) {
    logAudit_('COUPON_ADMIN_EMAIL_ERROR', '', getErrorMessage_(adminError), {
      couponCode: record.couponCode,
      corporate: corporate
    });
  }

  return sendCouponClientEmail_(record);
}

/**
 * Envía al cliente la plantilla visual del cupón con Logo1.png embebido.
 * Si contact@mycuscotrip.com está autorizado como alias, se usa como remitente.
 * De lo contrario, el mensaje sale desde la cuenta propietaria del script y
 * contact@mycuscotrip.com queda configurado como dirección de respuesta.
 */
function sendCouponClientEmail_(record) {
  const locale = normalizeLocale_(record.locale || 'es');
  const copy = couponEmailCopy_(locale);
  const expiryLabel = formatCouponExpiry_(parseDate_(record.expiresAt), locale);
  const discountLabel = couponLabel_(record.type, record.value, record.currency, locale);
  const ctaUrl = getProp_('COUPON_CTA_URL', 'https://mycuscotrip.com/go');
  const sender = getCouponSenderConfig_();
  const logoBlob = fetchCouponLogoBlob_();
  const htmlBody = buildCouponEmailHtml_(record, copy, expiryLabel, discountLabel, ctaUrl, Boolean(logoBlob));
  const plainBody = buildCouponEmailPlainText_(record, copy, expiryLabel, discountLabel, ctaUrl);
  const options = {
    htmlBody: htmlBody,
    name: sender.name,
    replyTo: sender.replyTo
  };

  if (sender.canUseAlias) options.from = sender.senderEmail;
  if (logoBlob) options.inlineImages = { mctLogo: logoBlob };

  try {
    GmailApp.sendEmail(record.email, copy.subject, plainBody, options);
    logAudit_('sendCouponClientEmail', '', 'Correo de cupón enviado a ' + record.email, {
      couponCode: record.couponCode,
      from: sender.canUseAlias ? sender.senderEmail : 'cuenta_propietaria_del_script',
      replyTo: sender.replyTo,
      logoEmbedded: Boolean(logoBlob)
    });
    return {
      ok: true,
      sent: true,
      fromAlias: sender.canUseAlias,
      logoEmbedded: Boolean(logoBlob)
    };
  } catch (gmailError) {
    // Respaldo con MailApp: conserva HTML, logo embebido y reply-to, pero no alias.
    try {
      const fallback = {
        to: record.email,
        subject: copy.subject,
        body: plainBody,
        htmlBody: htmlBody,
        name: sender.name,
        replyTo: sender.replyTo
      };
      if (logoBlob) fallback.inlineImages = { mctLogo: logoBlob };
      MailApp.sendEmail(fallback);
      logAudit_('sendCouponClientEmailFallback', '', 'Correo enviado mediante MailApp', {
        couponCode: record.couponCode,
        originalError: getErrorMessage_(gmailError)
      });
      return {
        ok: true,
        sent: true,
        fromAlias: false,
        logoEmbedded: Boolean(logoBlob),
        fallback: true
      };
    } catch (fallbackError) {
      logAudit_('COUPON_CLIENT_EMAIL_ERROR', '', getErrorMessage_(fallbackError), {
        couponCode: record.couponCode,
        email: record.email,
        gmailError: getErrorMessage_(gmailError)
      });
      // El cupón ya quedó creado en Sheets. No se interrumpe el registro.
      return {
        ok: false,
        sent: false,
        error: getErrorMessage_(fallbackError)
      };
    }
  }
}

function buildCouponEmailHtml_(record, copy, expiryLabel, discountLabel, ctaUrl, hasLogo) {
  const safeCode = escapeHtml_(record.couponCode);
  const safeDiscount = escapeHtml_(discountLabel);
  const safeExpiry = escapeHtml_(expiryLabel);
  const safeCtaUrl = escapeHtml_(ctaUrl);
  const logoHtml = hasLogo
    ? '<img src="cid:mctLogo" width="190" alt="My Cusco Trip" style="display:block;width:190px;max-width:72%;height:auto;margin:0 auto 16px;border:0;outline:none;text-decoration:none;background:transparent">'
    : '<div style="font-size:20px;font-weight:800;letter-spacing:.3px;color:#ffffff;margin:0 0 14px">My Cusco Trip</div>';

  return [
    '<!doctype html>',
    '<html>',
    '<body style="margin:0;padding:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937">',
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f6f4;margin:0;padding:24px 10px">',
        '<tr><td align="center">',
          '<table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;border-collapse:separate;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 28px rgba(10,58,38,.10)">',
            '<tr><td align="center" style="background:#0a3a26;padding:28px 24px 26px;color:#ffffff">',
              logoHtml,
              '<h1 style="margin:0;font-size:27px;line-height:1.2;font-weight:800;color:#ffffff">' + escapeHtml_(copy.title) + '</h1>',
            '</td></tr>',
            '<tr><td style="padding:28px 26px 30px">',
              '<p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#374151">' + escapeHtml_(copy.intro) + '</p>',

              '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;border-collapse:separate">',
                '<tr><td align="center" style="padding:18px 14px;background:#eef6f1;border:1px solid #d8e9df;border-radius:16px">',
                  '<div style="font-size:12px;line-height:1.2;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:#4b685a;margin-bottom:7px">' + escapeHtml_(copy.codeLabel) + '</div>',
                  '<div style="font-size:27px;line-height:1.15;font-weight:800;letter-spacing:1.4px;color:#0a3a26;word-break:break-word">' + safeCode + '</div>',
                '</td></tr>',
              '</table>',

              '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;border-collapse:separate">',
                '<tr>',
                  '<td width="50%" valign="top" style="padding-right:6px">',
                    '<div style="min-height:76px;padding:15px 12px;text-align:center;background:#0a3a26;border-radius:14px;color:#ffffff">',
                      '<div style="font-size:12px;line-height:1.2;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:#cce2d5;margin-bottom:7px">' + escapeHtml_(copy.discount) + '</div>',
                      '<div style="font-size:20px;line-height:1.2;font-weight:800;color:#ffffff">' + safeDiscount + '</div>',
                    '</div>',
                  '</td>',
                  '<td width="50%" valign="top" style="padding-left:6px">',
                    '<div style="min-height:76px;padding:15px 12px;text-align:center;background:#f8f2df;border:1px solid #eadcae;border-radius:14px;color:#5b4712">',
                      '<div style="font-size:12px;line-height:1.2;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:#806b32;margin-bottom:7px">' + escapeHtml_(copy.validUntil) + '</div>',
                      '<div style="font-size:16px;line-height:1.25;font-weight:800;color:#5b4712">' + safeExpiry + '</div>',
                    '</div>',
                  '</td>',
                '</tr>',
              '</table>',

              '<div style="padding:16px 17px;background:#fff8e6;border-left:4px solid #d5a72c;border-radius:10px;margin:0 0 22px">',
                '<p style="margin:0;font-size:15px;line-height:1.6;color:#59491d"><strong>' + escapeHtml_(copy.hurryTitle) + '</strong> ' + escapeHtml_(copy.hurry) + '</p>',
              '</div>',

              '<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#4b5563">' + escapeHtml_(copy.use) + '</p>',
              '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px">',
                '<tr><td align="center">',
                  '<a href="' + safeCtaUrl + '" target="_blank" style="display:inline-block;background:#0a3a26;color:#ffffff;text-decoration:none;font-size:16px;line-height:1;font-weight:800;padding:16px 25px;border-radius:12px">' + escapeHtml_(copy.cta) + '</a>',
                '</td></tr>',
              '</table>',
              '<p style="margin:0;text-align:center;font-size:12px;line-height:1.5;color:#6b7280">' + escapeHtml_(copy.orVisit) + '<br><a href="' + safeCtaUrl + '" target="_blank" style="color:#0a3a26;text-decoration:underline">' + safeCtaUrl + '</a></p>',
            '</td></tr>',
            '<tr><td align="center" style="padding:18px 22px;background:#edf3ef;border-top:1px solid #dce6e0">',
              '<p style="margin:0;font-size:12px;line-height:1.5;color:#647269">My Cusco Trip · Cusco, Perú</p>',
            '</td></tr>',
          '</table>',
        '</td></tr>',
      '</table>',
    '</body>',
    '</html>'
  ].join('');
}

function buildCouponEmailPlainText_(record, copy, expiryLabel, discountLabel, ctaUrl) {
  return [
    copy.title,
    '',
    copy.intro,
    '',
    copy.codeLabel + ': ' + record.couponCode,
    copy.discount + ': ' + discountLabel,
    copy.validUntil + ': ' + expiryLabel,
    '',
    copy.hurryTitle + ' ' + copy.hurry,
    '',
    copy.use,
    ctaUrl
  ].join('\n');
}

function getCouponSenderConfig_() {
  const senderEmail = cleanEmail_(getProp_('COUPON_SENDER_EMAIL', 'contact@mycuscotrip.com'));
  const replyTo = cleanEmail_(getProp_('COUPON_REPLY_TO', senderEmail || 'contact@mycuscotrip.com'));
  const name = clean_(getProp_('COUPON_EMAIL_NAME', 'My Cusco Trip')) || 'My Cusco Trip';
  let aliases = [];

  try {
    aliases = GmailApp.getAliases().map(function(alias) { return cleanEmail_(alias); });
  } catch (err) {
    logAudit_('COUPON_ALIAS_LOOKUP_ERROR', '', getErrorMessage_(err), {});
  }

  return {
    senderEmail: senderEmail,
    replyTo: replyTo,
    name: name,
    aliases: aliases,
    canUseAlias: Boolean(senderEmail && aliases.indexOf(senderEmail) >= 0)
  };
}

function fetchCouponLogoBlob_() {
  const logoUrl = getProp_('COUPON_LOGO_URL', 'https://mycuscotrip.com/assets/img/logos/Logo1.png');
  if (!logoUrl) return null;

  try {
    const response = UrlFetchApp.fetch(logoUrl, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true
    });
    const status = response.getResponseCode();
    if (status < 200 || status >= 300) {
      throw new Error('Logo HTTP ' + status);
    }
    return response.getBlob().setName('Logo1.png');
  } catch (err) {
    logAudit_('COUPON_LOGO_FETCH_ERROR', '', getErrorMessage_(err), { logoUrl: logoUrl });
    return null;
  }
}

/**
 * Comprueba si contact@mycuscotrip.com está autorizado como alias de Gmail.
 * No envía ningún correo.
 */
function testCouponSenderAlias_() {
  const config = getCouponSenderConfig_();
  const result = {
    target: config.senderEmail,
    available: config.canUseAlias,
    aliases: config.aliases,
    replyTo: config.replyTo
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Envía una prueba de la plantilla sin crear un cupón en Google Sheets.
 * Define COUPON_EMAIL_TEST_TO en Propiedades del script o reemplaza el valor.
 */
function testCouponEmailTemplate_() {
  const testTo = cleanEmail_(getProp_('COUPON_EMAIL_TEST_TO', '')) || cleanEmail_(Session.getActiveUser().getEmail());
  if (!isValidEmail_(testTo)) {
    throw new Error('Configura COUPON_EMAIL_TEST_TO con un correo válido en Propiedades del script.');
  }

  const now = new Date();
  const record = {
    couponCode: 'MCTPRUEBA-15X',
    type: 'percent',
    value: 15,
    currency: 'USD',
    expiresAt: calculateCouponExpiry_(now, 48).toISOString(),
    name: 'Cliente de prueba',
    whatsapp: '+51999999999',
    email: testTo,
    page: '/go',
    locale: 'es',
    source: 'email_template_test'
  };

  return sendCouponClientEmail_(record);
}

function sendReservationPaidEmails_(code, voucher, capture) {
  const reservation = findReservation_(code);
  if (!reservation) return;
  const row = reservation.row;
  const corporate = getProp_('CORPORATE_EMAIL', 'reservas@mycuscotrip.com');
  const voucherUrl = row.VoucherURL || getPublicBaseUrl_() + '/detalle-reserva.html?codigo=' + encodeURIComponent(code);
  const holderName = voucher && voucher.titularReserva || [row.TitularNombre, row.TitularApellido].filter(Boolean).join(' ');

  const adminSubject = 'Reserva pagada - ' + code;
  const adminBody = [
    'Reserva pagada correctamente.',
    '',
    'Código: ' + code,
    'Cliente: ' + holderName,
    'Correo: ' + row.TitularEmail,
    'WhatsApp: ' + row.TitularWhatsApp,
    'Producto: ' + row.Producto,
    'Monto pagado: ' + row.Moneda + ' ' + row.MontoPagarAhora,
    'Proveedor: ' + (row.ProveedorPago || 'Pago online'),
    'PayPal Order: ' + (row.PayPalOrderID || ''),
    'PayPal Capture: ' + (row.PayPalCaptureID || getCaptureId_(capture) || ''),
    'Mercado Pago Preference: ' + (row.MercadoPagoPreferenceID || ''),
    'Mercado Pago Payment: ' + (row.MercadoPagoPaymentID || ''),
    'Voucher: ' + voucherUrl
  ].join('\n');
  MailApp.sendEmail(corporate, adminSubject, adminBody);

  const clientSubject = 'Reserva confirmada - ' + code;
  const clientHtml = '<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">' +
    '<h2 style="color:#0a3a26">Tu reserva fue confirmada</h2>' +
    '<p>Hola ' + escapeHtml_(holderName) + ', hemos recibido tu pago correctamente.</p>' +
    '<p>Código de reserva: <strong style="color:#0a3a26">' + code + '</strong></p>' +
    '<p>Producto: <strong>' + escapeHtml_(row.Producto) + '</strong></p>' +
    '<p>Para ver tu travel voucher, ingresa a <a href="' + voucherUrl + '">ver mi travel voucher</a>.</p>' +
    '<p>También puedes entrar a “Mi Reserva” con tu código <strong>' + code + '</strong> y tu apellido <strong>' + escapeHtml_(row.TitularApellido) + '</strong>.</p>' +
    '</div>';
  MailApp.sendEmail({ to: row.TitularEmail, subject: clientSubject, htmlBody: clientHtml, name: 'My Cusco Trip' });
}


function createMercadoPagoPreference_(p) {
  const payload = p.payload && typeof p.payload === 'object' ? p.payload : p;
  const code = normalizeCode_(payload.reservationCode || payload.code);
  if (!code) return { ok: false, error: 'Código de reserva requerido.' };

  const reservation = findReservation_(code);
  if (!reservation) return { ok: false, error: 'Reserva no encontrada.' };
  ensureReservationCanPay_(reservation);

  const row = reservation.row;
  const currency = normalizeCurrency_(row.Moneda || payload.currency || 'PEN');
  if (currency !== 'PEN') {
    return { ok: false, error: 'Mercado Pago está configurado para reservas cotizadas en soles/PEN. Usa PayPal para USD.' };
  }

  const amount = round2_(row.MontoPagarAhora || payload.amountToPayNowValue || payload.amount || 0);
  if (amount <= 0) return { ok: false, error: 'Monto de pago inválido.' };

  const returnUrl = buildMercadoPagoReturnUrl_(code);
  const cancelUrl = buildCancelUrl_(code, row);
  const webhookUrl = clean_(getProp_('MERCADOPAGO_WEBHOOK_URL', ''));
  const preferencePayload = {
    items: [{
      id: code,
      title: truncate_(clean_(row.Producto || payload.productTitle || 'Reserva My Cusco Trip'), 120),
      description: 'Reserva turística My Cusco Trip ' + code,
      quantity: 1,
      currency_id: 'PEN',
      unit_price: amount
    }],
    payer: {
      name: clean_(row.TitularNombre),
      surname: clean_(row.TitularApellido),
      email: cleanEmail_(row.TitularEmail)
    },
    external_reference: code,
    metadata: {
      reservation_code: code,
      quote_reference: clean_(payload.quoteReference || '')
    },
    back_urls: {
      success: returnUrl + '&status=success',
      failure: returnUrl + '&status=failure',
      pending: returnUrl + '&status=pending'
    },
    auto_return: 'approved',
    statement_descriptor: 'MYCUSCOTRIP'
  };
  if (webhookUrl) preferencePayload.notification_url = webhookUrl;

  const preference = mercadoPagoRequest_('post', '/checkout/preferences', preferencePayload);
  const mode = getProp_('MERCADOPAGO_MODE', 'sandbox') === 'live' ? 'live' : 'sandbox';
  const approvalUrl = mode === 'live' ? preference.init_point : (preference.sandbox_init_point || preference.init_point);
  if (!approvalUrl) return { ok: false, error: 'Mercado Pago no devolvió enlace de pago.', mercadoPago: preference };

  updateReservationFields_(code, {
    ProveedorPago: 'Mercado Pago',
    MercadoPagoPreferenceID: preference.id,
    JSON: mergeReservationJson_(row.JSON, { mercadoPagoPreference: preference, mercadoPagoReturnUrl: returnUrl })
  });

  appendPayment_(code, 'Mercado Pago', 'PREFERENCE_CREATED', currency, amount, '', '', preference.id, '', preference);
  logAudit_('createMercadoPagoPreference', code, 'Preferencia Mercado Pago creada ' + preference.id, preference);

  return {
    ok: true,
    reservationCode: code,
    preferenceId: preference.id,
    approvalUrl: approvalUrl,
    initPoint: preference.init_point || '',
    sandboxInitPoint: preference.sandbox_init_point || '',
    status: 'PREFERENCE_CREATED'
  };
}

function captureMercadoPagoPayment_(p) {
  const payload = p.payload && typeof p.payload === 'object' ? p.payload : p;
  const paymentId = clean_(payload.payment_id || payload.paymentId || payload.collection_id || payload.collectionId || '');
  const preferenceId = clean_(payload.preference_id || payload.preferenceId || '');
  let code = normalizeCode_(payload.reservationCode || payload.code || payload.external_reference || '');

  if (!paymentId) return { ok: false, error: 'Mercado Pago payment_id requerido.' };

  const payment = mercadoPagoRequest_('get', '/v1/payments/' + encodeURIComponent(paymentId), null);
  code = code || normalizeCode_(payment.external_reference || payment.metadata && payment.metadata.reservation_code || '');
  if (!code && preferenceId) {
    const reservationByPreference = findReservationByMercadoPagoPreference_(preferenceId);
    if (reservationByPreference) code = normalizeCode_(reservationByPreference.row.CodigoReserva);
  }
  if (!code) return { ok: false, error: 'No se pudo asociar el pago de Mercado Pago a una reserva.', mercadoPago: payment };

  const reservation = findReservation_(code);
  if (!reservation) return { ok: false, error: 'Reserva no encontrada para este pago.', mercadoPago: payment };

  const status = clean_(payment.status || payload.status || 'unknown');
  const approved = normalizeText_(status) === 'approved';
  const amount = round2_(payment.transaction_amount || reservation.row.MontoPagarAhora || 0);
  const currency = normalizeCurrency_(payment.currency_id || reservation.row.Moneda || 'PEN');
  const finalPreferenceId = preferenceId || clean_(reservation.row.MercadoPagoPreferenceID);

  appendPayment_(code, 'Mercado Pago', status, currency, amount, '', '', finalPreferenceId, paymentId, payment);

  if (!approved) {
    updateReservationFields_(code, {
      ProveedorPago: 'Mercado Pago',
      EstadoPago: status || 'Pendiente',
      MercadoPagoPreferenceID: finalPreferenceId,
      MercadoPagoPaymentID: paymentId,
      JSON: mergeReservationJson_(reservation.row.JSON, { mercadoPagoPayment: payment })
    });
    return { ok: false, paid: false, status: status, reservationCode: code, mercadoPago: payment };
  }

  const voucher = buildVoucherFromReservation_(code, payment);
  const voucherUrl = getPublicBaseUrl_() + '/detalle-reserva.html?codigo=' + encodeURIComponent(code);

  updateReservationFields_(code, {
    Estado: 'Confirmada',
    EstadoPago: 'Pagado',
    ProveedorPago: 'Mercado Pago',
    MercadoPagoPreferenceID: finalPreferenceId,
    MercadoPagoPaymentID: paymentId,
    VoucherURL: voucherUrl,
    VoucherJSON: JSON.stringify(voucher),
    JSON: mergeReservationJson_(reservation.row.JSON, { mercadoPagoPayment: payment, voucher: voucher })
  });

  markCouponRedeemedForReservation_(code);
  sendReservationPaidEmails_(code, voucher, payment);
  logAudit_('captureMercadoPagoPayment', code, 'Pago Mercado Pago aprobado ' + paymentId, payment);

  return {
    ok: true,
    paid: true,
    status: status,
    reservationCode: code,
    paymentId: paymentId,
    voucherUrl: voucherUrl,
    voucher: voucher
  };
}

function mercadoPagoRequest_(method, path, body) {
  const accessToken = getProp_('MERCADOPAGO_ACCESS_TOKEN', '');
  if (!accessToken || accessToken.indexOf('PEGAR_') === 0) {
    throw new Error('Configura MERCADOPAGO_ACCESS_TOKEN en Propiedades del script.');
  }
  const options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    }
  };
  if (body && Object.keys(body).length) options.payload = JSON.stringify(body);
  const response = UrlFetchApp.fetch('https://api.mercadopago.com' + path, options);
  const text = response.getContentText();
  const data = text ? JSON.parse(text) : {};
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('Mercado Pago HTTP ' + response.getResponseCode() + ': ' + text);
  }
  return data;
}

function paypalRequest_(method, path, body) {
  const mode = getProp_('PAYPAL_MODE', 'sandbox') === 'live' ? 'live' : 'sandbox';
  const base = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const token = getPayPalAccessToken_(base);
  const options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  };
  if (body && Object.keys(body).length) options.payload = JSON.stringify(body);
  const response = UrlFetchApp.fetch(base + path, options);
  const text = response.getContentText();
  const data = text ? JSON.parse(text) : {};
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('PayPal HTTP ' + response.getResponseCode() + ': ' + text);
  }
  return data;
}

function getPayPalAccessToken_(base) {
  const clientId = clean_(getProp_('PAYPAL_CLIENT_ID', ''));
  const secret = clean_(getProp_('PAYPAL_CLIENT_SECRET', ''));
  if (!clientId || !secret || clientId.indexOf('PEGAR_') === 0 || secret.indexOf('PEGAR_') === 0) {
    throw new Error('Configura PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en Propiedades del script.');
  }

  const mode = base.indexOf('sandbox') >= 0 ? 'SANDBOX' : 'LIVE';
  const cacheKey = 'PAYPAL_ACCESS_TOKEN_' + mode;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = UrlFetchApp.fetch(base + '/v1/oauth2/token', {
    method: 'post',
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Basic ' + Utilities.base64Encode(clientId + ':' + secret),
      Accept: 'application/json',
      'Accept-Language': 'en_US'
    },
    payload: { grant_type: 'client_credentials' }
  });
  const text = response.getContentText();
  const data = text ? JSON.parse(text) : {};
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('No se pudo obtener token PayPal ' + mode + ' HTTP ' + response.getResponseCode() + ': ' + text);
  }
  cache.put(cacheKey, data.access_token, Math.max(60, Number(data.expires_in || 3600) - 120));
  return data.access_token;
}

function getPayPalLink_(order, rel) {
  const links = Array.isArray(order && order.links) ? order.links : [];

  // PayPal puede devolver el enlace de aprobación como:
  // - rel: "payer-action" cuando se usa payment_source.paypal
  // - rel: "approve" en otros flujos/documentación
  // Por eso buscamos el rel pedido y luego varios fallback seguros.
  const exact = links.find(function(item) {
    return item && item.rel === rel && item.href;
  });
  if (exact && exact.href) return exact.href;

  const preferredRels = ['payer-action', 'approve', 'approval_url'];
  for (let i = 0; i < preferredRels.length; i++) {
    const found = links.find(function(item) {
      return item && item.rel === preferredRels[i] && item.href;
    });
    if (found && found.href) return found.href;
  }

  const checkoutNow = links.find(function(item) {
    return item && item.href && String(item.href).indexOf('/checkoutnow') >= 0;
  });
  if (checkoutNow && checkoutNow.href) return checkoutNow.href;

  const paypalCheckout = links.find(function(item) {
    return item && item.href && String(item.href).indexOf('paypal.com') >= 0;
  });
  if (paypalCheckout && paypalCheckout.href) return paypalCheckout.href;

  return '';
}

function getPayPalApprovalUrl_(order) {
  return getPayPalLink_(order, 'approve');
}

function getCaptureId_(capture) {
  try {
    const captures = capture.purchase_units[0].payments.captures;
    return captures && captures[0] && captures[0].id || '';
  } catch (err) {
    return '';
  }
}

function getCaptureAmount_(capture) {
  try {
    const captures = capture.purchase_units[0].payments.captures;
    return Number(captures && captures[0] && captures[0].amount && captures[0].amount.value || 0);
  } catch (err) {
    return 0;
  }
}

function getCaptureCurrency_(capture) {
  try {
    const captures = capture.purchase_units[0].payments.captures;
    return captures && captures[0] && captures[0].amount && captures[0].amount.currency_code || 'USD';
  } catch (err) {
    return 'USD';
  }
}

function ensureReservationCanPay_(reservation) {
  const row = reservation.row;
  if (normalizeText_(row.EstadoPago).indexOf('pagado') >= 0) throw new Error('Esta reserva ya figura como pagada.');
  const expiresAt = parseDate_(row.VigenteHasta);
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    updateReservationFields_(row.CodigoReserva, { Estado: 'Expirada' });
    throw new Error('La reserva expiró. Genera una nueva reserva.');
  }
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const currentHeaders = sh.getLastRow() ? sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0] : [];
  if (!currentHeaders[0]) {
    sh.clear();
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readRows_(sheetName, headers) {
  const sh = getSheet_(sheetName, headers);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0].map(function(h) { return String(h).trim(); });
  return values.slice(1).map(function(row, i) {
    const obj = {};
    header.forEach(function(h, idx) { obj[h] = row[idx]; });
    return { index: i + 2, row: obj, sheet: sh, headers: header };
  });
}

function findCoupon_(code) {
  return readRows_(SHEETS.COUPONS, HEADERS.Cupones).find(function(item) {
    return normalizeCode_(item.row.CodigoCupon) === normalizeCode_(code);
  });
}

function findReservation_(code) {
  return readRows_(SHEETS.RESERVATIONS, HEADERS.Reservas).find(function(item) {
    return normalizeCode_(item.row.CodigoReserva) === normalizeCode_(code);
  });
}

function findReservationByPayPalOrder_(orderId) {
  return readRows_(SHEETS.RESERVATIONS, HEADERS.Reservas).find(function(item) {
    return clean_(item.row.PayPalOrderID) === clean_(orderId);
  });
}


function findReservationByMercadoPagoPreference_(preferenceId) {
  return readRows_(SHEETS.RESERVATIONS, HEADERS.Reservas).find(function(item) {
    return clean_(item.row.MercadoPagoPreferenceID) === clean_(preferenceId);
  });
}

function getPassengersByReservation_(code) {
  return readRows_(SHEETS.PASSENGERS, HEADERS.Pasajeros)
    .filter(function(item) { return normalizeCode_(item.row.CodigoReserva) === normalizeCode_(code); })
    .sort(function(a, b) { return Number(a.row.Numero || 0) - Number(b.row.Numero || 0); })
    .map(function(item) { return item.row; });
}

function updateReservationFields_(code, fields) {
  const item = findReservation_(code);
  if (!item) return false;
  updateRowFields_(item, fields);
  return true;
}

function updateCouponStatus_(code, status) {
  const item = findCoupon_(code);
  if (!item) return false;
  updateRowFields_(item, { Estado: status });
  return true;
}

function markCouponRedeemedForReservation_(reservationCode) {
  const reservation = findReservation_(reservationCode);
  if (!reservation || !reservation.row.CodigoCupon) return;
  const coupon = findCoupon_(reservation.row.CodigoCupon);
  if (!coupon) return;

  const currentUses = Math.max(0, Math.floor(number_(coupon.row.Usos, 0)));
  const nextUses = currentUses + 1;
  const maxUses = Math.max(0, Math.floor(number_(coupon.row.MaxUsos, 0)));
  const finalStatus = maxUses > 0 && nextUses >= maxUses ? 'Canjeado' : 'Vigente';

  updateRowFields_(coupon, {
    Estado: finalStatus,
    Usos: nextUses,
    CanjeadoEn: new Date(),
    CodigoReserva: reservationCode,
    PayPalOrderID: reservation.row.PayPalOrderID || coupon.row.PayPalOrderID || '',
    ReservadoHasta: ''
  });
}

function updateRowFields_(item, fields) {
  Object.keys(fields).forEach(function(key) {
    const idx = item.headers.indexOf(key);
    if (idx >= 0) item.sheet.getRange(item.index, idx + 1).setValue(fields[key]);
  });
}

function appendPayment_(code, provider, status, currency, amount, orderId, captureId, mpPreferenceId, mpPaymentId, raw) {
  getSheet_(SHEETS.PAYMENTS, HEADERS.Pagos).appendRow([
    new Date(), code, provider, status, currency, amount, orderId || '', captureId || '', mpPreferenceId || '', mpPaymentId || '', JSON.stringify(raw || {})
  ]);
}

function logAudit_(action, code, detail, raw) {
  try {
    getSheet_(SHEETS.AUDIT, HEADERS.Auditoria).appendRow([new Date(), action, code || '', detail || '', JSON.stringify(raw || {})]);
  } catch (err) {
    console.warn(err);
  }
}

function mergeReservationJson_(raw, patch) {
  const current = parseJsonSafe_(raw, {});
  return JSON.stringify(Object.assign({}, current, patch || {}));
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const text = e.postData.contents;
  try { return JSON.parse(text); } catch (err) {}
  const params = e.parameter || {};
  if (params.payload) return JSON.parse(params.payload);
  return params;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getProp_(name, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  return String(value == null || value === '' ? (fallback || '') : value).trim();
}

function getPublicBaseUrl_() {
  return String(getProp_('PUBLIC_BASE_URL', 'https://mycuscotrip.com')).replace(/\/$/, '');
}

function buildReturnUrl_(code) {
  return getPublicBaseUrl_() + '/paypal-retorno.html?reservationCode=' + encodeURIComponent(code);
}

function buildMercadoPagoReturnUrl_(code) {
  return getPublicBaseUrl_() + '/mercadopago-retorno.html?reservationCode=' + encodeURIComponent(code);
}

function buildCancelUrl_(code, row) {
  const originPage = getReservationOriginPage_(row);
  return getPublicBaseUrl_() + originPage + '?payment=cancelled&reservationCode=' + encodeURIComponent(code);
}

function getReservationOriginPage_(row) {
  const payload = parseJsonSafe_(row && row.JSON, {});
  const candidate = clean_(payload.landingPath || payload.sourcePage || '');

  // Solo se aceptan rutas internas conocidas para evitar redirecciones externas.
  if (/^\/(?:en\/|pt\/)?landing\/machu-picchu-y-tours-peru\.html$/i.test(candidate)) {
    return candidate;
  }
  if (payload.landingId || String(payload.source || '').indexOf('landing') >= 0) {
    const lang = normalizeLocale_(payload.holder && payload.holder.language || payload.language || 'es');
    if (lang === 'en') return '/en/landing/machu-picchu-y-tours-peru.html';
    if (lang === 'pt') return '/pt/landing/machu-picchu-y-tours-peru.html';
    return '/landing/machu-picchu-y-tours-peru.html';
  }
  if (payload.origin === 'quote_packages' || payload.summary && payload.summary.source === 'quote_packages') return '/quote-packages.html';
  return '/product.html';
}

function seedPublicCoupon_() {
  return upsertPublicCoupon_();
}

function getPublicCouponCode_() {
  return normalizeCode_(getProp_('PUBLIC_COUPON_CODE', 'BETSWELCOME05'));
}

function isPublicCouponCode_(code) {
  return normalizeCode_(code) === getPublicCouponCode_();
}

function ensurePublicCouponReady_() {
  const code = getPublicCouponCode_();
  if (!code) return null;
  const existing = findCoupon_(code);
  if (!existing) return upsertPublicCoupon_();

  const row = existing.row;
  const percent = Math.max(0, number_(getProp_('PUBLIC_COUPON_PERCENT', '5'), 5));
  const status = normalizeText_(row.Estado);
  const active = row.Activo === '' || row.Activo == null ? true : boolean_(row.Activo, true);
  const needsRepair = !active || status.indexOf('expir') >= 0 || status.indexOf('canje') >= 0 ||
    normalizeCouponType_(row.Tipo || 'percent') !== 'percent' ||
    number_(row.Valor || row.Porcentaje, 0) !== percent || clean_(row.VigenteHasta) !== '';

  if (needsRepair) return upsertPublicCoupon_();
  return {
    couponCode: code,
    type: 'percent',
    value: percent,
    currency: 'USD',
    status: row.Estado || 'Vigente'
  };
}

function upsertPublicCoupon_() {
  const code = getPublicCouponCode_();
  if (!code) return null;
  const percent = Math.max(0, number_(getProp_('PUBLIC_COUPON_PERCENT', '5'), 5));
  const existing = findCoupon_(code);

  if (existing) {
    updateRowFields_(existing, {
      Estado: 'Vigente',
      Porcentaje: percent,
      VigenteHasta: '',
      Tipo: 'percent',
      Valor: percent,
      Moneda: 'USD',
      Activo: true,
      VigenteDesde: existing.row.VigenteDesde || new Date(),
      MaxUsos: 0,
      CorreoVinculado: '',
      ReservadoHasta: '',
      Notas: 'Cupón público del popup. Uso ilimitado; no caduca mientras permanezca activo.'
    });
  } else {
    appendCouponRecord_({
      couponCode: code,
      status: 'Vigente',
      type: 'percent',
      value: percent,
      currency: 'USD',
      active: true,
      startsAt: new Date().toISOString(),
      expiresAt: '',
      maxUses: 0,
      uses: 0,
      name: 'Cupón público del popup',
      whatsapp: '',
      email: '',
      page: '/',
      locale: 'es',
      source: 'public_popup',
      createdAt: new Date().toISOString(),
      notes: 'Cupón público del popup. Uso ilimitado; no caduca mientras permanezca activo.'
    });
  }

  return {
    couponCode: code,
    type: 'percent',
    value: percent,
    currency: 'USD',
    status: 'Vigente'
  };
}

function couponHealth_(params) {
  repairCouponSheetSchema_();
  ensurePublicCouponReady_();
  const code = normalizeCode_(params.couponCode || params.code || getPublicCouponCode_());
  const validation = validateCoupon_({
    couponCode: code,
    subtotal: number_(params.subtotal, 399),
    currency: params.currency || 'USD',
    locale: params.locale || 'es'
  });
  return {
    ok: true,
    version: BACKEND_VERSION,
    publicCouponCode: getPublicCouponCode_(),
    checkedCode: code,
    validation: validation
  };
}

function appendCouponRecord_(record) {
  const sh = getSheet_(SHEETS.COUPONS, HEADERS.Cupones);
  ensureHeaders_(sh, HEADERS.Cupones);
  const rowObject = {
    FechaRegistro: parseDate_(record.createdAt) || new Date(),
    CodigoCupon: normalizeCode_(record.couponCode),
    Estado: record.status || 'Vigente',
    Porcentaje: normalizeCouponType_(record.type) === 'percent' ? number_(record.value, 0) : '',
    VigenteHasta: record.expiresAt ? parseDate_(record.expiresAt) : '',
    Nombre: clean_(record.name),
    WhatsApp: clean_(record.whatsapp),
    Correo: cleanEmail_(record.email),
    Pagina: clean_(record.page),
    Idioma: normalizeLocale_(record.locale),
    Fuente: clean_(record.source),
    CanjeadoEn: '',
    CodigoReserva: '',
    JSON: JSON.stringify(record),
    Tipo: normalizeCouponType_(record.type),
    Valor: number_(record.value, 0),
    Moneda: normalizeCurrency_(record.currency || 'USD'),
    Activo: record.active !== false,
    VigenteDesde: record.startsAt ? parseDate_(record.startsAt) : new Date(),
    MaxUsos: Math.max(0, Math.floor(number_(record.maxUses, 0))),
    Usos: Math.max(0, Math.floor(number_(record.uses, 0))),
    CorreoVinculado: cleanEmail_(record.email),
    ReservadoHasta: '',
    PayPalOrderID: '',
    Notas: clean_(record.notes)
  };
  const values = HEADERS.Cupones.map(function(header) { return rowObject[header] == null ? '' : rowObject[header]; });
  sh.appendRow(values);
}

function generateUniqueCouponCode_() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCouponCode_();
    if (!findCoupon_(code)) return code;
  }
  throw new Error('No se pudo generar un código de cupón único. Inténtalo nuevamente.');
}

function calculateCouponExpiry_(createdAt, ttlHours) {
  const exactExpiry = addHours_(createdAt, ttlHours);
  const grace = boolean_(getProp_('COUPON_GRACE_END_OF_DAY', 'true'), true);
  if (!grace) return exactExpiry;

  const timeZone = getCouponTimeZone_();
  const dateKey = Utilities.formatDate(exactExpiry, timeZone, 'yyyy-MM-dd');
  return Utilities.parseDate(dateKey + ' 23:59:59', timeZone, 'yyyy-MM-dd HH:mm:ss');
}

function getCouponTimeZone_() {
  return clean_(getProp_('COUPON_TIME_ZONE', 'America/Lima')) || 'America/Lima';
}

function normalizeCouponType_(value) {
  const type = normalizeText_(value);
  return type === 'fixed' || type === 'monto' || type === 'amount' || type === 'fijo' ? 'fixed' : 'percent';
}

function calculateCouponDiscount_(coupon, subtotal, currency) {
  const total = Math.max(0, number_(subtotal, 0));
  if (!coupon || total <= 0) return 0;
  if (normalizeCouponType_(coupon.type) === 'percent') {
    return round2_(Math.min(total, total * number_(coupon.value || coupon.discountPercent, 0) / 100));
  }
  const couponCurrency = normalizeCurrency_(coupon.currency || currency || 'USD');
  const targetCurrency = normalizeCurrency_(currency || 'USD');
  if (couponCurrency !== targetCurrency) return 0;
  return round2_(Math.min(total, number_(coupon.value, 0)));
}

function couponInvalid_(locale, reason, okValue) {
  return {
    ok: okValue !== false,
    valid: false,
    reason: reason,
    message: couponMessage_(locale, reason)
  };
}

function couponMessage_(locale, key) {
  const lang = normalizeLocale_(locale);
  const messages = {
    es: {
      NAME_REQUIRED: 'Ingresa tu nombre.', EMAIL_INVALID: 'Ingresa un correo válido.', PHONE_INVALID: 'Ingresa un WhatsApp válido.',
      COUPON_CREATED: 'Cupón generado correctamente.', COUPON_EMPTY: 'Ingresa un código de descuento.', COUPON_NOT_FOUND: 'Código no encontrado.',
      COUPON_INACTIVE: 'Este código no está disponible.', COUPON_ALREADY_USED: 'Este código ya fue utilizado.', COUPON_NOT_STARTED: 'Este código todavía no está vigente.',
      COUPON_EXPIRED: 'Este código ha expirado.', COUPON_EMAIL_MISMATCH: 'Este cupón corresponde a otro correo.', COUPON_CURRENCY_MISMATCH: 'Este cupón fijo no corresponde a la moneda de la reserva.', COUPON_INVALID_VALUE: 'El valor del cupón no es válido.',
      COUPON_VALID: 'Cupón válido.', COUPON_TOTAL_MISMATCH: 'El total de la reserva no coincide con el descuento vigente. Actualiza la página e inténtalo nuevamente.'
    },
    en: {
      NAME_REQUIRED: 'Enter your name.', EMAIL_INVALID: 'Enter a valid email address.', PHONE_INVALID: 'Enter a valid WhatsApp number.',
      COUPON_CREATED: 'Coupon created successfully.', COUPON_EMPTY: 'Enter a discount code.', COUPON_NOT_FOUND: 'Coupon code not found.',
      COUPON_INACTIVE: 'This coupon is not available.', COUPON_ALREADY_USED: 'This coupon has already been used.', COUPON_NOT_STARTED: 'This coupon is not active yet.',
      COUPON_EXPIRED: 'This coupon has expired.', COUPON_EMAIL_MISMATCH: 'This coupon belongs to a different email address.', COUPON_CURRENCY_MISMATCH: 'This fixed coupon does not match the booking currency.', COUPON_INVALID_VALUE: 'The coupon value is invalid.',
      COUPON_VALID: 'Valid coupon.', COUPON_TOTAL_MISMATCH: 'The booking total does not match the current discount. Refresh the page and try again.'
    },
    pt: {
      NAME_REQUIRED: 'Digite seu nome.', EMAIL_INVALID: 'Digite um e-mail válido.', PHONE_INVALID: 'Digite um número de WhatsApp válido.',
      COUPON_CREATED: 'Cupom gerado com sucesso.', COUPON_EMPTY: 'Digite um código de desconto.', COUPON_NOT_FOUND: 'Código não encontrado.',
      COUPON_INACTIVE: 'Este cupom não está disponível.', COUPON_ALREADY_USED: 'Este cupom já foi utilizado.', COUPON_NOT_STARTED: 'Este cupom ainda não está vigente.',
      COUPON_EXPIRED: 'Este cupom expirou.', COUPON_EMAIL_MISMATCH: 'Este cupom pertence a outro e-mail.', COUPON_CURRENCY_MISMATCH: 'Este cupom de valor fixo não corresponde à moeda da reserva.', COUPON_INVALID_VALUE: 'O valor do cupom não é válido.',
      COUPON_VALID: 'Cupom válido.', COUPON_TOTAL_MISMATCH: 'O total da reserva não corresponde ao desconto vigente. Atualize a página e tente novamente.'
    }
  };
  return (messages[lang] || messages.es)[key] || messages.es[key] || key;
}

function couponLabel_(type, value, currency, locale) {
  const lang = normalizeLocale_(locale);
  if (normalizeCouponType_(type) === 'fixed') {
    if (lang === 'en') return normalizeCurrency_(currency) + ' ' + round2_(value).toFixed(2) + ' off';
    if (lang === 'pt') return normalizeCurrency_(currency) + ' ' + round2_(value).toFixed(2) + ' de desconto';
    return normalizeCurrency_(currency) + ' ' + round2_(value).toFixed(2) + ' de descuento';
  }
  if (lang === 'en') return round2_(value) + '% off';
  if (lang === 'pt') return round2_(value) + '% de desconto';
  return round2_(value) + '% de descuento';
}

function couponEmailCopy_(locale) {
  const lang = normalizeLocale_(locale);
  const copies = {
    es: {
      subject: 'Tu cupón de descuento para My Cusco Trip',
      title: '¡Tu cupón está listo!',
      intro: 'Gracias por registrarte. Guarda este código personal para aplicarlo a tu reserva en My Cusco Trip.',
      codeLabel: 'Código de cupón',
      discount: 'Descuento',
      validUntil: 'Válido hasta',
      hurryTitle: '¡Aprovecha esta oportunidad!',
      hurry: 'Tienes al menos 48 horas para usar tu cupón y reservar tu tour con el mayor descuento aplicable a tu solicitud.',
      use: 'Ingresa a nuestra web, arma tu viaje y coloca este código en el campo de descuento antes de realizar el pago.',
      cta: 'Reservar con mi cupón',
      orVisit: 'También puedes ingresar directamente en:'
    },
    en: {
      subject: 'Your My Cusco Trip discount coupon',
      title: 'Your coupon is ready!',
      intro: 'Thank you for signing up. Save this personal code and apply it to your My Cusco Trip booking.',
      codeLabel: 'Coupon code',
      discount: 'Discount',
      validUntil: 'Valid until',
      hurryTitle: 'Take advantage of this opportunity!',
      hurry: 'You have at least 48 hours to use your coupon and book your tour with the highest discount applicable to your request.',
      use: 'Visit our website, build your trip and enter this code in the discount field before completing payment.',
      cta: 'Book with my coupon',
      orVisit: 'You can also visit:'
    },
    pt: {
      subject: 'Seu cupom de desconto My Cusco Trip',
      title: 'Seu cupom está pronto!',
      intro: 'Obrigado por se cadastrar. Guarde este código pessoal para aplicá-lo à sua reserva na My Cusco Trip.',
      codeLabel: 'Código do cupom',
      discount: 'Desconto',
      validUntil: 'Válido até',
      hurryTitle: 'Aproveite esta oportunidade!',
      hurry: 'Você tem pelo menos 48 horas para usar o seu cupom e reservar o passeio com o maior desconto aplicável à sua solicitação.',
      use: 'Acesse nosso site, monte sua viagem e digite este código no campo de desconto antes de efetuar o pagamento.',
      cta: 'Reservar com meu cupom',
      orVisit: 'Você também pode acessar:'
    }
  };
  return copies[lang] || copies.es;
}

function formatCouponExpiry_(date, locale) {
  if (!date) return '';
  const lang = normalizeLocale_(locale);
  const pattern = lang === 'en' ? 'MMM d, yyyy · h:mm a' : 'dd/MM/yyyy · HH:mm';
  return Utilities.formatDate(date, getCouponTimeZone_(), pattern);
}

function normalizeLocale_(value) {
  const text = normalizeText_(value);
  if (text === 'en' || text.indexOf('english') >= 0 || text.indexOf('ingles') >= 0) return 'en';
  if (text === 'pt' || text.indexOf('portugu') >= 0) return 'pt';
  return 'es';
}

function boolean_(value, fallback) {
  if (typeof value === 'boolean') return value;
  const text = normalizeText_(value);
  if (!text) return Boolean(fallback);
  if (['true','1','si','yes','activo','vigente'].indexOf(text) >= 0) return true;
  if (['false','0','no','inactivo','deshabilitado'].indexOf(text) >= 0) return false;
  return Boolean(fallback);
}

function associateCouponWithPayment_(couponCode, reservationCode, paypalOrderId) {
  if (!couponCode) return;
  const coupon = findCoupon_(couponCode);
  if (!coupon) return;
  updateRowFields_(coupon, {
    CodigoReserva: reservationCode || coupon.row.CodigoReserva || '',
    PayPalOrderID: paypalOrderId || coupon.row.PayPalOrderID || ''
  });
}

function generateCouponCode_() {
  return 'MCT' + randomHex_(6) + '-' + randomAlphaNum_(3);
}

function generateReservationCode_() {
  return 'CUZ' + randomHex_(6);
}

function randomHex_(length) {
  let out = '';
  while (out.length < length) out += Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  return out.slice(0, length);
}

function randomAlphaNum_(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function normalizeCode_(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function normalizeText_(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeCurrency_(value) {
  return String(value || 'USD').trim().toUpperCase().slice(0, 3);
}

function clean_(value) {
  return String(value == null ? '' : value).trim();
}

function cleanEmail_(value) {
  return clean_(value).toLowerCase();
}

function number_(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2_(value) {
  return Math.round(number_(value, 0) * 100) / 100;
}

function addHours_(date, hours) {
  return new Date(date.getTime() + number_(hours, 0) * 60 * 60 * 1000);
}

function parseDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJsonSafe_(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch (err) { return fallback; }
}

function isValidEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean_(value));
}

function isValidPhone_(value) {
  const digits = clean_(value).replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function truncate_(value, max) {
  const text = clean_(value);
  return text.length > max ? text.slice(0, max - 1) : text;
}

function formatDateHuman_(date, lang) {
  const locale = normalizeText_(lang).indexOf('english') >= 0 || normalizeText_(lang) === 'en' ? 'en_US' : 'es_PE';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), locale === 'en_US' ? 'MMMM d, yyyy' : 'dd/MM/yyyy');
}

function escapeHtml_(value) {
  return clean_(value).replace(/[&<>"']/g, function(ch) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch];
  });
}

function getErrorMessage_(err) {
  return String(err && err.message ? err.message : err || 'Error desconocido');
}
