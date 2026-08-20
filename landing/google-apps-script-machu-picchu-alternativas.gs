/**
 * Backend unificado My Cusco Trip
 *
 * Atiende:
 * 1. Landing de alternativas para Machu Picchu (compatibilidad con el formulario existente).
 * 2. Formularios públicos del sitio (Libro de Reclamaciones, delegaciones, trabajo,
 *    cambios/postergaciones, Ayahuasca y Matrimonio Andino).
 * 3. Consulta segura de vouchers y tickets usando código de reserva + correo registrado.
 *
 * DESPLIEGUE
 * - Vincular este proyecto a la hoja de cálculo de My Cusco Trip.
 * - Implementar > Nueva implementación > Aplicación web.
 * - Ejecutar como: Yo.
 * - Acceso: Cualquier usuario.
 * - Copiar la URL /exec en assets/js/config/public-forms-config.js.
 */

const LEGACY_SHEET_NAME = 'Leads Machu Picchu Alternativas';
const DOCUMENTS_SHEET_NAME = 'Documentos_Reserva';
const ADMIN_EMAILS = ['contact@mycuscotrip.com', 'reservas@mycuscotrip.com'];
const BRAND_NAME = 'My Cusco Trip';
const LOGO_URL = 'https://mycuscotrip.com/assets/img/logos/Logo1.png';

const FORM_SHEETS = Object.freeze({
  consumer_complaint: 'Libro_Reclamaciones',
  student_delegation: 'Delegaciones',
  job_application: 'Trabaja_Con_Nosotros',
  booking_postponement: 'Cambios_Postergaciones',
  ayahuasca_information: 'Solicitudes_Ayahuasca',
  andean_wedding: 'Matrimonio_Andino',
  general_contact: 'Solicitudes_Web'
});

function doPost(e) {
  try {
    const payload = parsePostPayload_(e);

    if (String(payload.action || '').toLowerCase() === 'public_form') {
      return jsonOutput_(processPublicForm_(payload));
    }

    // Mantiene operativo el formulario antiguo de la landing.
    return jsonOutput_(processLegacyMachuPicchuLead_(payload));
  } catch (error) {
    console.error(error);
    return jsonOutput_({ ok: false, message: 'No se pudo registrar la solicitud.', error: String(error) });
  }
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = String(params.action || '').toLowerCase();
    let response;

    if (action === 'lookup_documents') {
      response = lookupReservationDocuments_(params);
    } else if (action === 'health') {
      response = { ok: true, service: BRAND_NAME, timestamp: new Date().toISOString() };
    } else {
      response = { ok: false, message: 'Acción no reconocida.' };
    }

    return jsonOrJsonpOutput_(response, params.callback);
  } catch (error) {
    console.error(error);
    return jsonOrJsonpOutput_({ ok: false, message: 'No se pudo completar la consulta.', error: String(error) }, e && e.parameter && e.parameter.callback);
  }
}

function parsePostPayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  try {
    return JSON.parse(raw || '{}');
  } catch (error) {
    const params = (e && e.parameter) || {};
    return Object.assign({}, params);
  }
}

function processPublicForm_(payload) {
  const formType = sanitizeKey_(payload.formType || 'general_contact');
  const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const sheetName = FORM_SHEETS[formType] || FORM_SHEETS.general_contact;

  const record = Object.assign({
    submittedAtServer: new Date().toISOString(),
    formType: formType
  }, flattenObject_(data));

  appendObjectToSheet_(sheetName, record);
  sendPublicFormAdminEmail_(formType, data);
  if (isValidEmail_(data.email)) sendPublicFormClientEmail_(formType, data);

  return {
    ok: true,
    formType: formType,
    claimCode: data.claimCode || '',
    message: formType === 'consumer_complaint'
      ? 'Reclamo o queja registrado.'
      : 'Solicitud registrada.'
  };
}

