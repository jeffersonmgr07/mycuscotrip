(() => {
  const DATA_URL = './assets/data/hotels.json';
  const WHATSAPP = '51900608980';
  const state = { destinations: {}, hotels: [], activeHotel: null };

  const $ = (selector) => document.querySelector(selector);
  const money = (amount, currency = 'USD') => `${currency === 'PEN' ? 'S/' : '$'} ${Number(amount || 0).toFixed(2)}`;
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const asset = (path) => String(path || './assets/img/placeholder/experience.jpg').replace(/^\.\//, './');

  function getRoomPrice(room) {
    return room?.publishedPricing || room?.targetNet || room?.netCost || { currency: 'USD', amount: 0 };
  }

  function getLowestRoom(hotel) {
    return [...(hotel.rooms || [])].sort((a, b) => Number(getRoomPrice(a).amount || 0) - Number(getRoomPrice(b).amount || 0))[0];
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL);
      const data = await res.json();
      state.destinations = data.destinations || {};
      state.hotels = Object.entries(state.destinations).flatMap(([key, dest]) => (dest.hotels || []).map((hotel) => ({ ...hotel, destinationKey: key, destinationLabel: hotel.destinationLabel || dest.label || key })));
      renderFilters();
      renderHotels();
      bindEvents();
    } catch (error) {
      const grid = $('#hotelsGrid');
      if (grid) grid.innerHTML = '<div class="hotel-card"><div class="hotel-card__body"><h3>No se pudo cargar hoteles.json</h3><p>Revisa la ruta assets/data/hotels.json.</p></div></div>';
    }
  }

  function renderFilters() {
    const select = $('#hotelDestinationFilter');
    if (!select) return;
    const options = Object.entries(state.destinations).map(([key, dest]) => `<option value="${escapeHtml(key)}">${escapeHtml(dest.label || key)}</option>`).join('');
    select.insertAdjacentHTML('beforeend', options);
  }

  function getFilteredHotels() {
    const dest = $('#hotelDestinationFilter')?.value || 'all';
    const query = ($('#hotelSearchInput')?.value || '').trim().toLowerCase();
    return state.hotels.filter((hotel) => {
      if (dest !== 'all' && hotel.destinationKey !== dest) return false;
      if (!query) return true;
      return [hotel.hotelName, hotel.destinationLabel, hotel.location, hotel.address].filter(Boolean).join(' ').toLowerCase().includes(query);
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
            <div class="hotel-card__price"><small>Desde</small><strong>${money(price.amount, price.currency)}</strong></div>
            <button type="button" data-view-hotel="${escapeHtml(hotel.hotelCode)}">Ver hotel</button>
          </div>
        </div>
      </article>`;
  }

  function openHotel(hotelCode) {
    const hotel = state.hotels.find((item) => item.hotelCode === hotelCode);
    if (!hotel) return;
    state.activeHotel = hotel;
    const modal = $('#hotelDetailModal');
    const content = $('#hotelDetailContent');
    if (!modal || !content) return;
    const cover = asset(hotel.images?.cover || hotel.images?.gallery?.[0]);
    const features = [hotel.amenities?.breakfast, hotel.amenities?.checkin, hotel.amenities?.checkout, ...(hotel.features || [])].filter(Boolean).slice(0, 9);
    content.innerHTML = `
      <section class="hotel-detail">
        <div class="hotel-detail__gallery"><img src="${escapeHtml(cover)}" alt="${escapeHtml(hotel.hotelName)}"></div>
        <div class="hotel-detail__info">
          <div>
            <span class="hotels-kicker hotels-kicker--dark">${escapeHtml(hotel.destinationLabel || hotel.location || 'Perú')}</span>
            <h2 id="hotelDetailTitle">${escapeHtml(hotel.hotelName)}</h2>
            <div class="hotel-detail__meta">${hotel.stars ? '★'.repeat(Number(hotel.stars)) : 'Hotel'} · ${escapeHtml(hotel.address || hotel.location || '')}</div>
          </div>
          <p>${escapeHtml(hotel.summary || '')}</p>
          <div class="hotel-detail__features">${features.map((item) => `<span>${escapeHtml(String(item).replace(/^Desayuno:\s*/i, ''))}</span>`).join('')}</div>
          <div class="hotel-reservation-box">
            <h3>Solicitar reserva</h3>
            <div class="hotel-reservation-grid">
              <label>Entrada <input id="hotelCheckin" type="date"></label>
              <label>Salida <input id="hotelCheckout" type="date"></label>
              <label>Adultos <input id="hotelAdults" type="number" min="1" value="2"></label>
              <label>Niños <input id="hotelChildren" type="number" min="0" value="0"></label>
            </div>
            <div class="hotel-room-list">${(hotel.rooms || []).map((room, idx) => {
              const price = getRoomPrice(room);
              return `<label class="hotel-room-option"><input type="radio" name="hotelRoom" value="${escapeHtml(room.label || room.roomType)}" ${idx === 0 ? 'checked' : ''}><span><strong>${escapeHtml(room.label || room.roomType)}</strong><small>${escapeHtml(room.bedType || '')} · Capacidad ${escapeHtml(room.capacity || '')}</small></span><em>${money(price.amount, price.currency)}</em></label>`;
            }).join('')}</div>
            <button type="button" class="hotel-book-btn" id="hotelBookingRequestBtn"><i class="fa-brands fa-whatsapp"></i> Solicitar disponibilidad</button>
          </div>
        </div>
      </section>`;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeHotel() {
    const modal = $('#hotelDetailModal');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
  }

  function requestHotelBooking() {
    const hotel = state.activeHotel;
    if (!hotel) return;
    const room = document.querySelector('input[name="hotelRoom"]:checked')?.value || 'Por definir';
    const checkin = $('#hotelCheckin')?.value || 'Por definir';
    const checkout = $('#hotelCheckout')?.value || 'Por definir';
    const adults = $('#hotelAdults')?.value || '2';
    const children = $('#hotelChildren')?.value || '0';
    const msg = `Hola My Cusco Trip, quiero consultar disponibilidad para el hotel ${hotel.hotelName}. Entrada: ${checkin}. Salida: ${checkout}. Habitación: ${room}. Adultos: ${adults}. Niños: ${children}.`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  function bindEvents() {
    $('#hotelDestinationFilter')?.addEventListener('change', renderHotels);
    $('#hotelSearchInput')?.addEventListener('input', renderHotels);
    document.addEventListener('click', (event) => {
      const hotelBtn = event.target.closest('[data-view-hotel]');
      if (hotelBtn) openHotel(hotelBtn.dataset.viewHotel);
      if (event.target.closest('[data-close-hotel-modal]')) closeHotel();
      if (event.target.closest('#hotelBookingRequestBtn')) requestHotelBooking();
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeHotel(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
