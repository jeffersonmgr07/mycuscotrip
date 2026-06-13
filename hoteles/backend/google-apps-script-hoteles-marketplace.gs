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
  sheet_(HOTEL_SHEETS.USERS, ['userId','email','name','role','status','propertyLimit','createdAt']);
  sheet_(HOTEL_SHEETS.PROPERTIES, ['propertyId','ownerUserId','type','name','destination','address','stars','status','description','cover','galleryJson','createdAt']);
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