function processLegacyMachuPicchuLead_(data) {
  const sheet = getOrCreateLegacySheet_();
  sheet.appendRow([
    new Date(),
    data.fullName || '',
    data.email || '',
    data.whatsapp || '',
    data.countryCode || '',
    data.whatsappNumber || '',
    data.contactMethod || '',
    data.travelStart || '',
    data.travelEnd || '',
    data.adults || '',
    data.children || '',
    data.travelers || '',
    data.preferredPackage || '',
    data.flightStatus || '',
    data.message || '',
    data.page || '',
    JSON.stringify(data.utm || {})
  ]);

  sendLegacyAdminEmail_(data);
  if (isValidEmail_(data.email)) sendLegacyClientEmail_(data);
  return { ok: true };
}

function getOrCreateLegacySheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LEGACY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(LEGACY_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Fecha registro', 'Nombre', 'Correo', 'WhatsApp', 'Código país', 'Número',
      'Método contacto', 'Llegada Cusco', 'Fecha límite/retorno', 'Adultos', 'Niños',
      'Total turistas', 'Paquete interés', 'Estado vuelos', 'Mensaje adicional', 'Página', 'UTM'
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendObjectToSheet_(sheetName, record) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const keys = Object.keys(record);
  let headers = [];
  if (sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].filter(String);
  }

  if (!headers.length) {
    headers = keys.slice();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    const missing = keys.filter(function(key) { return headers.indexOf(key) === -1; });
    if (missing.length) {
      sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
      headers = headers.concat(missing);
    }
  }

  const row = headers.map(function(header) {
    const value = record[header];
    if (Array.isArray(value)) return safeSheetValue_(value.join(' | '));
    if (value && typeof value === 'object') return safeSheetValue_(JSON.stringify(value));
    return safeSheetValue_(value === undefined || value === null ? '' : value);
  });
  sheet.appendRow(row);
}

function flattenObject_(value, prefix, target) {
  prefix = prefix || '';
  target = target || {};
  Object.keys(value || {}).forEach(function(key) {
    const current = value[key];
    const nextKey = prefix ? prefix + '.' + key : key;
    if (current && typeof current === 'object' && !Array.isArray(current) && !(current instanceof Date)) {
      flattenObject_(current, nextKey, target);
    } else {
      target[nextKey] = Array.isArray(current) ? current.join(' | ') : current;
    }
  });
  return target;
}

