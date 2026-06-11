(() => {
  const DATA_URL = './assets/data/hotels.json';
  const state = {
    destinations: {},
    hotels: [],
    activeHotel: null,
    activeSearch: null,
    activeRoom: null,
    activeGuest: null,
    galleryIndex: 0,
    paypalRenderedFor: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const money = (amount, currency = 'USD') => `${currency === 'PEN' ? 'S/' : '$'} ${Number(amount || 0).toFixed(2)}`;
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const asset = (path) => String(path || './assets/img/placeholder/experience.jpg').replace(/^\.\//, './');

  const VISIBLE_DESTINATIONS = [
    { value: 'all', label: 'Todos los destinos', keys: null },
    { value: 'cusco', label: 'Cusco', keys: ['cusco'] },
    { value: 'aguas-calientes', label: 'Aguas Calientes', keys: ['aguas-calientes'] },
    { value: 'lima', label: 'Lima', keys: ['lima'] },
    { value: 'paracas-ica', label: 'Paracas / Ica', keys: ['paracas', 'ica'] },
    { value: 'arequipa', label: 'Arequipa', keys: ['arequipa'] },
    { value: 'puno', label: 'Puno', keys: ['puno'] },
    { value: 'uyuni', label: 'Uyuni', keys: ['uyuni'] },
  ];

  function isoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDays(value, days) {
    const date = value ? new Date(`${value}T12:00:00`) : new Date();
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }

  function nightsBetween(checkin, checkout) {
    if (!checkin || !checkout) return 1;
    const start = new Date(`${checkin}T12:00:00`);
    const end = new Date(`${checkout}T12:00:00`);
    const diff = Math.round((end - start) / 86400000);
    return Math.max(1, diff || 1);
  }

  function getRoomPrice(room) {
    if (!room) return { currency: 'USD', amount: 0 };
    return room.publishedPricing ||
      (room.pricePerNight ? { currency: room.currency || 'USD', amount: room.pricePerNight } : null) ||
      room.targetNet ||
      room.netCost ||
      { currency: 'USD', amount: 0 };
  }

  function getLowestRoom(hotel) {
    return [...(hotel.rooms || [])]
      .sort((a, b) => Number(getRoomPrice(a).amount || 0) - Number(getRoomPrice(b).amount || 0))[0];
  }

  function compatibleRooms(hotel, adults, children) {
    const total = Number(adults || 1) + Number(children || 0);
    return (hotel.rooms || []).filter((room) => {
      const maxAdults = Number(room.maxAdults || room.capacity || 99);
      const maxChildren = Number(room.maxChildren ?? 99);
      const capacity = Number(room.capacity || maxAdults + maxChildren || 99);
      return Number(adults || 1) <= maxAdults && Number(children || 0) <= maxChildren && total <= capacity;
    });
  }

  function getHotelGallery(hotel) {
    const images = [];
    if (hotel?.images?.cover) images.push(hotel.images.cover);
    if (Array.isArray(hotel?.images?.gallery)) images.push(...hotel.images.gallery);
    return [...new Set(images.filter(Boolean))];
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL);
      const data = await res.json();
      state.destinations = data.destinations || {};
      state.hotels = Object.entries(state.destinations).flatMap(([key, dest]) =>
        (dest.hotels || []).map((hotel) => ({
          ...hotel,
          destinationKey: key,
          destinationLabel: hotel.destinationLabel || dest.label || key,
        }))
      );
      renderFilters();
      renderHotels();
      bindEvents();
    } catch (error) {
      const grid = $('#hotelsGrid');
      if (grid) grid.innerHTML = '<div class="hotel-card"><div class="hotel-card__body"><h3>No se pudo cargar hotels.json</h3><p>Revisa la ruta assets/data/hotels.json.</p></div></div>';
      console.error(error);
    }
  }

  function renderFilters() {
    const select = $('#hotelDestinationFilter');
    if (!select) return;
    select.innerHTML = VISIBLE_DESTINATIONS.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
  }

  function getFilteredHotels() {
    const dest = $('#hotelDestinationFilter')?.value || 'all';
    const selected = VISIBLE_DESTINATIONS.find((item) => item.value === dest);
    const allowedKeys = selected?.keys;
    const query = ($('#hotelSearchInput')?.value || '').trim().toLowerCase();
    return state.hotels.filter((hotel) => {
      if (allowedKeys && !allowedKeys.includes(hotel.destinationKey)) return false;
      if (!allowedKeys && ['tarapoto', 'iquitos', 'tambopata'].includes(hotel.destinationKey)) return false;
      if (!query) return true;
      return [hotel.hotelName, hotel.destinationLabel, hotel.location, hotel.address, hotel.summary]
        .filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }

  function renderHotels() {
    const grid = $('#hotelsGrid');
    const count = $('#hotelCountLabel');
    if (!grid) return;
    const hotels = getFilteredHotels();
    if (count) count.textContent = `${hotels.length} hotel(es) encontrados`;
    grid.innerHTML = hotels.map(renderHotelCard).join('') || '<div class="hotel-card"><div class="hotel-card__body"><h3>No hay hoteles para este filtro</h3><p>Prueba con otro destino o búsqueda.</p></div></div>';
  }

  function renderHotelCard(hotel) {
    const cover = asset(hotel.images?.cover || hotel.images?.gallery?.[0]);
    const room = getLowestRoom(hotel);
    const price = getRoomPrice(room);
    const features = [hotel.amenities?.breakfast, ...(hotel.features || [])].filter(Boolean).slice(0, 4);
    return `
      <article class="hotel-card">
        <div class="hotel-card__media">
          <img src="${escapeHtml(cover)}" alt="${escapeHtml(hotel.hotelName)}" loading="lazy">
          <span class="hotel-card__badge">${escapeHtml(hotel.destinationLabel || hotel.location || 'Perú')} · ${hotel.stars ? '★'.repeat(Number(hotel.stars)) : 'Hotel'}</span>
        </div>
        <div class="hotel-card__body">
          <h3>${escapeHtml(hotel.hotelName)}</h3>
          <p>${escapeHtml(hotel.summary || hotel.address || '')}</p>
          <div class="hotel-card__features">${features.map((item) => `<span>${escapeHtml(String(item).replace(/^Desayuno:\s*/i, ''))}</span>`).join('')}</div>
          <div class="hotel-card__footer">
            <div class="hotel-card__price"><small>Desde / noche</small><strong>${money(price.amount, price.currency)}</strong></div>
            <button type="button" data-view-hotel="${escapeHtml(hotel.hotelCode)}">Ver hotel</button>
          </div>
        </div>
      </article>`;
  }

  function renderGallery() {
    const hotel = state.activeHotel;
    const mount = $('#hotelGalleryMount');
    if (!hotel || !mount) return;
    const gallery = getHotelGallery(hotel);
    const safeIndex = Math.max(0, Math.min(state.galleryIndex, gallery.length - 1));
    state.galleryIndex = safeIndex;
    const current = asset(gallery[safeIndex] || hotel.images?.cover);
    mount.innerHTML = `
      <img src="${escapeHtml(current)}" alt="${escapeHtml(hotel.hotelName)}">
      ${gallery.length > 1 ? `
        <button type="button" class="hotel-gallery-btn hotel-gallery-btn--prev" data-hotel-gallery="prev" aria-label="Imagen anterior"><i class="fa-solid fa-chevron-left"></i></button>
        <button type="button" class="hotel-gallery-btn hotel-gallery-btn--next" data-hotel-gallery="next" aria-label="Imagen siguiente"><i class="fa-solid fa-chevron-right"></i></button>
        <span class="hotel-gallery-counter">${safeIndex + 1} / ${gallery.length}</span>` : ''}`;
  }

  function moveGallery(direction) {
    const gallery = getHotelGallery(state.activeHotel);
    if (!gallery.length) return;
    state.galleryIndex = direction === 'next'
      ? (state.galleryIndex + 1) % gallery.length
      : (state.galleryIndex - 1 + gallery.length) % gallery.length;
    renderGallery();
  }

  function openHotel(hotelCode) {
    const hotel = state.hotels.find((item) => item.hotelCode === hotelCode);
    if (!hotel) return;
    state.activeHotel = hotel;
    state.activeSearch = null;
    state.activeRoom = null;
    state.activeGuest = null;
    state.galleryIndex = 0;
    state.paypalRenderedFor = null;

    const modal = $('#hotelDetailModal');
    const content = $('#hotelDetailContent');
    if (!modal || !content) return;

    const features = [hotel.amenities?.breakfast, hotel.amenities?.checkin, hotel.amenities?.checkout, ...(hotel.features || [])]
      .filter(Boolean).slice(0, 9);
    const tomorrow = addDays('', 1);
    const dayAfter = addDays(tomorrow, 1);

    content.innerHTML = `
      <section class="hotel-detail">
        <div id="hotelGalleryMount" class="hotel-detail__gallery"></div>
        <div class="hotel-detail__info">
          <div class="hotel-title-block">
            <h2 id="hotelDetailTitle">${escapeHtml(hotel.hotelName)}</h2>
            <div class="hotel-detail__meta">${hotel.stars ? '★'.repeat(Number(hotel.stars)) : 'Hotel'} · ${escapeHtml(hotel.address || hotel.location || '')}</div>
          </div>
          <p>${escapeHtml(hotel.summary || '')}</p>
          <div class="hotel-detail__features">${features.map((item) => `<span>${escapeHtml(String(item).replace(/^Desayuno:\s*/i, ''))}</span>`).join('')}</div>
          <div class="hotel-reservation-box">
            <h3>Detalles de tu reserva</h3>
            <div class="hotel-reservation-grid">
              <label>Entrada <input id="hotelCheckin" type="date" min="${tomorrow}" value="${tomorrow}"></label>
              <label>Salida <input id="hotelCheckout" type="date" min="${dayAfter}" value="${dayAfter}"></label>
              <label>Adultos <input id="hotelAdults" type="number" min="1" value="2"></label>
              <label>Niños <input id="hotelChildren" type="number" min="0" value="0"></label>
            </div>
            <button type="button" class="hotel-search-availability-btn" id="hotelSearchAvailabilityBtn"><i class="fa-solid fa-magnifying-glass"></i> Ver disponibilidad</button>
            <div id="hotelRoomsPanel" class="hotel-rooms-panel" hidden></div>
            <div id="hotelPaymentPanel" class="hotel-payment-panel" hidden></div>
          </div>
        </div>
      </section>`;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    bindDateRules();
    renderGallery();
  }

  function bindDateRules() {
    const checkin = $('#hotelCheckin');
    const checkout = $('#hotelCheckout');
    if (!checkin || !checkout) return;
    const syncCheckout = () => {
      const minCheckout = addDays(checkin.value, 1);
      checkout.min = minCheckout;
      if (!checkout.value || checkout.value <= checkin.value) checkout.value = minCheckout;
    };
    checkin.addEventListener('change', syncCheckout);
    syncCheckout();
  }

  function showAvailability() {
    const hotel = state.activeHotel;
    if (!hotel) return;
    const checkin = $('#hotelCheckin')?.value;
    const checkout = $('#hotelCheckout')?.value;
    const adults = Number($('#hotelAdults')?.value || 1);
    const children = Number($('#hotelChildren')?.value || 0);
    const panel = $('#hotelRoomsPanel');
    const payment = $('#hotelPaymentPanel');
    if (!panel) return;

    if (!checkin || !checkout || checkout <= checkin) {
      panel.hidden = false;
      panel.innerHTML = '<p class="hotel-inline-alert">Selecciona una fecha de salida posterior a la fecha de entrada.</p>';
      return;
    }

    const nights = nightsBetween(checkin, checkout);
    const rooms = compatibleRooms(hotel, adults, children);
    state.activeSearch = { checkin, checkout, adults, children, nights };
    state.activeRoom = null;
    state.activeGuest = null;
    state.paypalRenderedFor = null;
    if (payment) {
      payment.hidden = true;
      payment.innerHTML = '';
    }

    panel.hidden = false;
    if (!rooms.length) {
      panel.innerHTML = '<p class="hotel-inline-alert">No hay acomodaciones compatibles con esta cantidad de pasajeros. Ajusta adultos/niños o solicita ayuda a un asesor.</p>';
      return;
    }

    panel.innerHTML = `
      <div class="hotel-rooms-panel__head">
        <strong>Acomodaciones disponibles</strong>
        <small>${nights} noche(s) · ${adults} adulto(s)${children ? ` · ${children} niño(s)` : ''}</small>
      </div>
      <div class="hotel-room-list">${rooms.map((room, idx) => renderRoomOption(room, idx, nights)).join('')}</div>
      <button type="button" class="hotel-book-btn" id="hotelStartBookingBtn">Reservar</button>`;
  }

  function renderRoomOption(room, idx, nights) {
    const price = getRoomPrice(room);
    const total = Number(price.amount || 0) * Number(nights || 1);
    return `<label class="hotel-room-option">
      <input type="radio" name="hotelRoom" value="${escapeHtml(room.roomType || room.label || String(idx))}" ${idx === 0 ? 'checked' : ''}>
      <span><strong>${escapeHtml(room.label || room.roomType)}</strong><small>${escapeHtml(room.bedType || '')} · Capacidad ${escapeHtml(room.capacity || '')}</small></span>
      <em>${money(total, price.currency)}<small>${money(price.amount, price.currency)} / noche</small></em>
    </label>`;
  }

  function getSelectedRoom() {
    const hotel = state.activeHotel;
    const selected = document.querySelector('input[name="hotelRoom"]:checked')?.value;
    if (!hotel || !selected) return null;
    return (hotel.rooms || []).find((room) => String(room.roomType || room.label) === selected) || (hotel.rooms || [])[0];
  }

  function startBooking() {
    const hotel = state.activeHotel;
    const search = state.activeSearch;
    const room = getSelectedRoom();
    const panel = $('#hotelPaymentPanel');
    if (!hotel || !search || !room || !panel) return;
    state.activeRoom = room;
    state.activeGuest = null;
    state.paypalRenderedFor = null;
    const price = getRoomPrice(room);
    const total = Number(price.amount || 0) * Number(search.nights || 1);
    const currency = price.currency || 'USD';

    panel.hidden = false;
    panel.innerHTML = `
      <div class="hotel-payment-summary">
        <strong>Confirmar datos del titular</strong>
        <span>${escapeHtml(hotel.hotelName)} · ${escapeHtml(room.label || room.roomType)}</span>
        <b>${money(total, currency)} por ${search.nights} noche(s)</b>
        ${currency !== 'USD' ? '<small>PayPal procesa pagos en USD. Conviene publicar esta habitación en USD antes de producción.</small>' : ''}
      </div>
      <div class="hotel-booking-holder">
        <h4>Datos del titular de la reserva</h4>
        <div class="hotel-holder-grid">
          <label>Nombres <input id="hotelGuestNames" type="text" autocomplete="given-name" required></label>
          <label>Apellidos <input id="hotelGuestLastnames" type="text" autocomplete="family-name" required></label>
          <label>Tipo de documento
            <select id="hotelGuestDocType" required>
              <option value="">Seleccionar</option>
              <option value="DNI">DNI</option>
              <option value="Pasaporte">Pasaporte</option>
              <option value="Carnet de extranjería">Carnet de extranjería</option>
              <option value="Otro">Otro</option>
            </select>
          </label>
          <label>Número de documento <input id="hotelGuestDocNumber" type="text" required></label>
          <label>Nacionalidad <input id="hotelGuestNationality" type="text" required></label>
          <label>Celular / WhatsApp <input id="hotelGuestPhone" type="tel" required></label>
          <label>Correo <input id="hotelGuestEmail" type="email" required></label>
        </div>
        <button type="button" class="hotel-continue-pay-btn" id="hotelContinueToPayBtn">Continuar con PayPal</button>
      </div>
      <div id="hotelPaypalButtons" class="hotel-paypal-buttons" hidden></div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function readGuestData() {
    const fields = {
      names: $('#hotelGuestNames')?.value.trim(),
      lastnames: $('#hotelGuestLastnames')?.value.trim(),
      documentType: $('#hotelGuestDocType')?.value,
      documentNumber: $('#hotelGuestDocNumber')?.value.trim(),
      nationality: $('#hotelGuestNationality')?.value.trim(),
      phone: $('#hotelGuestPhone')?.value.trim(),
      email: $('#hotelGuestEmail')?.value.trim(),
    };
    const missing = Object.entries(fields).filter(([, value]) => !value).map(([key]) => key);
    if (missing.length) return null;
    return fields;
  }

  function continueToPay() {
    const guest = readGuestData();
    const container = $('#hotelPaypalButtons');
    if (!guest) {
      alert('Completa los datos del titular de la reserva antes de continuar con PayPal.');
      return;
    }
    state.activeGuest = guest;
    if (container) container.hidden = false;
    const price = getRoomPrice(state.activeRoom);
    const total = Number(price.amount || 0) * Number(state.activeSearch?.nights || 1);
    renderPayPalButtons(total, price.currency || 'USD');
  }

  function renderPayPalButtons(total, currency) {
    const container = $('#hotelPaypalButtons');
    if (!container) return;
    const orderKey = `${state.activeHotel?.hotelCode}-${state.activeRoom?.roomType}-${state.activeSearch?.checkin}-${state.activeSearch?.checkout}-${state.activeGuest?.email || ''}`;
    if (state.paypalRenderedFor === orderKey) return;
    container.innerHTML = '';
    state.paypalRenderedFor = orderKey;

    if (!window.paypal || currency !== 'USD') {
      const amount = Number(total || 0).toFixed(2);
      container.innerHTML = `<button type="button" class="hotel-paypal-fallback" id="hotelManualPaymentBtn">Continuar con pago ${money(amount, currency)}</button>`;
      return;
    }

    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{
          description: `Hotel ${state.activeHotel.hotelName}`.slice(0, 120),
          amount: { currency_code: 'USD', value: Number(total || 0).toFixed(2) },
        }],
      }),
      onApprove: async (data, actions) => {
        const details = await actions.order.capture();
        await saveHotelOrder(details);
        container.innerHTML = '<div class="hotel-payment-success"><strong>Pago registrado.</strong><span>Hemos recibido la solicitud de reserva del hotel.</span></div>';
      },
      onError: (err) => {
        console.error(err);
        container.innerHTML = '<p class="hotel-inline-alert">No se pudo cargar PayPal. Revisa el Client ID o intenta nuevamente.</p>';
      },
    }).render('#hotelPaypalButtons');
  }

  async function saveHotelOrder(paypalDetails = null) {
    const url = window.MCT_HOTEL_APPS_SCRIPT_URL || '';
    const price = getRoomPrice(state.activeRoom);
    const payload = {
      type: 'hotel_reservation',
      createdAt: new Date().toISOString(),
      hotelCode: state.activeHotel?.hotelCode,
      hotelName: state.activeHotel?.hotelName,
      destination: state.activeHotel?.destinationLabel,
      roomType: state.activeRoom?.roomType,
      roomLabel: state.activeRoom?.label,
      checkin: state.activeSearch?.checkin,
      checkout: state.activeSearch?.checkout,
      nights: state.activeSearch?.nights,
      adults: state.activeSearch?.adults,
      children: state.activeSearch?.children,
      guest: state.activeGuest || {},
      currency: price.currency,
      amount: Number(price.amount || 0) * Number(state.activeSearch?.nights || 1),
      paypalOrderId: paypalDetails?.id || '',
      paypalStatus: paypalDetails?.status || '',
      rawPayPal: paypalDetails || null,
    };
    if (!url) return payload;
    try {
      await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    } catch (error) {
      console.warn('No se pudo guardar la orden de hotel en Apps Script:', error);
    }
    return payload;
  }

  function closeHotel() {
    const modal = $('#hotelDetailModal');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
    state.activeHotel = null;
    state.activeSearch = null;
    state.activeRoom = null;
    state.activeGuest = null;
  }

  function bindEvents() {
    $('#hotelDestinationFilter')?.addEventListener('change', renderHotels);
    $('#hotelSearchInput')?.addEventListener('input', renderHotels);
    document.addEventListener('click', (event) => {
      const hotelBtn = event.target.closest('[data-view-hotel]');
      if (hotelBtn) openHotel(hotelBtn.dataset.viewHotel);
      const galleryBtn = event.target.closest('[data-hotel-gallery]');
      if (galleryBtn) moveGallery(galleryBtn.dataset.hotelGallery);
      if (event.target.closest('[data-close-hotel-modal]')) closeHotel();
      if (event.target.closest('#hotelSearchAvailabilityBtn')) showAvailability();
      if (event.target.closest('#hotelStartBookingBtn')) startBooking();
      if (event.target.closest('#hotelContinueToPayBtn')) continueToPay();
      if (event.target.closest('#hotelManualPaymentBtn')) saveHotelOrder({ id: 'manual_pending', status: 'PENDING_PAYMENT' });
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeHotel(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
