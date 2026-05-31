(() => {
  'use strict';

  const CONFIG = Object.assign({
    appsScriptUrl: '',
    trainsJsonPath: '../assets/data/trains.json',
    exchangeRate: 3.38,
    currency: 'USD',
    bookingPrefix: 'CUZ-T'
  }, window.MCT_TRAIN_CONFIG || {});

  const ROUTES = {
    outbound: {
      cusco: 'CUSCO_MAPI',
      ollantaytambo: 'OLLA_MAPI',
      urubamba: 'URUBAMBA_MAPI',
      hidroelectrica: 'HIDRO_MAPI'
    },
    inbound: {
      cusco: 'MAPI_CUSCO',
      ollantaytambo: 'MAPI_OLLA',
      urubamba: 'MAPI_URUBAMBA',
      hidroelectrica: 'MAPI_HIDRO'
    }
  };

  const STATION_LABELS = {
    cusco: 'Cusco / Wanchaq / Poroy / Av. El Sol',
    ollantaytambo: 'Ollantaytambo',
    urubamba: 'Urubamba',
    hidroelectrica: 'Hidroeléctrica',
    machuPicchu: 'Machu Picchu'
  };

  const EXTRAS = {
    guideCircuit1: 15.90,
    guideCircuit3: 15.90,
    conseturUp: 12,
    conseturDown: 12,
    conseturRoundtrip: 24,
    breakfast: 8.90,
    lunch: 14.90
  };

  const state = {
    data: { trains: [] },
    tripType: 'roundtrip',
    adults: 1,
    children: 0,
    childAges: [],
    outboundFrom: 'ollantaytambo',
    returnTo: 'ollantaytambo',
    outboundDate: '',
    returnDate: '',
    selected: { outbound: null, return: null },
    extras: {
      guideCircuit: 'none',
      consetur: 'none',
      breakfast: false,
      lunch: false
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = (value) => `USD ${Number(value || 0).toFixed(2)}`;
  const clean = (value) => String(value || '').trim();
  const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function todayISO(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function getPaxTotal() {
    return state.adults + state.children;
  }

  function timeToMinutes(value) {
    const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function durationText(start, end) {
    let diff = timeToMinutes(end) - timeToMinutes(start);
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (!h) return `${m} min`;
    return `${h} h ${String(m).padStart(2, '0')} min`;
  }

  function getTrainOperator(train) {
    return normalize(train?.operatorKey || train?.company || train?.companyName || '');
  }

  function getCompanyLogo(train) {
    const op = getTrainOperator(train);
    if (op.includes('inca')) return '../assets/img/trains/inca-rail.png';
    if (op.includes('peru')) return '../assets/img/trains/perurail.png';
    return '../assets/img/placeholder/experience.jpg';
  }

  function getTrainPrice(train, type = 'adult') {
    if (!train) return 0;
    const adult = Number(train.price?.adult ?? train.pricePerPerson ?? 0);
    if (type === 'child') {
      const rawChild = train.price?.child;
      const child = rawChild === undefined || rawChild === null || rawChild === '' ? adult * 0.8 : Number(rawChild);
      return Number.isFinite(child) ? child : adult * 0.8;
    }
    const raw = train.price?.[type];
    const amount = raw === undefined || raw === null || raw === '' ? adult : Number(raw);
    return Number.isFinite(amount) ? amount : adult;
  }

  function getTrainTotal(train) {
    if (!train) return 0;
    return getTrainPrice(train, 'adult') * state.adults + getTrainPrice(train, 'child') * state.children;
  }

  function getRoute(direction) {
    if (direction === 'outbound') return ROUTES.outbound[state.outboundFrom];
    return ROUTES.inbound[state.returnTo];
  }

  function getFilteredTrains(direction) {
    const route = getRoute(direction);
    const outboundOperator = getTrainOperator(state.selected.outbound);
    return state.data.trains
      .filter((train) => !train.isLocalTrain)
      .filter((train) => train.route === route)
      .filter((train) => {
        if (direction === 'outbound') return train.direction === 'outbound';
        return train.direction === 'inbound' || train.direction === 'return';
      })
      .filter((train) => {
        if (direction !== 'return' || state.tripType !== 'roundtrip' || !outboundOperator) return true;
        return getTrainOperator(train) === outboundOperator;
      })
      .sort((a, b) => timeToMinutes(a.departureTime) - timeToMinutes(b.departureTime) || getTrainOperator(a).localeCompare(getTrainOperator(b)));
  }

  function renderSearchState() {
    const paxLabel = `${state.adults} adulto${state.adults === 1 ? '' : 's'}${state.children ? `, ${state.children} niño${state.children === 1 ? '' : 's'}` : ''}`;
    $('#paxLabel').textContent = paxLabel;
    $('#adultCount').textContent = state.adults;
    $('#childCount').textContent = state.children;
    $$('.trip-tab').forEach((tab) => {
      const input = $('input', tab);
      tab.classList.toggle('is-active', input?.checked);
    });

    $$('.return-field').forEach((el) => { el.style.display = state.tripType === 'roundtrip' ? '' : 'none'; });
    $('#returnBlock').hidden = state.tripType !== 'roundtrip';
    $('#returnDate').required = state.tripType === 'roundtrip';
    $('#outboundRouteLabel').textContent = `${STATION_LABELS[state.outboundFrom]} → Machu Picchu`;
    $('#returnRouteLabel').textContent = `Machu Picchu → ${STATION_LABELS[state.returnTo]}`;

    const companyRule = $('#companyRuleNote');
    if (state.selected.outbound) {
      companyRule.textContent = `Como elegiste ${state.selected.outbound.companyName || state.selected.outbound.company}, el retorno mostrará solo trenes de la misma empresa.`;
    } else {
      companyRule.textContent = 'Primero elige el tren de ida para filtrar el retorno por la misma empresa.';
    }

    renderChildAges();
  }

  function renderChildAges() {
    const wrapper = $('#childAges');
    wrapper.innerHTML = '';
    state.childAges = state.childAges.slice(0, state.children);
    while (state.childAges.length < state.children) state.childAges.push(6);
    state.childAges.forEach((age, index) => {
      const label = document.createElement('label');
      label.innerHTML = `<span>Edad niño ${index + 1}</span><select data-child-age="${index}">${Array.from({ length: 9 }, (_, i) => i + 3).map((n) => `<option value="${n}" ${n === Number(age) ? 'selected' : ''}>${n} años</option>`).join('')}</select>`;
      wrapper.appendChild(label);
    });
  }

  function renderResults() {
    renderSearchState();
    renderTrainList('outbound', $('#outboundResults'));
    if (state.tripType === 'roundtrip') renderTrainList('return', $('#returnResults'));
    renderExtrasVisibility();
    renderSummary();
  }

  function renderTrainList(direction, container) {
    const trains = getFilteredTrains(direction);
    const selectedCode = state.selected[direction]?.code;
    if (!trains.length) {
      container.innerHTML = `<div class="empty-state"><strong>No encontramos horarios para esta ruta.</strong><span>Prueba otra estación o consúltanos para revisar disponibilidad manual.</span></div>`;
      return;
    }

    container.innerHTML = trains.map((train) => {
      const selected = train.code === selectedCode;
      const adult = getTrainPrice(train, 'adult');
      const child = getTrainPrice(train, 'child');
      const total = getTrainTotal(train);
      const logo = getCompanyLogo(train);
      const category = train.category ? train.category.replace(/_/g, ' ') : 'tren turístico';
      return `
        <article class="train-card ${selected ? 'is-selected' : ''}" data-train-code="${escapeHtml(train.code)}" data-direction="${direction}">
          <div class="train-card-body">
            <div class="train-company">
              <img class="company-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(train.companyName || train.company || 'Tren')}" loading="lazy">
              <b>${escapeHtml(train.serviceName || train.category || 'Tren')}</b>
              <span class="badge ${category.includes('vistadome') || category.includes('prime') || category.includes('hiram') ? 'gold' : ''}">${escapeHtml(category)}</span>
            </div>
            <div class="schedule-line">
              <div class="time-box"><small>Salida</small><strong>${escapeHtml(train.departureTime)}</strong><span>${escapeHtml(train.departureStation)}</span></div>
              <span class="duration">${escapeHtml(durationText(train.departureTime, train.arrivalTime))}</span>
              <div class="time-box"><small>Llegada</small><strong>${escapeHtml(train.arrivalTime)}</strong><span>${escapeHtml(train.arrivalStation)}</span></div>
            </div>
            <div class="price-box">
              <small>Adulto ${money(adult)}${state.children ? ` · Niño ${money(child)}` : ''}</small>
              <strong>${money(total)}</strong>
              <em>Total para ${getPaxTotal()} pasajero${getPaxTotal() === 1 ? '' : 's'}</em>
            </div>
          </div>
          <button type="button" class="train-select-button ${selected ? 'is-selected' : ''}" data-select-train="${escapeHtml(train.code)}" data-direction="${direction}">${selected ? 'Seleccionado' : 'Elegir'}</button>
        </article>`;
    }).join('');
  }

  function renderExtrasVisibility() {
    const hasRequired = state.tripType === 'oneway' ? Boolean(state.selected.outbound) : Boolean(state.selected.outbound && state.selected.return);
    $('#extrasBlock').hidden = !hasRequired;
    const circuit2 = $('input[name="guideCircuit"][value="circuit2"]');
    if (circuit2) {
      circuit2.disabled = state.tripType !== 'roundtrip';
      if (state.tripType !== 'roundtrip' && circuit2.checked) {
        state.extras.guideCircuit = 'none';
        $('input[name="guideCircuit"][value="none"]').checked = true;
      }
    }
  }

  function calculateExtras() {
    const pax = getPaxTotal();
    const lines = [];
    let total = 0;

    if (state.extras.guideCircuit === 'circuit2') {
      const price = state.tripType === 'roundtrip' ? 0 : 15.90 * pax;
      lines.push({ label: 'Guiado Machu Picchu Circuito 2', detail: state.tripType === 'roundtrip' ? 'Gratis por compra ida y vuelta' : 'Grupo reducido', amount: price });
      total += price;
    }
    if (state.extras.guideCircuit === 'circuit1') {
      const amount = EXTRAS.guideCircuit1 * pax;
      lines.push({ label: 'Guiado Machu Picchu Circuito 1', detail: 'Grupo reducido 4 a 6 pax', amount });
      total += amount;
    }
    if (state.extras.guideCircuit === 'circuit3') {
      const amount = EXTRAS.guideCircuit3 * pax;
      lines.push({ label: 'Guiado Machu Picchu Circuito 3', detail: 'Grupo reducido 4 a 6 pax', amount });
      total += amount;
    }

    if (state.extras.consetur === 'up') {
      const amount = EXTRAS.conseturUp * pax;
      lines.push({ label: 'Bus Consetur subida', detail: 'USD 12.00 p/p', amount }); total += amount;
    }
    if (state.extras.consetur === 'down') {
      const amount = EXTRAS.conseturDown * pax;
      lines.push({ label: 'Bus Consetur bajada', detail: 'USD 12.00 p/p', amount }); total += amount;
    }
    if (state.extras.consetur === 'roundtrip') {
      const amount = EXTRAS.conseturRoundtrip * pax;
      lines.push({ label: 'Bus Consetur subida y bajada', detail: 'USD 24.00 p/p', amount }); total += amount;
    }
    if (state.extras.breakfast) {
      const amount = EXTRAS.breakfast * pax;
      lines.push({ label: 'Desayuno Power Peruano', detail: 'Inca Kola + pan con chicharrón o pollo', amount }); total += amount;
    }
    if (state.extras.lunch) {
      const amount = EXTRAS.lunch * pax;
      lines.push({ label: 'Almuerzo Power Peruano', detail: 'Pollo a la brasa + chaufa + papas + Inca Kola', amount }); total += amount;
    }
    lines.push({ label: 'Asistencia personalizada My Cusco Trip', detail: 'Incluida sin costo', amount: 0 });
    return { total, lines };
  }

  function calculateTotals() {
    const outbound = getTrainTotal(state.selected.outbound);
    const returned = state.tripType === 'roundtrip' ? getTrainTotal(state.selected.return) : 0;
    const extras = calculateExtras();
    const subtotal = outbound + returned + extras.total;
    return { outbound, returned, extras, total: subtotal };
  }

  function renderSummary() {
    const content = $('#summaryContent');
    const totals = calculateTotals();
    const lines = [];

    if (state.selected.outbound) {
      lines.push(summaryItem('Tren de ida', `${state.selected.outbound.companyName || state.selected.outbound.company} · ${state.selected.outbound.serviceName}`, `${state.selected.outbound.departureStation} ${state.selected.outbound.departureTime} → ${state.selected.outbound.arrivalStation} ${state.selected.outbound.arrivalTime}`, totals.outbound));
    } else {
      lines.push('<p>Selecciona un tren de ida para continuar.</p>');
    }

    if (state.tripType === 'roundtrip') {
      if (state.selected.return) {
        lines.push(summaryItem('Tren de retorno', `${state.selected.return.companyName || state.selected.return.company} · ${state.selected.return.serviceName}`, `${state.selected.return.departureStation} ${state.selected.return.departureTime} → ${state.selected.return.arrivalStation} ${state.selected.return.arrivalTime}`, totals.returned));
      } else {
        lines.push('<p>Selecciona un tren de retorno de la misma empresa.</p>');
      }
    }

    totals.extras.lines.forEach((line) => {
      lines.push(summaryItem('Extra', line.label, line.detail, line.amount));
    });

    content.innerHTML = lines.join('');
    $('#summaryTotal').textContent = money(totals.total);
    $('#checkoutButton').disabled = !canCheckout();
  }

  function summaryItem(kicker, title, detail, amount) {
    return `<div class="summary-item"><strong>${escapeHtml(kicker)} · ${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small><small>${money(amount)}</small></div>`;
  }

  function canCheckout() {
    if (!state.selected.outbound) return false;
    if (state.tripType === 'roundtrip' && !state.selected.return) return false;
    return true;
  }

  function selectTrain(direction, code) {
    const train = state.data.trains.find((item) => item.code === code);
    if (!train) return;
    state.selected[direction] = train;
    if (direction === 'outbound' && state.selected.return) {
      const outOp = getTrainOperator(train);
      const retOp = getTrainOperator(state.selected.return);
      if (outOp !== retOp) state.selected.return = null;
    }
    renderResults();
  }

  function buildPassengerForms() {
    const wrapper = $('#passengerForms');
    const total = getPaxTotal();
    wrapper.innerHTML = Array.from({ length: total }, (_, i) => {
      const isLead = i === 0;
      const type = i < state.adults ? 'Adulto' : 'Niño';
      return `
        <section class="passenger-box" data-passenger-index="${i}">
          <h3>Pasajero ${i + 1} · ${type}${isLead ? ' · Titular' : ''}</h3>
          <div class="passenger-grid">
            <label><span>Nombres</span><input name="firstName_${i}" required autocomplete="given-name"></label>
            <label><span>Apellidos</span><input name="lastName_${i}" required autocomplete="family-name"></label>
            <label><span>Nacionalidad</span><input name="nationality_${i}" required value="Perú"></label>
            <label><span>Tipo documento</span><select name="docType_${i}" required><option value="DNI">DNI</option><option value="PASSPORT">Pasaporte</option><option value="CE">Carné de Extranjería</option><option value="OTHER">Otro</option></select></label>
            <label><span>Número documento</span><input name="docNumber_${i}" required></label>
            <label><span>Edad / tipo</span><input name="passengerType_${i}" readonly value="${type}${type === 'Niño' ? ` · ${state.childAges[i - state.adults] || ''} años` : ''}"></label>
            <label><span>WhatsApp ${isLead ? '*' : '(opcional)'}</span><input name="whatsapp_${i}" ${isLead ? 'required' : ''} autocomplete="tel"></label>
            <label><span>Correo ${isLead ? '*' : '(opcional)'}</span><input name="email_${i}" type="email" ${isLead ? 'required' : ''} autocomplete="email"></label>
          </div>
        </section>`;
    }).join('');
  }

  function collectPassengers(form) {
    const total = getPaxTotal();
    return Array.from({ length: total }, (_, i) => ({
      index: i + 1,
      type: i < state.adults ? 'adult' : 'child',
      firstName: clean(form[`firstName_${i}`]?.value),
      lastName: clean(form[`lastName_${i}`]?.value),
      nationality: clean(form[`nationality_${i}`]?.value),
      docType: clean(form[`docType_${i}`]?.value),
      docNumber: clean(form[`docNumber_${i}`]?.value),
      age: i < state.adults ? null : Number(state.childAges[i - state.adults] || 0),
      whatsapp: clean(form[`whatsapp_${i}`]?.value),
      email: clean(form[`email_${i}`]?.value)
    }));
  }

  function buildOrderPayload(passengers) {
    const totals = calculateTotals();
    const code = generateCode();
    const lead = passengers[0] || {};
    return {
      code,
      createdAt: new Date().toISOString(),
      status: 'Pendiente de pago',
      source: 'trenes-web',
      currency: 'USD',
      exchangeRate: CONFIG.exchangeRate,
      tripType: state.tripType,
      dates: { outbound: state.outboundDate, return: state.tripType === 'roundtrip' ? state.returnDate : '' },
      route: {
        outboundFrom: state.outboundFrom,
        outboundRoute: getRoute('outbound'),
        returnTo: state.tripType === 'roundtrip' ? state.returnTo : '',
        returnRoute: state.tripType === 'roundtrip' ? getRoute('return') : ''
      },
      passengers,
      lead,
      pax: { adults: state.adults, children: state.children, childAges: state.childAges },
      trains: {
        outbound: serializeTrain(state.selected.outbound),
        return: state.tripType === 'roundtrip' ? serializeTrain(state.selected.return) : null
      },
      extras: {
        selected: Object.assign({}, state.extras),
        lines: totals.extras.lines
      },
      amounts: {
        outbound: round(totals.outbound),
        return: round(totals.returned),
        extras: round(totals.extras.total),
        totalUsd: round(totals.total),
        totalPen: round(totals.total * CONFIG.exchangeRate)
      }
    };
  }

  function serializeTrain(train) {
    if (!train) return null;
    return {
      code: train.code,
      company: train.company,
      companyName: train.companyName,
      operatorKey: train.operatorKey,
      serviceName: train.serviceName,
      category: train.category,
      route: train.route,
      departureStation: train.departureStation,
      arrivalStation: train.arrivalStation,
      departureTime: train.departureTime,
      arrivalTime: train.arrivalTime,
      price: {
        adult: getTrainPrice(train, 'adult'),
        child: getTrainPrice(train, 'child')
      }
    };
  }

  function generateCode() {
    const hexTime = Date.now().toString(16).toUpperCase();
    const random = Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0');
    return `${CONFIG.bookingPrefix || 'CUZ-T'}-${hexTime}-${random}`;
  }

  function round(value) { return Math.round((Number(value) || 0) * 100) / 100; }

  async function sendToAppsScript(action, payload) {
    if (!CONFIG.appsScriptUrl || CONFIG.appsScriptUrl.includes('PEGAR_AQUI')) {
      return { ok: false, message: 'Falta configurar APPS_SCRIPT_URL en trenes/assets/js/config.js.' };
    }
    const res = await fetch(CONFIG.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch (err) { return { ok: false, message: 'Apps Script devolvió una respuesta no válida.', raw: text }; }
  }

  function showPaymentMessage(message, type = 'info') {
    const box = $('#paymentMessage');
    box.hidden = false;
    box.className = `payment-message is-${type}`;
    box.textContent = message;
  }

  async function handlePassengerSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const passengers = collectPassengers(form.elements);
    const payload = buildOrderPayload(passengers);
    showPaymentMessage('Creando orden de reserva...', 'info');
    localStorage.setItem('mct_train_pending_order', JSON.stringify(payload));

    const orderResult = await sendToAppsScript('createTrainOrder', payload);
    if (!orderResult.ok) {
      showPaymentMessage(orderResult.message || 'No se pudo crear la orden.', 'error');
      return;
    }

    showPaymentMessage('Conectando con PayPal...', 'info');
    const paypalResult = await sendToAppsScript('createPayPalTrainOrder', { code: payload.code, total: payload.amounts.totalUsd, currency: 'USD' });
    if (paypalResult.ok && paypalResult.approvalUrl) {
      localStorage.setItem('mct_train_last_code', payload.code);
      window.location.assign(paypalResult.approvalUrl);
      return;
    }
    showPaymentMessage(paypalResult.message || 'PayPal no devolvió enlace de aprobación.', 'error');
  }

  function handleRouteChange() {
    state.outboundFrom = $('#outboundFrom').value;
    state.returnTo = $('#returnTo').value;
    state.selected.outbound = null;
    state.selected.return = null;
    renderResults();
  }

  function handleTripTypeChange() {
    state.tripType = $('input[name="tripType"]:checked')?.value || 'roundtrip';
    if (state.tripType === 'oneway') state.selected.return = null;
    renderResults();
  }

  function bindEvents() {
    $('#trainSearchForm').addEventListener('submit', (event) => {
      event.preventDefault();
      state.outboundDate = $('#outboundDate').value;
      state.returnDate = $('#returnDate').value;
      renderResults();
      $('.results-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $$('input[name="tripType"]').forEach((input) => input.addEventListener('change', handleTripTypeChange));
    $('#outboundFrom').addEventListener('change', handleRouteChange);
    $('#returnTo').addEventListener('change', handleRouteChange);
    $('#outboundDate').addEventListener('change', (e) => { state.outboundDate = e.target.value; });
    $('#returnDate').addEventListener('change', (e) => { state.returnDate = e.target.value; });

    $('#paxToggle').addEventListener('click', () => { $('#paxPanel').hidden = !$('#paxPanel').hidden; });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.pax-field')) $('#paxPanel').hidden = true;
    });
    document.addEventListener('click', (event) => {
      const step = event.target.closest('[data-pax]');
      if (step) {
        const target = step.dataset.pax;
        const delta = Number(step.dataset.delta || 0);
        if (target === 'adults') state.adults = Math.max(1, Math.min(30, state.adults + delta));
        if (target === 'children') state.children = Math.max(0, Math.min(20, state.children + delta));
        renderResults();
        return;
      }
      const btn = event.target.closest('[data-select-train]');
      if (btn) selectTrain(btn.dataset.direction, btn.dataset.selectTrain);
      if (event.target.matches('[data-close-modal]')) closeModal();
    });
    document.addEventListener('change', (event) => {
      if (event.target.matches('[data-child-age]')) {
        state.childAges[Number(event.target.dataset.childAge)] = Number(event.target.value);
        return;
      }
      if (event.target.matches('input[name="guideCircuit"]')) { state.extras.guideCircuit = event.target.value; renderSummary(); }
      if (event.target.id === 'conseturOption') { state.extras.consetur = event.target.value; renderSummary(); }
      if (event.target.id === 'breakfastExtra') { state.extras.breakfast = event.target.checked; renderSummary(); }
      if (event.target.id === 'lunchExtra') { state.extras.lunch = event.target.checked; renderSummary(); }
    });
    $('#checkoutButton').addEventListener('click', () => {
      if (!canCheckout()) return;
      buildPassengerForms();
      $('#paymentMessage').hidden = true;
      $('#passengerModal').hidden = false;
    });
    $('#passengerForm').addEventListener('submit', handlePassengerSubmit);
  }

  function closeModal() {
    $('#passengerModal').hidden = true;
  }

  async function loadTrains() {
    const res = await fetch(CONFIG.trainsJsonPath, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar el JSON de trenes.');
    const data = await res.json();
    state.data.trains = Array.isArray(data.trains) ? data.trains : [];
  }

  async function init() {
    const outDate = todayISO(1);
    const retDate = todayISO(2);
    $('#outboundDate').min = todayISO(0);
    $('#returnDate').min = todayISO(0);
    $('#outboundDate').value = outDate;
    $('#returnDate').value = retDate;
    state.outboundDate = outDate;
    state.returnDate = retDate;

    try {
      await loadTrains();
    } catch (err) {
      $('#outboundResults').innerHTML = `<div class="empty-state"><strong>Error cargando trenes.</strong><span>${escapeHtml(err.message)}</span></div>`;
      return;
    }
    bindEvents();
    renderResults();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
