/**
 * My Cusco Trip - Hoteles Marketplace MVP (Google Apps Script)
 * Estructura sugerida para manejar catálogo, disponibilidad, usuarios hoteleros y órdenes.
 *
 * Hojas:
 * - Hotel_Users
 * - Properties
 * - Rooms
 * - Availability
 * - Hotel_Orders
 * - Payments
 */

const HOTEL_SHEETS = {
  USERS: 'Hotel_Users',
  PROPERTIES: 'Properties',
  ROOMS: 'Rooms',
  AVAILABILITY: 'Availability',
  ORDERS: 'Hotel_Orders',
  PAYMENTS: 'Payments'
};

function doGet(e) {
  const action = String(e.parameter.action || 'catalog');
  if (action === 'catalog') return jsonResponse(getHotelCatalog_());
  if (action === 'availability') return jsonResponse(getAvailability_(e.parameter));
  return jsonResponse({ ok: false, error: 'Acción no válida' });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || '{}');
  const action = payload.action || '';
  if (action === 'register_owner') return jsonResponse(registerHotelOwner_(payload));
  if (action === 'create_property') return jsonResponse(createProperty_(payload));
  if (action === 'create_room') return jsonResponse(createRoom_(payload));
  if (action === 'update_confirmation_mode') return jsonResponse(updateConfirmationMode_(payload));
  if (action === 'create_order') return jsonResponse(createHotelOrder_(payload));
  if (action === 'block_dates') return jsonResponse(blockDates_(payload));
  return jsonResponse({ ok: false, error: 'Acción no válida' });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length) sh.appendRow(headers);
  }
  return sh;
}

function setupHotelMarketplaceSheets() {
  sheet_(HOTEL_SHEETS.USERS, ['userId','email','firstName','lastName','docType','docNumber','nationality','phone','accountType','businessName','taxId','role','status','propertyLimit','createdAt']);
  sheet_(HOTEL_SHEETS.PROPERTIES, ['propertyId','ownerUserId','type','name','destination','address','stars','status','confirmationMode','description','cover','galleryJson','createdAt']);
  sheet_(HOTEL_SHEETS.ROOMS, ['roomId','propertyId','roomType','capacity','basePriceUsd','currency','status','description','createdAt']);
  sheet_(HOTEL_SHEETS.AVAILABILITY, ['availabilityId','propertyId','roomId','date','status','availableUnits','priceUsd','source','orderId','updatedAt']);
  sheet_(HOTEL_SHEETS.ORDERS, ['orderId','createdAt','propertyId','roomId','checkin','checkout','nights','adults','children','guestName','guestEmail','guestPhone','amount','currency','paymentStatus','paypalOrderId','rawJson']);
  sheet_(HOTEL_SHEETS.PAYMENTS, ['paymentId','orderId','provider','providerOrderId','status','amount','currency','createdAt','rawJson']);
  return { ok: true };
}

function getHotelCatalog_() {
  // MVP: leer Properties y Rooms. En la etapa actual el frontend todavía puede usar hotels.json.
  return { ok: true, message: 'Catálogo marketplace preparado. Conectar lectura de Properties/Rooms en la siguiente etapa.' };
}

function getAvailability_(params) {
  // Regla MVP:
  // available = no existe bloqueo/reserva en Availability para el rango consultado.
  return { ok: true, available: true, params: params };
}

function createHotelOrder_(payload) {
  const sh = sheet_(HOTEL_SHEETS.ORDERS, ['orderId','createdAt','propertyId','roomId','checkin','checkout','nights','adults','children','guestName','guestEmail','guestPhone','amount','currency','paymentStatus','paypalOrderId','rawJson']);
  const orderId = 'HOT-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  sh.appendRow([
    orderId,
    new Date(),
    payload.propertyId || '',
    payload.roomId || '',
    payload.checkin || '',
    payload.checkout || '',
    payload.nights || '',
    payload.adults || '',
    payload.children || '',
    payload.guestName || '',
    payload.guestEmail || '',
    payload.guestPhone || '',
    payload.amount || '',
    payload.currency || 'USD',
    payload.paymentStatus || 'PENDING',
    payload.paypalOrderId || '',
    JSON.stringify(payload)
  ]);
  return { ok: true, orderId };
}

