/**
 * My Cusco Trip - Hoteles Marketplace MVP (Google Apps Script)
 *
 * Hojas recomendadas:
 * - Hotel_Users: usuarios/administradores de alojamientos.
 * - Properties: hoteles, apartamentos o habitaciones publicables.
 * - Rooms: habitaciones/unidades vendibles dentro de cada alojamiento.
 * - Availability: bloqueos, reservas confirmadas, mantenimiento y cupos por fecha.
 * - Hotel_Orders: órdenes creadas desde hoteles/, paquetes o quote-packages.
 * - Payments: pagos/autorizaciones/capturas PayPal.
 * - Photo_Assets: URLs de fotos alojadas en Drive/CDN.
 */

const HOTEL_SHEETS = {
  USERS: 'Hotel_Users',
  PROPERTIES: 'Properties',
  ROOMS: 'Rooms',
  AVAILABILITY: 'Availability',
  ORDERS: 'Hotel_Orders',
  PAYMENTS: 'Payments',
  PHOTOS: 'Photo_Assets'
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
  if (action === 'update_owner') return jsonResponse(updateHotelOwner_(payload));
  if (action === 'create_property') return jsonResponse(createProperty_(payload));
  if (action === 'create_room') return jsonResponse(createRoom_(payload));
  if (action === 'update_confirmation_mode') return jsonResponse(updateConfirmationMode_(payload));
  if (action === 'create_order') return jsonResponse(createHotelOrder_(payload));
  if (action === 'block_dates') return jsonResponse(blockDates_(payload));
  return jsonResponse({ ok: false, error: 'Acción no válida' });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length) sh.appendRow(headers);
  }
  return sh;
}
function uuid_(prefix) { return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase(); }

function setupHotelMarketplaceSheets() {
  sheet_(HOTEL_SHEETS.USERS, ['userId','registrationType','email','passwordHash','firstName','lastName','docType','docNumber','nationality','phoneCode','phone','businessName','taxId','website','role','status','propertyLimit','createdAt','updatedAt']);
  sheet_(HOTEL_SHEETS.PROPERTIES, ['propertyId','ownerUserId','type','name','destination','address','stars','status','confirmationMode','description','cover','galleryJson','createdAt','updatedAt']);
  sheet_(HOTEL_SHEETS.ROOMS, ['roomId','propertyId','roomName','roomType','capacity','basePriceUsd','currency','status','description','createdAt','updatedAt']);
  sheet_(HOTEL_SHEETS.AVAILABILITY, ['availabilityId','propertyId','roomId','date','status','availableUnits','priceUsd','source','orderId','notes','updatedAt']);
  sheet_(HOTEL_SHEETS.ORDERS, ['orderId','source','createdAt','propertyId','roomId','assignedRoomId','checkin','checkout','nights','adults','children','guestName','guestEmail','guestPhone','amount','currency','confirmationMode','reservationStatus','paymentStatus','paypalOrderId','paypalAuthorizationId','rawJson']);
  sheet_(HOTEL_SHEETS.PAYMENTS, ['paymentId','orderId','provider','intent','providerOrderId','authorizationId','captureId','status','amount','currency','createdAt','rawJson']);
  sheet_(HOTEL_SHEETS.PHOTOS, ['photoId','ownerUserId','propertyId','roomId','fileName','driveFileId','publicUrl','createdAt']);
  return { ok: true };
}

function getHotelCatalog_() {
  return { ok: true, message: 'Catálogo marketplace preparado. En el MVP el frontend puede seguir usando hotels.json mientras Properties/Rooms se conectan gradualmente.' };
}

function getAvailability_(params) {
  // Regla MVP:
  // Un alojamiento/habitación está disponible cuando NO existe una fila en Availability
  // con el mismo propertyId/roomId y una fecha dentro del rango checkin <= date < checkout
  // con status special_block, confirmed_reservation o scheduled_maintenance.
  return { ok: true, available: true, params: params };
}

function registerHotelOwner_(payload) {
  const sh = sheet_(HOTEL_SHEETS.USERS, ['userId','registrationType','email','passwordHash','firstName','lastName','docType','docNumber','nationality','phoneCode','phone','businessName','taxId','website','role','status','propertyLimit','createdAt','updatedAt']);
  const userId = uuid_('HUSR');
  sh.appendRow([
    userId,
    payload.registrationType || 'natural',
    payload.email || '',
    payload.password ? Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload.password)) : '',
    payload.firstName || '', payload.lastName || '', payload.docType || '', payload.docNumber || '', payload.nationality || '',
    payload.phoneCode || '', payload.phone || '', payload.businessName || '', payload.taxId || '', payload.website || '',
    'hotel_owner', 'pending_review', 3, new Date(), new Date()
  ]);
  return { ok: true, userId: userId, status: 'pending_review' };
}

