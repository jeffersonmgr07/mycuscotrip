(() => {
  const STORAGE = {
    SESSION: 'mct_agency_session',
    CART: 'mct_reservation_cart',
    ORDERS: 'mct_reservation_orders'
  };

  const CONFIG = {
    catalogUrl: './assets/data/agencias-tours.json',
    googleScriptUrl: 'https://script.google.com/macros/s/AKfycbycmduYce7cpGoMSqR3iqubsC46DiIox7qaNJXFFW8abQpr0s1SYCnYfyA2w95_vGYQ/exec?authuser=0', // Pega aquí la URL de despliegue de Google Apps Script.
    paypalRate: 0.054,
    bankRate: 0.015,
    defaultExchangeRate: 3.38,
    paypalEnabled: true
  };

  const state = {
    session: null,
    services: [],
    cart: readJSON(STORAGE.CART, []),
    orders: readJSON(STORAGE.ORDERS, []),
    currency: localStorage.getItem('mct_visible_currency') || '',
    exchangeRate: Number(localStorage.getItem('mct_exchange_rate') || CONFIG.defaultExchangeRate)
  };



  const COUNTRIES = [
    'Afganistán','Albania','Alemania','Andorra','Angola','Antigua y Barbuda','Arabia Saudita','Argelia','Argentina','Armenia','Australia','Austria','Azerbaiyán','Bahamas','Bangladés','Barbados','Baréin','Bélgica','Belice','Benín','Bielorrusia','Birmania / Myanmar','Bolivia','Bosnia y Herzegovina','Botsuana','Brasil','Brunéi','Bulgaria','Burkina Faso','Burundi','Bután','Cabo Verde','Camboya','Camerún','Canadá','Catar','Chad','Chile','China','Chipre','Colombia','Comoras','Corea del Norte','Corea del Sur','Costa de Marfil','Costa Rica','Croacia','Cuba','Dinamarca','Dominica','Ecuador','Egipto','El Salvador','Emiratos Árabes Unidos','Eritrea','Eslovaquia','Eslovenia','España','Estados Unidos','Estonia','Esuatini','Etiopía','Filipinas','Finlandia','Fiyi','Francia','Gabón','Gambia','Georgia','Ghana','Granada','Grecia','Guatemala','Guinea','Guinea-Bisáu','Guinea Ecuatorial','Guyana','Haití','Honduras','Hungría','India','Indonesia','Irak','Irán','Irlanda','Islandia','Islas Marshall','Islas Salomón','Israel','Italia','Jamaica','Japón','Jordania','Kazajistán','Kenia','Kirguistán','Kiribati','Kuwait','Laos','Lesoto','Letonia','Líbano','Liberia','Libia','Liechtenstein','Lituania','Luxemburgo','Macedonia del Norte','Madagascar','Malasia','Malaui','Maldivas','Malí','Malta','Marruecos','Mauricio','Mauritania','México','Micronesia','Moldavia','Mónaco','Mongolia','Montenegro','Mozambique','Namibia','Nauru','Nepal','Nicaragua','Níger','Nigeria','Noruega','Nueva Zelanda','Omán','Países Bajos','Pakistán','Palaos','Palestina','Panamá','Papúa Nueva Guinea','Paraguay','Perú','Polonia','Portugal','Reino Unido','República Centroafricana','República Checa','República del Congo','República Democrática del Congo','República Dominicana','Ruanda','Rumanía','Rusia','Samoa','San Cristóbal y Nieves','San Marino','San Vicente y las Granadinas','Santa Lucía','Santo Tomé y Príncipe','Senegal','Serbia','Seychelles','Sierra Leona','Singapur','Siria','Somalia','Sri Lanka','Sudáfrica','Sudán','Sudán del Sur','Suecia','Suiza','Surinam','Tailandia','Tanzania','Tayikistán','Timor Oriental','Togo','Tonga','Trinidad y Tobago','Túnez','Turkmenistán','Turquía','Tuvalu','Ucrania','Uganda','Uruguay','Uzbekistán','Vanuatu','Vaticano','Venezuela','Vietnam','Yemen','Yibuti','Zambia','Zimbabue'
  ];

  function countryOptions(selected = '') {
    const cleanSelected = String(selected || '').trim();
    return '<option value="">Selecciona país</option>' + COUNTRIES.map((country) => `<option value="${escapeHtml(country)}" ${country === cleanSelected ? 'selected' : ''}>${escapeHtml(country)}</option>`).join('');
  }

  function hydrateCountrySelects(root = document) {
    $$('[data-country-select]', root).forEach((select) => {
      const current = select.value;
      select.innerHTML = countryOptions(current);
    });
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const isoPlusDays = (days = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const todayISO = () => isoPlusDays(0);
  const tomorrowISO = () => isoPlusDays(1);

  function money(amount, currency = state.currency) {
    const n = Number(amount || 0);
    return currency === 'USD' ? `USD ${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`;
  }

  function convert(amountPEN, serviceCurrency = 'PEN', serviceUSD = null) {
    if (state.currency === 'PEN') {
      if (serviceCurrency === 'USD' && serviceUSD != null) return Number(serviceUSD) * state.exchangeRate;
      return Number(amountPEN || 0);
    }
    if (serviceCurrency === 'USD' && serviceUSD != null) return Number(serviceUSD);
    return Number(amountPEN || 0) / state.exchangeRate;
  }

  function servicePrice(service) {
    return convert(service.pricePEN, service.currency, service.priceUSD);
  }

  function serviceAltPrice(service) {
    if (!service.priceAltPEN) return null;
    return state.currency === 'USD' ? Number(service.priceAltPEN) / state.exchangeRate : Number(service.priceAltPEN);
  }

  function ticketPrice(ticket) {
    return convert(Number(ticket.pricePEN || 0), ticket.currency || 'PEN', ticket.priceUSD != null ? Number(ticket.priceUSD) : null);
  }

  function isPeruvianAgency() {
    const country = String(state.session?.country || state.session?.pais || '').trim().toUpperCase();
    return country === 'PE' || country === 'PERU' || country === 'PERÚ';
  }


  function paymentMethodFor(order) {
    const currency = String(order?.currency || order?.moneda || state.currency || '').toUpperCase();
    return currency === 'USD' ? 'paypal' : 'mercadopago';
  }

  function paymentButtonLabel(order) {
    return paymentMethodFor(order) === 'paypal' ? 'Pagar con PayPal' : 'Pagar reserva';
  }


  function greetingFor(name = '') {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : (hour < 18 ? 'Buenas tardes' : 'Buenas noches');
    const clean = String(name || '').trim().split(/\s+/)[0] || 'bienvenido';
    return `${greeting}, ${clean}!`;
  }

  function requireSession() {
    const session = readJSON(STORAGE.SESSION, null);
    if (!session?.email) {
      window.location.href = './login.html';
      return null;
    }
    state.session = session;
    return session;
  }

  async function init() {
    const session = requireSession();
    if (!session) return;

    $('#agencyNameHeading').textContent = session.companyName || session.contactName || 'Agencia afiliada';
    $('#sessionWelcome').textContent = greetingFor(session.contactName || session.representanteNombres || session.companyName || '');
    if (!state.currency) {
      const country = String(session.country || session.pais || '').trim().toUpperCase();
      state.currency = country === 'PE' || country === 'PERU' || country === 'PERÚ' ? 'PEN' : 'USD';
      localStorage.setItem('mct_visible_currency', state.currency);
    }
    $('#currencySelect').value = state.currency;
    if ($('#exchangeRateInput')) $('#exchangeRateInput').value = state.exchangeRate.toFixed(2);
    $('#serviceDate').min = tomorrowISO();
    $('#serviceDate').value = tomorrowISO();

    hydrateCountrySelects();
    bindEvents();
    await loadCatalog();
    renderExperiences();
    renderCart();
    renderOrders();
  }

  async function loadCatalog() {
    try {
      const response = await fetch(CONFIG.catalogUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('catalog');
      const data = await response.json();
      state.services = Array.isArray(data.services) ? data.services : [];
      if (data.exchangeRate && !localStorage.getItem('mct_exchange_rate')) {
        state.exchangeRate = Number(data.exchangeRate);
        if ($('#exchangeRateInput')) $('#exchangeRateInput').value = state.exchangeRate.toFixed(2);
      }
    } catch (error) {
      $('#emptyExperiences').hidden = false;
      $('#emptyExperiences').textContent = 'No se pudo cargar el catálogo de experiencias. Revisa la ruta agencias/assets/data/agencias-tours.json.';
    }
  }

  function bindEvents() {
    $('#searchInput')?.addEventListener('input', renderExperiences);
    $('#currencySelect').addEventListener('change', (event) => {
      state.currency = event.target.value;
      localStorage.setItem('mct_visible_currency', state.currency);
      renderExperiences(); renderCart();
    });
    $('#exchangeRateInput')?.addEventListener('input', (event) => {
      state.exchangeRate = Number(event.target.value || CONFIG.defaultExchangeRate);
      localStorage.setItem('mct_exchange_rate', state.exchangeRate);
      renderExperiences(); renderCart();
    });
    $('#paxCount').addEventListener('input', () => { renderAdditionalPassengers(); renderEntryTickets(findService($('#selectedServiceId').value)); });
    $('#includeTicketsToggle')?.addEventListener('change', () => renderEntryTickets(findService($('#selectedServiceId').value)));
    $('#logoutButton')?.addEventListener('click', logout);
    $('#reserveForm').addEventListener('submit', addToCart);
    $('#clearCartButton').addEventListener('click', clearCart);
    $('#generateOrderButton').addEventListener('click', generateOrder);
    $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModals));
    $$('.modal-backdrop').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) closeModals(); }));
  }

  function canSeeService(service) {
    const allowed = Array.isArray(service.visibleForEmails) ? service.visibleForEmails.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean) : [];
    if (!allowed.length) return true;
    const sessionEmail = String(state.session?.email || state.session?.correo || '').trim().toLowerCase();
    return allowed.includes(sessionEmail);
  }

  function renderExperiences() {
    const q = ($('#searchInput')?.value || '').trim().toLowerCase();
    const filtered = state.services.filter((service) => {
      if (!canSeeService(service)) return false;
      const text = [service.name, service.shortName, service.category, service.description, service.startLabel].join(' ').toLowerCase();
      return !q || text.includes(q);
    });
    $('#emptyExperiences').hidden = filtered.length > 0;
    $('#experienceGrid').innerHTML = filtered.map(serviceCard).join('');
    $$('[data-reserve]').forEach((button) => button.addEventListener('click', () => openReserve(button.dataset.reserve)));
    $$('[data-itinerary]').forEach((button) => button.addEventListener('click', () => openItinerary(button.dataset.itinerary)));
  }

  function serviceCard(service) {
    const price = servicePrice(service);
    const alt = serviceAltPrice(service);
    const unit = service.priceUnit || 'por persona';
    const altHtml = alt ? `<small>${money(alt)} ${escapeHtml(service.priceAltLabel || '')}</small>` : '';
    return `
      <article class="experience-card">
        <img class="experience-cover" src="${escapeHtml(service.image || '../assets/img/placeholder/experience.jpg')}" alt="${escapeHtml(service.name)}" onerror="this.src='../assets/img/placeholder/experience.jpg'" />
        <div class="experience-body">
          <div class="badges"><span class="badge">${escapeHtml(service.category || 'Cusco')}</span><span class="badge">${escapeHtml(service.frequency || 'Salida diaria')}</span></div>
          <h3>${escapeHtml(service.name)}</h3>
          <p class="experience-desc">${escapeHtml(service.description || '')}</p>
          <table class="mini-table">
            <tr><td>Horario</td><td>${escapeHtml(service.startLabel || '')}</td></tr>
            <tr><td>Duración</td><td>${escapeHtml(service.durationLabel || '')}</td></tr>
            <tr><td>Precio</td><td><span class="price">${money(price)}<small>${escapeHtml(unit)}</small>${altHtml}</span></td></tr>
            <tr><td>Entradas</td><td>${escapeHtml(service.notIncluded || 'Consultar según experiencia.')}</td></tr>
          </table>
        </div>
        <div class="card-actions">
          <button type="button" class="agency-button agency-button--primary" data-reserve="${escapeHtml(service.id)}">Reservar</button>
          <button type="button" class="agency-button agency-button--ghost" data-itinerary="${escapeHtml(service.id)}">Ver itinerario</button>
        </div>
      </article>
    `;
  }

  function findService(id) { return state.services.find((service) => service.id === id); }

  function openReserve(id) {
    const service = findService(id);
    if (!service) return;
    $('#selectedServiceId').value = id;
    $('#reserveTitle').textContent = `Reservar · ${service.name}`;
    $('#reserveForm').reset();
    $('#serviceDate').min = tomorrowISO();
    $('#serviceDate').value = tomorrowISO();
    $('#paxCount').value = 2;
    renderScheduleOptions(service);
    renderEntryTickets(service);
    renderAdditionalPassengers();
    hydrateCountrySelects($('#reserveModal'));
    $('#reserveModal').classList.add('show');
  }

  function renderScheduleOptions(service) {
    const select = $('#serviceTime');
    if (!select) return;
    const schedules = Array.isArray(service.schedules) && service.schedules.length
      ? service.schedules
      : (service.startLabel ? [service.startLabel] : ['Por confirmar']);
    select.innerHTML = schedules.map((time) => `<option value="${escapeHtml(time)}">${escapeHtml(time)}</option>`).join('');
  }

  function renderEntryTickets(service) {
    const box = $('#entryTicketsBox');
    const options = $('#entryTicketOptions');
    const toggle = $('#includeTicketsToggle');
    if (!box || !options || !toggle) return;
    const tickets = Array.isArray(service?.entryTickets) ? service.entryTickets : [];
    if (!tickets.length) {
      box.hidden = true;
      options.innerHTML = '';
      toggle.checked = false;
      return;
    }
    box.hidden = false;
    options.innerHTML = tickets.map((ticket) => `
      <label class="entry-ticket-option ${toggle.checked ? '' : 'is-disabled'}">
        <input type="checkbox" data-entry-ticket="${escapeHtml(ticket.id)}" ${toggle.checked ? '' : 'disabled'} />
        <span><strong>${escapeHtml(ticket.name)}</strong><small>${money(ticketPrice(ticket))} por pasajero${ticket.note ? ` · ${escapeHtml(ticket.note)}` : ''}</small></span>
      </label>
    `).join('');
  }

  function selectedEntryTickets(service, pax) {
    const tickets = Array.isArray(service?.entryTickets) ? service.entryTickets : [];
    if (!tickets.length || !$('#includeTicketsToggle')?.checked) return [];
    const selectedIds = $$('[data-entry-ticket]:checked').map((input) => input.dataset.entryTicket);
    return tickets.filter((ticket) => selectedIds.includes(ticket.id)).map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      pricePEN: Number(ticket.pricePEN || 0),
      priceUSD: ticket.priceUSD != null ? Number(ticket.priceUSD) : null,
      currency: ticket.currency || 'PEN',
      note: ticket.note || '',
      pax,
      totalPEN: Number(ticket.pricePEN || 0) * pax,
      totalUSD: ticket.priceUSD != null ? Number(ticket.priceUSD) * pax : null
    }));
  }

  function renderAdditionalPassengers() {
    const pax = Math.max(1, Number($('#paxCount').value || 1));
    const box = $('#additionalPassengers');
    box.innerHTML = '';
    for (let i = 2; i <= pax; i++) {
      box.insertAdjacentHTML('beforeend', `
        <div class="passenger-extra" data-passenger-extra>
          <div class="passenger-extra__title">Pasajero ${i}</div>
          <div class="form-grid">
            <label class="field"><span>Nombres</span><input data-pax="firstName" /></label>
            <label class="field"><span>Apellidos</span><input data-pax="lastName" /></label>
            <label class="field"><span>Tipo de documento</span><select data-pax="docType"><option>DNI</option><option>Pasaporte</option><option>Carnet de extranjería</option><option>Otro</option></select></label>
            <label class="field"><span>Número de documento</span><input data-pax="docNumber" /></label>
            <label class="field full"><span>Nacionalidad</span><select data-pax="nationality" data-country-select></select></label>
          </div>
        </div>
      `);
    }
    hydrateCountrySelects(box);
  }

  function addToCart(event) {
    event.preventDefault();
    const form = $('#reserveForm');
    if (!form.reportValidity()) return;
    const service = findService($('#selectedServiceId').value);
    if (!service) return;
    const pax = Math.max(1, Number($('#paxCount').value || 1));
    const passengers = $$('[data-passenger-extra]').map((card) => ({
      firstName: $('[data-pax="firstName"]', card).value.trim(),
      lastName: $('[data-pax="lastName"]', card).value.trim(),
      docType: $('[data-pax="docType"]', card).value,
      docNumber: $('[data-pax="docNumber"]', card).value.trim(),
      nationality: $('[data-pax="nationality"]', card)?.value.trim() || ''
    })).filter((p) => p.firstName || p.lastName || p.docNumber || p.nationality);

    const item = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      serviceId: service.id,
      serviceName: service.name,
      serviceShortName: service.shortName || service.name,
      travelDate: $('#serviceDate').value,
      serviceTime: $('#serviceTime')?.value || '',
      pax,
      unitPricePEN: Number(service.pricePEN || 0),
      unitPriceUSD: service.priceUSD != null ? Number(service.priceUSD) : null,
      serviceCurrency: service.currency || 'PEN',
      priceUnit: service.priceUnit || 'por persona',
      lead: {
        firstName: $('#leadFirstName').value.trim(),
        lastName: $('#leadLastName').value.trim(),
        docType: $('#leadDocType').value,
        docNumber: $('#leadDocNumber').value.trim(),
        nationality: $('#leadNationality')?.value.trim() || '',
        language: $('#leadLanguage')?.value || '',
        phone: `${$('#leadPhoneCountry')?.value || ''} ${$('#leadPhone').value.trim()}`.trim()
      },
      entryTickets: selectedEntryTickets(service, pax),
      groupMode: $('#groupMode').value,
      pickupPoint: $('#pickupPoint').value.trim(),
      notes: $('#bookingNotes').value.trim(),
      passengers
    };
    state.cart.push(item);
    writeJSON(STORAGE.CART, state.cart);
    closeModals();
    renderCart();
    $('#checkout').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function itemServiceSubtotal(item) {
    return convert(item.unitPricePEN, item.serviceCurrency, item.unitPriceUSD) * item.pax;
  }

  function itemTicketsSubtotal(item) {
    return (item.entryTickets || []).reduce((sum, ticket) => sum + convert(ticket.pricePEN, ticket.currency || 'PEN', ticket.priceUSD) * (ticket.pax || item.pax || 1), 0);
  }

  function itemSubtotal(item) {
    return itemServiceSubtotal(item) + itemTicketsSubtotal(item);
  }

  function feeGross(subtotal) {
    if (subtotal <= 0) return { total: subtotal, fee: 0 };
    const total = subtotal / (1 - CONFIG.paypalRate - CONFIG.bankRate);
    return { total, fee: total - subtotal };
  }

  function renderCart() {
    const wrap = $('#cartItems');
    if (!state.cart.length) {
      wrap.innerHTML = '<p class="cart-empty">Todavía no agregaste servicios.</p>';
    } else {
      wrap.innerHTML = state.cart.map((item, index) => `
        <article class="cart-item">
          <strong>${escapeHtml(item.serviceName)}</strong>
          <div class="cart-row"><span>Fecha</span><span>${formatDate(item.travelDate)}</span></div>
          <div class="cart-row"><span>Hora</span><span>${escapeHtml(item.serviceTime || 'Por confirmar')}</span></div>
          <div class="cart-row"><span>Pasajeros</span><span>${item.pax}</span></div>
          <div class="cart-row"><span>Titular</span><span>${escapeHtml(item.lead.firstName)} ${escapeHtml(item.lead.lastName)}</span></div>
          ${item.entryTickets?.length ? `<div class="cart-row"><span>Tickets</span><span>${item.entryTickets.map((ticket) => escapeHtml(ticket.name)).join('<br>')}</span></div>` : ''}
          <div class="cart-row"><span>Subtotal</span><strong>${money(itemSubtotal(item))}</strong></div>
          <button type="button" class="agency-button agency-button--ghost agency-button--small" data-remove="${index}">Quitar</button>
        </article>
      `).join('');
    }
    $$('[data-remove]').forEach((button) => button.addEventListener('click', () => removeItem(Number(button.dataset.remove))));
    const subtotal = state.cart.reduce((sum, item) => sum + itemSubtotal(item), 0);
    const { total, fee } = feeGross(subtotal);
    $('#subtotalAmount').textContent = money(subtotal);
    $('#feeAmount').textContent = money(fee);
    $('#grandTotal').textContent = money(total);
    if ($('#toolbarCount')) $('#toolbarCount').textContent = state.cart.length;
    if ($('#toolbarTotal')) $('#toolbarTotal').textContent = money(total);
  }

  function removeItem(index) {
    state.cart.splice(index, 1);
    writeJSON(STORAGE.CART, state.cart);
    renderCart();
  }

  function clearCart() {
    state.cart = [];
    writeJSON(STORAGE.CART, state.cart);
    $('#orderBox').classList.remove('show');
    $('#orderBox').innerHTML = '';
    renderCart();
  }

  async function generateOrder() {
    if (!state.cart.length) { alert('Agrega al menos un servicio a tu orden.'); return; }
    const subtotal = state.cart.reduce((sum, item) => sum + itemSubtotal(item), 0);
    const { total, fee } = feeGross(subtotal);
    const order = {
      code: makeCode(),
      createdAt: new Date().toISOString(),
      status: 'Pendiente',
      currency: state.currency,
      exchangeRate: state.exchangeRate,
      subtotal: Number(subtotal.toFixed(2)),
      fee: Number(fee.toFixed(2)),
      total: Number(total.toFixed(2)),
      paypalBankFeeApplied: true,
      paymentDueAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      account: state.session,
      items: state.cart
    };
    state.orders.unshift(order);
    writeJSON(STORAGE.ORDERS, state.orders);
    const result = await sendToSheet('createOrder', order);
    showOrderModal(order, result);
    $('#orderBox').classList.add('show');
    $('#orderBox').innerHTML = `
      <h3>Orden generada</h3>
      <div class="order-code">${escapeHtml(order.code)}</div>
      <p><strong>Total:</strong> ${money(order.total)}</p>
      <button type="button" class="agency-button agency-button--primary" id="viewLastOrderButton">Ver / imprimir orden</button>
    `;
    $('#viewLastOrderButton')?.addEventListener('click', () => showOrderModal(order));
    state.cart = [];
    writeJSON(STORAGE.CART, state.cart);
    renderCart();
    renderOrders();
  }

  function orderItemsRows(order) {
    return order.items.map((item, index) => {
      const serviceAmount = itemServiceSubtotal(item);
      const ticketRows = (item.entryTickets || []).map((ticket) => {
        const ticketAmount = convert(ticket.pricePEN, ticket.currency || 'PEN', ticket.priceUSD) * (ticket.pax || item.pax || 1);
        return `<tr class="order-ticket-row"><td></td><td>Ticket: ${escapeHtml(ticket.name)}${ticket.note ? `<br><small>${escapeHtml(ticket.note)}</small>` : ''}</td><td>${ticket.pax || item.pax}</td><td>${money(convert(ticket.pricePEN, ticket.currency || 'PEN', ticket.priceUSD))}</td><td><strong>${money(ticketAmount)}</strong></td></tr>`;
      }).join('');
      const passengers = item.passengers?.length
        ? item.passengers.map((p, i) => `<li>Pasajero ${i + 2}: ${escapeHtml([p.firstName, p.lastName].filter(Boolean).join(' '))} · ${escapeHtml(p.docType || '')} ${escapeHtml(p.docNumber || '')}${p.nationality ? ` · Nacionalidad: ${escapeHtml(p.nationality)}` : ''}</li>`).join('')
        : '<li>Datos adicionales pendientes.</li>';
      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(item.serviceName)}</strong><br><small>Fecha: ${formatDate(item.travelDate)} · Hora: ${escapeHtml(item.serviceTime || 'Por confirmar')}</small><br><small>Recojo: ${escapeHtml(item.pickupPoint || '')}</small></td>
          <td>${item.pax}</td>
          <td>${money(convert(item.unitPricePEN, item.serviceCurrency, item.unitPriceUSD))}</td>
          <td><strong>${money(serviceAmount)}</strong></td>
        </tr>
        ${ticketRows}
        <tr class="order-passenger-row"><td></td><td colspan="4"><strong>Titular:</strong> ${escapeHtml(item.lead.firstName)} ${escapeHtml(item.lead.lastName)} · ${escapeHtml(item.lead.docType)} ${escapeHtml(item.lead.docNumber)}${item.lead.nationality ? ` · Nacionalidad: ${escapeHtml(item.lead.nationality)}` : ''}${item.lead.language ? ` · Idioma: ${escapeHtml(item.lead.language)}` : ''} · ${escapeHtml(item.lead.phone)}<br><strong>Pasajeros adicionales:</strong><ul>${passengers}</ul>${item.notes ? `<strong>Observaciones:</strong> ${escapeHtml(item.notes)}` : ''}</td></tr>
      `;
    }).join('');
  }

  function orderHTML(order, result = null) {
    return `
      <div id="orderPrintArea" class="order-print-area">
        <div class="print-order-head">
          <div class="print-order-logo-row print-only">
            <img src="../assets/img/logos/Logo1.png" alt="My Cusco Trip" class="print-order-logo" onerror="this.style.display='none'">
          </div>
          <div class="print-order-title-row">
            <div>
              <p class="eyebrow">Orden de reserva</p>
              <h2>${escapeHtml(order.code)}</h2>
              <p>Agencia: <strong>${escapeHtml(order.account?.companyName || 'Agencia afiliada')}</strong></p>
            </div>
            <div class="print-order-status is-pendiente">
              <span>${escapeHtml(order.status)}</span>
              <small>Vence: ${formatDateTime(order.paymentDueAt)}</small>
            </div>
          </div>
        </div>
        <div class="info-note"><strong>Tiempo de pago:</strong> esta orden queda reservada por 3 horas. Para confirmar los servicios, el pago debe validarse dentro del plazo indicado y siempre sujeto a disponibilidad operativa.</div>
        <div class="order-table-wrap">
          <table class="order-table">
            <thead><tr><th>#</th><th>Servicio</th><th>Pax</th><th>Tarifa</th><th>Subtotal</th></tr></thead>
            <tbody>${orderItemsRows(order)}</tbody>
          </table>
        </div>
        <div class="order-totals">
          <div><span>Servicios + tickets de ingreso</span><strong>${money(order.subtotal)}</strong></div>
          <div><span>Comisiones PayPal + banco</span><strong>${money(order.fee)}</strong></div>
          <div class="grand"><span>Total a pagar</span><strong>${money(order.total)}</strong></div>
        </div>
        <p class="small-print-note">${result?.ok === false ? 'Nota: no se confirmó el envío a Google Sheets. Revisa la conexión.' : ''}</p><div class="payment-method-note"><strong>Confirmación:</strong> toda orden será confirmada posterior al pago y siempre quedará sujeta a disponibilidad operativa, tickets disponibles y validación del área de reservas.</div>
      </div>
      <div class="dialog-actions order-modal-actions">
        <button type="button" class="agency-button agency-button--ghost" data-close-modal>Cerrar</button>
        <button type="button" class="agency-button paypal-button" id="payWithPayPalButton" data-order-code="${escapeHtml(order.code)}">${paymentButtonLabel(order)}</button>
        <button type="button" class="agency-button agency-button--primary" id="printOrderButton">Imprimir orden</button>
      </div>
    `;
  }

  function showOrderModal(order, result = null) {
    $('#orderModalBody').innerHTML = orderHTML(order, result);
    $('#orderModal').classList.add('show');
    $('#printOrderButton')?.addEventListener('click', printOrder);
    $('#payWithPayPalButton')?.addEventListener('click', () => startPayPalPayment(order));
    $('#orderModalBody [data-close-modal]')?.addEventListener('click', closeModals);
  }



  async function startPayPalPayment(order) {
    const method = paymentMethodFor(order);
    const button = $('#payWithPayPalButton');
    const loadingText = method === 'paypal' ? 'Conectando con PayPal...' : 'Conectando con Mercado Pago...';
    if (button) { button.disabled = true; button.textContent = loadingText; }
    try {
      const action = method === 'paypal' ? 'createPayPalOrder' : 'createMercadoPagoPreference';
      const result = await sendToSheet(action, {
        code: order.code,
        currency: order.currency,
        total: order.total,
        account: order.account
      });
      const redirectUrl = method === 'paypal' ? result.approvalUrl : result.initPoint;
      if (!result.ok || !redirectUrl) {
        alert(result.message || (method === 'paypal' ? 'No se pudo crear el pago en PayPal.' : 'No se pudo crear el pago en Mercado Pago.'));
        return;
      }
      window.location.href = redirectUrl;
    } catch (error) {
      console.error(error);
      alert(method === 'paypal' ? 'No se pudo conectar con PayPal.' : 'No se pudo conectar con Mercado Pago.');
    } finally {
      if (button) { button.disabled = false; button.textContent = paymentButtonLabel(order); }
    }
  }

  function printOrder() {
    document.body.classList.add('printing-order');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-order'), 600);
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  async function sendToSheet(action, payload) {
    if (!CONFIG.googleScriptUrl || CONFIG.googleScriptUrl.includes('PEGA_AQUI')) return { ok:false, message:'Falta configurar Google Apps Script.' };
    try {
      const response = await fetch(CONFIG.googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
      });
      const text = await response.text();
      try { return JSON.parse(text); } catch { return { ok:true, message:'Solicitud enviada' }; }
    } catch (error) {
      console.warn('No se pudo enviar a Google Sheets', error);
      return { ok:false, message:error.message };
    }
  }

  function renderOrders() {
    const list = $('#ordersList');
    if (!state.orders.length) {
      list.innerHTML = '<p class="empty-state">Todavía no se generaron órdenes en este navegador.</p>';
      return;
    }
    list.innerHTML = state.orders.slice(0, 12).map((order) => `
      <article class="request-card">
        <strong>${escapeHtml(order.code)}</strong>
        <p>${formatDate(order.createdAt.slice(0, 10))} · ${order.items.length} servicio(s) · ${money(order.total, order.currency)}</p>
        <span class="agency-chip">${escapeHtml(order.status)}</span>
      </article>
    `).join('');
  }

  async function openItinerary(id) {
    const service = findService(id);
    if (!service) return;
    $('#itineraryTitle').textContent = service.name;
    $('#itineraryBody').innerHTML = '<p class="dialog-help">Cargando itinerario detallado...</p>';
    $('#itineraryModal').classList.add('show');

    const item = await findItineraryItem(service);
    const includes = item?.includes || service.includes || [];
    const itinerary = item?.itinerary || item?.timeline || [];
    const description = item?.description || item?.shortDescription || service.description || '';
    $('#itineraryBody').innerHTML = `
      <p class="experience-desc">${escapeHtml(description)}</p>
      ${includes.length ? `<h3>Incluye</h3><ul class="include-list">${includes.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}
      ${itinerary.length ? `<h3>Itinerario</h3><div class="itinerary-list">${itinerary.map((step, i) => itineraryStep(step, i)).join('')}</div>` : `<div class="info-note"><strong>Detalle:</strong> ${escapeHtml(service.description || '')}</div>`}
      <div class="dialog-actions"><button type="button" class="agency-button agency-button--primary" data-reserve-from-itinerary="${escapeHtml(service.id)}">Reservar esta experiencia</button></div>
    `;
    $('[data-reserve-from-itinerary]')?.addEventListener('click', () => { closeModals(); openReserve(service.id); });
  }

  function itineraryStep(step, index) {
    if (typeof step === 'string') return `<div class="itinerary-step"><strong>Paso ${index + 1}</strong><p>${escapeHtml(step)}</p></div>`;
    return `<div class="itinerary-step"><strong>${escapeHtml(step.title || `Paso ${index + 1}`)}</strong><p>${escapeHtml(step.description || step.text || '')}</p></div>`;
  }

  async function findItineraryItem(service) {
    const sources = Array.isArray(service.jsonSources) ? service.jsonSources : ['../assets/data/agencias-tours.json'];
    for (const source of sources) {
      try {
        const response = await fetch(source, { cache: 'no-store' });
        if (!response.ok) continue;
        const data = await response.json();
        const list = normalizeList(data);
        const item = list.find((x) => [x.id, x.slug, x.internalCode].includes(service.id) || [x.id, x.slug, x.internalCode].includes(service.slug));
        if (item) return item;
      } catch (error) { /* continue */ }
    }
    return null;
  }

  function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    for (const key of ['services', 'tours', 'items', 'experiences', 'packages']) {
      if (Array.isArray(data[key])) return data[key];
    }
    return Object.values(data).flatMap((value) => Array.isArray(value) ? value : []);
  }

  function closeModals() { $$('.modal-backdrop').forEach((modal) => modal.classList.remove('show')); }

  function logout() {
    localStorage.removeItem(STORAGE.SESSION);
    localStorage.removeItem(STORAGE.CART);
    window.location.href = './login.html';
  }

  function makeCode() {
    const d = new Date();
    const date = d.toISOString().slice(0, 10).replace(/-/g, '');
    return `${date}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  init();
})();