function blockDates_(payload) {
  const sh = sheet_(HOTEL_SHEETS.AVAILABILITY, ['availabilityId','propertyId','roomId','date','status','availableUnits','priceUsd','source','orderId','updatedAt']);
  const dates = payload.dates || [];
  dates.forEach(function(date) {
    sh.appendRow([
      'AVL-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
      payload.propertyId || '',
      payload.roomId || '',
      date,
      payload.status || 'blocked',
      payload.availableUnits || 0,
      payload.priceUsd || '',
      payload.source || 'owner',
      payload.orderId || '',
      new Date()
    ]);
  });
  return { ok: true, blocked: dates.length };
}

function registerHotelOwner_(payload) {
  const sh = sheet_(HOTEL_SHEETS.USERS, ['userId','email','firstName','lastName','docType','docNumber','nationality','phone','accountType','businessName','taxId','role','status','propertyLimit','createdAt']);
  const userId = 'HUSR-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  sh.appendRow([
    userId, payload.email || '', payload.firstName || '', payload.lastName || '', payload.docType || '', payload.docNumber || '',
    payload.nationality || '', payload.phone || '', payload.accountType || 'PERSON', payload.businessName || '', payload.taxId || '',
    'hotel_owner', 'pending_review', 3, new Date()
  ]);
  return { ok: true, userId: userId, status: 'pending_review' };
}

function createProperty_(payload) {
  const sh = sheet_(HOTEL_SHEETS.PROPERTIES, ['propertyId','ownerUserId','type','name','destination','address','stars','status','confirmationMode','description','cover','galleryJson','createdAt']);
  const propertyId = 'HPR-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  sh.appendRow([
    propertyId, payload.ownerUserId || '', payload.type || 'hotel', payload.name || '', payload.destination || '', payload.address || '', payload.stars || '',
    'draft', payload.confirmationMode || 'manual', payload.description || '', payload.cover || '', payload.galleryJson || '[]', new Date()
  ]);
  return { ok: true, propertyId: propertyId, status: 'draft' };
}

function createRoom_(payload) {
  const sh = sheet_(HOTEL_SHEETS.ROOMS, ['roomId','propertyId','roomType','capacity','basePriceUsd','currency','status','description','createdAt']);
  const roomId = 'HRM-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  sh.appendRow([
    roomId, payload.propertyId || '', payload.roomType || '', payload.capacity || 1, payload.basePriceUsd || 0, payload.currency || 'USD',
    'active', payload.description || '', new Date()
  ]);
  return { ok: true, roomId: roomId };
}

function updateConfirmationMode_(payload) {
  // MVP: registra el cambio como una fila de auditoría en Properties si aún no existe lógica de actualización por ID.
  // En la siguiente etapa se puede actualizar la fila existente buscando propertyId.
  const sh = sheet_(HOTEL_SHEETS.PROPERTIES, ['propertyId','ownerUserId','type','name','destination','address','stars','status','confirmationMode','description','cover','galleryJson','createdAt']);
  const values = sh.getDataRange().getValues();
  const headers = values[0] || [];
  const idCol = headers.indexOf('propertyId');
  const modeCol = headers.indexOf('confirmationMode');
  for (var i = 1; i < values.length; i++) {
    if (values[i][idCol] === payload.propertyId) {
      sh.getRange(i + 1, modeCol + 1).setValue(payload.confirmationMode || 'manual');
      return { ok: true, propertyId: payload.propertyId, confirmationMode: payload.confirmationMode || 'manual' };
    }
  }
  return { ok: false, error: 'Alojamiento no encontrado' };
}