function safeSheetValue_(value) {
  if (typeof value !== 'string') return value;
  // Evita que datos ingresados por usuarios se interpreten como fórmulas en Sheets.
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function lookupReservationDocuments_(params) {
  const reservationCode = normalizeText_(params.reservationCode).toUpperCase();
  const identifier = normalizeText_(params.identifier || params.lastName || params.email);
  const requestedType = normalizeText_(params.documentType || 'all').toLowerCase();

  if (!reservationCode || !identifier) {
    return { ok: false, message: 'Ingresa el código de reserva y el apellido del titular.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DOCUMENTS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: true, documents: [], message: 'Todavía no hay documentos asignados.' };
  }

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift().map(function(value) { return normalizeHeader_(value); });
  const index = headerIndex_(headers);
  const codeIdx = firstIndex_(index, ['reservationcode', 'codigoreserva', 'codigo', 'bookingcode']);
  const emailIdx = firstIndex_(index, ['email', 'correo', 'correoregistrado']);
  const surnameIdx = firstIndex_(index, ['holderlastname', 'titularapellido', 'apellido', 'apellidotitular']);

  if (codeIdx < 0) throw new Error('La hoja Documentos_Reserva debe incluir reservationCode.');

  const reservationIdentity = getReservationIdentityForDocuments_(ss, reservationCode);
  let authorized = reservationIdentity ? identityMatchesForDocuments_(reservationIdentity.email, reservationIdentity.lastName, identifier) : false;

  if (!authorized) {
    authorized = values.some(function(row) {
      if (normalizeText_(row[codeIdx]).toUpperCase() !== reservationCode) return false;
      return identityMatchesForDocuments_(emailIdx >= 0 ? row[emailIdx] : '', surnameIdx >= 0 ? row[surnameIdx] : '', identifier);
    });
  }
  if (!authorized) return { ok: true, documents: [], message: 'No existe una reserva con esos datos.' };

  const now = new Date();
  const timeZone = 'America/Lima';
  const documents = [];
  values.forEach(function(row) {
    const rowCode = normalizeText_(row[codeIdx]).toUpperCase();
    if (rowCode !== reservationCode) return;

    const type = getByAliases_(row, index, ['documenttype', 'tipodocumento', 'tipo']) || 'Documento de viaje';
    const normalizedType = normalizeText_(type).toLowerCase();
    const isVoucher = normalizedType.indexOf('voucher') !== -1;
    if (requestedType === 'voucher' && !isVoucher) return;
    if (requestedType === 'tickets' && isVoucher) return;

    const serviceDateRaw = getByAliases_(row, index, ['servicedate', 'fechaservicio', 'fechaviaje']);
    const explicitAvailableRaw = getByAliases_(row, index, ['availablefrom', 'disponibledesde', 'fechahabilitacion']);
    const releaseDaysRaw = getByAliases_(row, index, ['releasedays', 'diasantes', 'diasliberacion']);
    const serviceDate = parseDocumentDate_(serviceDateRaw);
    let availableFrom = parseDocumentDate_(explicitAvailableRaw);
    const releaseDays = Math.max(0, Number(releaseDaysRaw || 10) || 10);
    if (!availableFrom && serviceDate && !isVoucher) {
      availableFrom = new Date(serviceDate.getTime());
      availableFrom.setDate(availableFrom.getDate() - releaseDays);
    }
    const locked = !isVoucher && availableFrom && startOfDay_(now).getTime() < startOfDay_(availableFrom).getTime();

    documents.push({
      type: type,
      title: getByAliases_(row, index, ['title', 'titulo', 'nombre']) || type,
      description: getByAliases_(row, index, ['description', 'descripcion', 'detalle']) || '',
      url: locked ? '' : sanitizeDocumentUrl_(getByAliases_(row, index, ['url', 'enlace', 'link', 'archivo'])),
      status: locked ? 'Aún no habilitado' : (getByAliases_(row, index, ['status', 'estado']) || 'Disponible'),
      serviceDate: serviceDateRaw || '',
      releaseDays: releaseDays,
      locked: Boolean(locked),
      availableFrom: availableFrom ? Utilities.formatDate(availableFrom, timeZone, 'yyyy-MM-dd') : '',
      availableFromLabel: availableFrom ? Utilities.formatDate(availableFrom, timeZone, 'dd/MM/yyyy') : '',
      updatedAt: getByAliases_(row, index, ['updatedat', 'actualizado', 'fechaactualizacion']) || ''
    });
  });

  return { ok: true, reservationCode: reservationCode, documents: documents };
}

function getReservationIdentityForDocuments_(ss, reservationCode) {
  const sheet = ss.getSheetByName('Reservas');
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift().map(function(value) { return normalizeHeader_(value); });
  const index = headerIndex_(headers);
  const codeIdx = firstIndex_(index, ['codigoreserva', 'reservationcode', 'codigo']);
  const emailIdx = firstIndex_(index, ['titularemail', 'email', 'correo']);
  const surnameIdx = firstIndex_(index, ['titularapellido', 'apellido', 'holderlastname']);
  if (codeIdx < 0) return null;
  for (let i = 0; i < values.length; i++) {
    if (normalizeText_(values[i][codeIdx]).toUpperCase() === reservationCode) {
      return { email: emailIdx >= 0 ? values[i][emailIdx] : '', lastName: surnameIdx >= 0 ? values[i][surnameIdx] : '' };
    }
  }
  return null;
}

function normalizeIdentityText_(value) {
  return String(value === undefined || value === null ? '' : value)
    .trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function identityMatchesForDocuments_(email, lastName, identifier) {
  const id = normalizeIdentityText_(identifier);
  if (!id) return false;
  if (id.indexOf('@') >= 0) return normalizeIdentityText_(email) === id;
  const storedTokens = normalizeIdentityText_(lastName).split(/\s+/).filter(String);
  const suppliedTokens = id.split(/\s+/).filter(String);
  if (!storedTokens.length || !suppliedTokens.length) return false;
  return suppliedTokens.every(function(token) { return storedTokens.indexOf(token) >= 0; });
}

function parseDocumentDate_(value) {
  const text = normalizeText_(value);
  if (!text) return null;
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12, 0, 0);
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function startOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function normalizeHeader_(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function headerIndex_(headers) {
  const result = {};
  headers.forEach(function(header, i) { if (header && result[header] === undefined) result[header] = i; });
  return result;
}

function firstIndex_(index, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    if (index[aliases[i]] !== undefined) return index[aliases[i]];
  }
  return -1;
}

function getByAliases_(row, index, aliases) {
  const idx = firstIndex_(index, aliases);
  return idx >= 0 ? row[idx] : '';
}

function sanitizeDocumentUrl_(value) {
  const url = normalizeText_(value);
  return /^https:\/\//i.test(url) ? url : '';
}

function sendPublicFormAdminEmail_(formType, data) {
  const meta = formMeta_(formType);
  const name = data.fullName || data.consumerName || data.representativeName || data.bookingHolderName || 'Solicitud web';
  const subject = meta.adminSubject + ' - ' + name;
  MailApp.sendEmail({
    to: ADMIN_EMAILS.join(','),
    subject: subject,
    htmlBody: publicFormEmailTemplate_(meta.title, meta.adminIntro, data, true),
    name: BRAND_NAME
  });
}

function sendPublicFormClientEmail_(formType, data) {
  const meta = formMeta_(formType);
  const claimText = data.claimCode ? ' Tu código de seguimiento es ' + data.claimCode + '.' : '';
  MailApp.sendEmail({
    to: data.email,
    subject: meta.clientSubject,
    htmlBody: publicFormEmailTemplate_(meta.title, meta.clientIntro + claimText, data, false),
    name: BRAND_NAME,
    replyTo: 'reservas@mycuscotrip.com'
  });
}

function formMeta_(formType) {
  const meta = {
    consumer_complaint: {
      title: 'Libro de Reclamaciones',
      adminSubject: 'Nuevo reclamo o queja',
      clientSubject: 'Constancia de registro en el Libro de Reclamaciones',
      adminIntro: 'Se registró una nueva hoja virtual del Libro de Reclamaciones.',
      clientIntro: 'Hemos registrado la información enviada mediante nuestro Libro de Reclamaciones. Conserva este correo como constancia. La respuesta será atendida dentro del plazo legal aplicable.'
    },
    student_delegation: {
      title: 'Solicitud para delegación',
      adminSubject: 'Nueva solicitud de delegación',
      clientSubject: 'Recibimos la solicitud de tu delegación',
      adminIntro: 'Se registró una solicitud para organizar un viaje grupal o académico.',
      clientIntro: 'Gracias por compartir la información de tu delegación. Nuestro equipo preparará los siguientes pasos y se comunicará por los datos registrados.'
    },
    job_application: {
      title: 'Postulación laboral',
      adminSubject: 'Nueva postulación',
      clientSubject: 'Recibimos tu postulación a My Cusco Trip',
      adminIntro: 'Se registró un nuevo perfil interesado en trabajar con My Cusco Trip.',
      clientIntro: 'Gracias por compartir tu perfil. Guardaremos la información para revisar oportunidades compatibles. El registro no garantiza una convocatoria o contratación.'
    },
    booking_postponement: {
      title: 'Cambio o postergación de reserva',
      adminSubject: 'Nueva solicitud de cambio o postergación',
      clientSubject: 'Recibimos tu solicitud de cambio',
      adminIntro: 'Se registró una solicitud relacionada con una reserva existente.',
      clientIntro: 'Hemos recibido tu solicitud. Nuestro equipo revisará la reserva, disponibilidad, políticas y posibles diferencias tarifarias antes de confirmar cualquier modificación.'
    },
    ayahuasca_information: {
      title: 'Solicitud de información sobre Ayahuasca',
      adminSubject: 'Nueva solicitud Ayahuasca',
      clientSubject: 'Recibimos tu solicitud de información',
      adminIntro: 'Se registró una solicitud de información y evaluación previa.',
      clientIntro: 'Gracias por escribirnos. Revisaremos tu solicitud antes de cualquier coordinación. El envío del formulario no confirma disponibilidad ni participación.'
    },
    andean_wedding: {
      title: 'Unión Eterna en los Andes',
      adminSubject: 'Nueva solicitud de Matrimonio Andino',
      clientSubject: 'Recibimos la solicitud para su ceremonia andina',
      adminIntro: 'Una pareja solicitó información para una ceremonia simbólica andina.',
      clientIntro: 'Gracias por confiar en My Cusco Trip para este momento especial. Revisaremos la fecha, el paquete y los detalles para preparar una propuesta personalizada.'
    },
    general_contact: {
      title: 'Solicitud web',
      adminSubject: 'Nueva solicitud desde la web',
      clientSubject: 'Recibimos tu solicitud',
      adminIntro: 'Se registró un nuevo formulario desde el sitio web.',
      clientIntro: 'Hemos recibido tu solicitud. Nuestro equipo se comunicará contigo por los datos registrados.'
    }
  };
  return meta[formType] || meta.general_contact;
}

function publicFormEmailTemplate_(title, intro, data, isAdmin) {
  const hiddenKeys = ['userAgent', 'adminEmails'];
  const labels = publicFormLabels_();
  const rows = Object.keys(data || {}).filter(function(key) {
    return hiddenKeys.indexOf(key) === -1 && data[key] !== '' && data[key] !== null && data[key] !== undefined;
  }).map(function(key) {
    const value = Array.isArray(data[key]) ? data[key].join(', ') : (typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
    return '<tr><td style="padding:10px 12px;border-bottom:1px solid #e8eee9;color:#66756e;font-weight:700;width:38%;vertical-align:top;">' + escapeHtml_(labels[key] || humanizeKey_(key)) + '</td><td style="padding:10px 12px;border-bottom:1px solid #e8eee9;color:#17322a;white-space:pre-wrap;">' + escapeHtml_(value) + '</td></tr>';
  }).join('');

  return emailShell_(title, intro, rows, isAdmin ? 'Formulario recibido desde el sitio web.' : 'Este mensaje confirma la recepción de la solicitud; no constituye una confirmación de reserva o servicio.');
}

function publicFormLabels_() {
  return {
    fullName: 'Nombre completo', email: 'Correo electrónico', whatsappDialCode: 'Código de país',
    whatsappNumber: 'WhatsApp', country: 'País', travelDate: 'Fecha aproximada', travelers: 'Viajeros',
    message: 'Mensaje', package: 'Paquete', experience: 'Experiencia', claimCode: 'Código de reclamo',
    claimDate: 'Fecha de reclamo', consumerName: 'Nombre del consumidor', bookingHolderName: 'Titular de reserva',
    reservationCode: 'Código de reserva', requestedDate: 'Nueva fecha solicitada', reason: 'Motivo',
    page: 'Página de origen', submittedAt: 'Fecha enviada desde navegador'
  };
}

function humanizeKey_(key) {
  return String(key || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' ').replace(/^./, function(c) { return c.toUpperCase(); });
}

function sendLegacyAdminEmail_(data) {
  MailApp.sendEmail({
    to: ADMIN_EMAILS.join(','),
    subject: 'Nuevo registro Machu Picchu - ' + (data.fullName || 'Lead'),
    htmlBody: legacyEmailTemplate_(data, true),
    name: BRAND_NAME
  });
}

function sendLegacyClientEmail_(data) {
  MailApp.sendEmail({
    to: data.email,
    subject: 'Hemos recibido tu solicitud para Machu Picchu',
    htmlBody: legacyEmailTemplate_(data, false),
    name: BRAND_NAME,
    replyTo: 'reservas@mycuscotrip.com'
  });
}

function legacyEmailTemplate_(data, isAdmin) {
  const title = isAdmin ? 'Nuevo formulario de registro' : 'Solicitud registrada correctamente';
  const intro = isAdmin
    ? 'Se registró una nueva solicitud desde la landing de alternativas para Machu Picchu.'
    : 'Gracias por registrarte. Nuestro equipo revisará tu caso y te contactará con la mejor alternativa que pueda evaluarse para tu fecha.';
  const fields = {
    'Nombre': data.fullName, 'Correo': data.email, 'WhatsApp': data.whatsapp,
    'Contacto preferido': data.contactMethod, 'Llegada a Cusco': data.travelStart,
    'Fecha límite / retorno': data.travelEnd, 'Adultos': data.adults, 'Niños': data.children,
    'Paquete de interés': data.preferredPackage, 'Estado de vuelos': data.flightStatus,
    'Mensaje adicional': data.message || 'Sin mensaje adicional'
  };
  const rows = Object.keys(fields).map(function(label) {
    return '<tr><td style="padding:10px 12px;border-bottom:1px solid #e8eee9;color:#66756e;font-weight:700;width:38%;">' + escapeHtml_(label) + '</td><td style="padding:10px 12px;border-bottom:1px solid #e8eee9;color:#17322a;">' + escapeHtml_(fields[label] || '') + '</td></tr>';
  }).join('');
  return emailShell_(title, intro, rows, 'El ingreso a Machu Picchu depende siempre de disponibilidad y confirmación oficial.');
}

function emailShell_(title, intro, rows, note) {
  return '<div style="margin:0;padding:0;background:#f7faf8;font-family:Arial,Helvetica,sans-serif;color:#17322a;">' +
    '<div style="max-width:680px;margin:0 auto;padding:28px 16px;">' +
    '<div style="background:#fff;border-radius:22px;overflow:hidden;border:1px solid #e8eee9;box-shadow:0 18px 45px rgba(10,58,38,.10);">' +
    '<div style="background:#0a3a26;padding:24px;text-align:center;">' +
    '<img src="' + LOGO_URL + '" alt="My Cusco Trip" style="max-width:175px;height:auto;margin-bottom:12px;" />' +
    '<h1 style="margin:0;color:#fff;font-size:24px;line-height:1.25;">' + escapeHtml_(title) + '</h1></div>' +
    '<div style="padding:24px;"><p style="margin:0 0 18px;color:#17322a;font-size:15px;line-height:1.7;">' + escapeHtml_(intro) + '</p>' +
    '<table style="width:100%;border-collapse:collapse;background:#fbfdfb;border-radius:16px;overflow:hidden;border:1px solid #e8eee9;">' + rows + '</table>' +
    '<p style="margin:20px 0 0;color:#66756e;font-size:13px;line-height:1.6;">' + escapeHtml_(note) + '</p>' +
    '</div></div></div></div>';
}

function normalizeText_(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

function sanitizeKey_(value) {
  return normalizeText_(value).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 80) || 'general_contact';
}

function isValidEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText_(value));
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function jsonOrJsonpOutput_(data, callback) {
  const json = JSON.stringify(data);
  const safeCallback = String(callback || '').replace(/[^a-zA-Z0-9_.$]/g, '');
  if (safeCallback) {
    return ContentService.createTextOutput(safeCallback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