function updateHotelOwner_(payload) {
  // MVP: registrar la actualización como evento simple. En siguiente etapa se busca userId y se actualiza fila.
  return { ok: true, message: 'Actualización recibida', payload: payload };
}

function createProperty_(payload) {
  const sh = sheet_(HOTEL_SHEETS.PROPERTIES, ['propertyId','ownerUserId','type','name','destination','address','stars','status','confirmationMode','description','cover','galleryJson','createdAt','updatedAt']);
  const propertyId = uuid_('HPR');
  sh.appendRow([
    propertyId, payload.ownerUserId || '', payload.type || 'hotel', payload.name || '', payload.destination || '', payload.address || '', payload.stars || '',
    'draft', payload.confirmationMode || 'manual', payload.description || '', payload.cover || '', payload.galleryJson || '[]', new Date(), new Date()
  ]);
  return { ok: true, propertyId: propertyId, status: 'draft' };
}

function createRoom_(payload) {
  const sh = sheet_(HOTEL_SHEETS.ROOMS, ['roomId','propertyId','roomName','roomType','capacity','basePriceUsd','currency','status','description','createdAt','updatedAt']);
  const roomId = uuid_('HRM');
  sh.appendRow([
    roomId, payload.propertyId || '', payload.roomName || '', payload.roomType || '', payload.capacity || 1, payload.basePriceUsd || 0, payload.currency || 'USD',
    'active', payload.description || '', new Date(), new Date()
  ]);
  return { ok: true, roomId: roomId };
}

function blockDates_(payload) {
  const sh = sheet_(HOTEL_SHEETS.AVAILABILITY, ['availabilityId','propertyId','roomId','date','status','availableUnits','priceUsd','source','orderId','notes','updatedAt']);
  const dates = payload.dates || [];
  dates.forEach(function(date) {
    sh.appendRow([
      uuid_('AVL'), payload.propertyId || '', payload.roomId || '', date,
      payload.status || 'special_block', payload.availableUnits || 0, payload.priceUsd || '', payload.source || 'owner', payload.orderId || '', payload.notes || '', new Date()
    ]);
  });
  return { ok: true, blocked: dates.length };
}

function createHotelOrder_(payload) {
  const sh = sheet_(HOTEL_SHEETS.ORDERS, ['orderId','source','createdAt','propertyId','roomId','assignedRoomId','checkin','checkout','nights','adults','children','guestName','guestEmail','guestPhone','amount','currency','confirmationMode','reservationStatus','paymentStatus','paypalOrderId','paypalAuthorizationId','rawJson']);
  const orderId = uuid_('HOT');
  sh.appendRow([
    orderId, payload.source || 'hoteles', new Date(), payload.propertyId || '', payload.roomId || '', payload.assignedRoomId || '', payload.checkin || '', payload.checkout || '', payload.nights || '', payload.adults || '', payload.children || '',
    payload.guestName || '', payload.guestEmail || '', payload.guestPhone || '', payload.amount || '', payload.currency || 'USD', payload.confirmationMode || 'instant', payload.reservationStatus || 'pending', payload.paymentStatus || 'PENDING', payload.paypalOrderId || '', payload.paypalAuthorizationId || '', JSON.stringify(payload)
  ]);
  if (payload.autoBlockDates && payload.checkin && payload.checkout) {
    blockDates_({ propertyId: payload.propertyId, roomId: payload.assignedRoomId || payload.roomId || '', dates: makeDateRange_(payload.checkin, payload.checkout), status: 'confirmed_reservation', source: payload.source || 'hoteles', orderId: orderId });
  }
  return { ok: true, orderId: orderId };
}

function updateConfirmationMode_(payload) {
  const sh = sheet_(HOTEL_SHEETS.PROPERTIES, ['propertyId','ownerUserId','type','name','destination','address','stars','status','confirmationMode','description','cover','galleryJson','createdAt','updatedAt']);
  const values = sh.getDataRange().getValues();
  const headers = values[0] || [];
  const idCol = headers.indexOf('propertyId');
  const modeCol = headers.indexOf('confirmationMode');
  const updatedCol = headers.indexOf('updatedAt');
  for (var i = 1; i < values.length; i++) {
    if (values[i][idCol] === payload.propertyId) {
      sh.getRange(i + 1, modeCol + 1).setValue(payload.confirmationMode || 'manual');
      if (updatedCol >= 0) sh.getRange(i + 1, updatedCol + 1).setValue(new Date());
      return { ok: true, propertyId: payload.propertyId, confirmationMode: payload.confirmationMode || 'manual' };
    }
  }
  return { ok: false, error: 'Alojamiento no encontrado' };
}

function makeDateRange_(from, to) {
  const dates = [];
  if (!from || !to) return dates;
  const cursor = new Date(from + 'T12:00:00');
  const end = new Date(to + 'T12:00:00');
  while (cursor < end) {
    dates.push(Utilities.formatDate(cursor, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
