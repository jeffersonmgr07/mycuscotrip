(() => {
  const STORAGE = {
    SESSION: 'mct_agency_session',
    AGENCIES: 'mct_registered_agencies',
    REQUESTS: 'mct_agency_requests'
  };

  const state = {
    session: null,
    catalog: [],
    filteredRows: [],
    selectedRow: null,
    requests: []
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = (value) => `S/ ${Number(value || 0).toFixed(2)}`;
  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  };
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const todayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

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

    $('#travelDate').value = todayISO();
    $('#agencySessionLabel').innerHTML = `${escapeHtml(session.companyName || 'Agencia autorizada')} <span>|</span> Tarifas confidenciales`;
    $('#kpiAgency').textContent = session.companyName || 'Agencia';

    bindBaseEvents();
    state.requests = readJSON(STORAGE.REQUESTS, []).filter((item) => item.agencyEmail === session.email);
    await loadCatalog();
    renderMenus();
    applyFilters();
    renderRequests();
  }

  async function loadCatalog() {
    try {
      const response = await fetch('./assets/data/agencias-tours.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('catalog');
      const data = await response.json();
      state.catalog = Array.isArray(data.services) ? data.services : [];
    } catch (error) {
      $('#emptyResults').hidden = false;
      $('#emptyResults').textContent = 'En este momento no se pudo mostrar el catálogo. Por favor intenta nuevamente o comunícate con el equipo de reservas.';
      state.catalog = [];
    }
  }

  function bindBaseEvents() {
    $('#logoutButton')?.addEventListener('click', () => {
      localStorage.removeItem(STORAGE.SESSION);
      window.location.href = './login.html';
    });

    $('#searchForm').addEventListener('submit', (event) => {
      event.preventDefault();
      applyFilters();
    });

    ['serviceSelect', 'travelDate', 'adultCount', 'childCount', 'guideCount', 'languageSelect'].forEach((id) => {
      $(`#${id}`).addEventListener('change', applyFilters);
    });

    $('#quickFilter').addEventListener('input', renderResults);
    $('#clearSelection').addEventListener('click', clearSelection);
    $('#reserveButton').addEventListener('click', openReserveDialog);
    $('#paymentButton').addEventListener('click', openPaymentDialog);
    $('#reserveForm').addEventListener('submit', submitReservation);
    $('#paymentForm').addEventListener('submit', submitPayment);
    $('#exportRequests').addEventListener('click', exportCSV);

    $$('[data-close-dialog]').forEach((button) => {
      button.addEventListener('click', () => button.closest('dialog')?.close());
    });
  }

  function renderMenus() {
    const menu = $('#serviceMenu');
    const select = $('#serviceSelect');
    const buttons = state.catalog.map((service) => `
      <button type="button" data-service="${escapeHtml(service.id)}">
        <span class="service-icon" aria-hidden="true">${iconFor(service)}</span>
        <span>${escapeHtml(service.shortName || service.name)}</span>
        <small>${escapeHtml(service.durationLabel || 'Servicio diario')}</small>
      </button>
    `).join('');
    menu.insertAdjacentHTML('beforeend', buttons);

    state.catalog.forEach((service) => {
      const option = document.createElement('option');
      option.value = service.id;
      option.textContent = service.shortName || service.name;
      select.appendChild(option);
    });

    $$('#serviceMenu button').forEach((button) => {
      button.addEventListener('click', () => {
        $$('#serviceMenu button').forEach((item) => item.classList.toggle('is-active', item === button));
        $('#serviceSelect').value = button.dataset.service;
        applyFilters();
      });
    });
  }

  function iconFor(service) {
    const text = `${service.slug} ${service.name}`.toLowerCase();
    if (text.includes('city')) return '⌂';
    if (text.includes('bienvenida')) return '✺';
    if (text.includes('valle')) return '▱';
    if (text.includes('montaña')) return '△';
    if (text.includes('humantay')) return '◠';
    if (text.includes('maras')) return '◎';
    if (text.includes('machu')) return '▥';
    return '•';
  }

  function getCounts() {
    return {
      adults: Math.max(1, Number($('#adultCount').value || 1)),
      children: Math.max(0, Number($('#childCount').value || 0)),
      guides: Math.max(0, Number($('#guideCount').value || 0))
    };
  }

  function calculate(service) {
    const counts = getCounts();
    const adultRate = Number(service.agentRate?.adult || 0);
    const childRate = Number(service.agentRate?.child ?? adultRate);
    const guideRate = Number(service.agentRate?.guide || 0);
    return {
      adultRate,
      childRate,
      guideRate,
      total: counts.adults * adultRate + counts.children * childRate + counts.guides * guideRate
    };
  }

  function applyFilters() {
    const serviceId = $('#serviceSelect').value;
    const date = $('#travelDate').value || todayISO();
    const language = $('#languageSelect').value;
    const services = serviceId === 'all' ? state.catalog : state.catalog.filter((service) => service.id === serviceId);

    state.filteredRows = services.flatMap((service) => {
      const price = calculate(service);
      return (service.schedules || []).map((schedule, index) => ({
        id: `${service.id}-${index}`,
        service,
        schedule,
        date,
        language,
        price
      }));
    });

    clearSelection(false);
    renderKpis(services);
    renderResults();
    syncSidebarActive(serviceId);
  }

  function syncSidebarActive(serviceId) {
    $$('#serviceMenu button').forEach((button) => button.classList.toggle('is-active', button.dataset.service === serviceId));
  }

  function renderKpis(services) {
    const rates = services.map((service) => Number(service.agentRate?.adult || 0)).filter(Boolean);
    $('#kpiServices').textContent = services.length;
    $('#kpiSchedules').textContent = state.filteredRows.length;
    $('#kpiFrom').textContent = money(rates.length ? Math.min(...rates) : 0);
  }

  function renderResults() {
    const body = $('#resultsBody');
    const quick = $('#quickFilter').value.trim().toLowerCase();
    const rows = state.filteredRows.filter((row) => {
      if (!quick) return true;
      const text = [row.service.name, row.service.shortName, row.schedule.time, row.schedule.pickup, row.language].join(' ').toLowerCase();
      return text.includes(quick);
    });

    body.innerHTML = rows.map((row) => `
      <tr>
        <td><input type="radio" name="tourRow" value="${escapeHtml(row.id)}" ${state.selectedRow?.id === row.id ? 'checked' : ''}></td>
        <td><span class="table-title"><strong>${escapeHtml(row.service.shortName || row.service.name)}</strong><small>${escapeHtml(row.schedule.frequency || 'Diario')}</small></span></td>
        <td>${formatDate(row.date)}</td>
        <td><strong>${escapeHtml(row.schedule.time)}</strong></td>
        <td>${escapeHtml(row.schedule.duration || row.service.durationLabel || '')}</td>
        <td>${escapeHtml(row.schedule.pickup || 'A coordinar')}</td>
        <td>${escapeHtml(row.language)}</td>
        <td>${money(row.price.adultRate)}</td>
        <td><strong>${money(row.price.total)}</strong></td>
        <td><span class="status-pill">${escapeHtml(row.schedule.status || 'Disponible')}</span></td>
      </tr>
    `).join('');

    $('#emptyResults').hidden = rows.length > 0;
    $$('input[name="tourRow"]', body).forEach((radio) => {
      radio.addEventListener('change', () => {
        const row = state.filteredRows.find((item) => item.id === radio.value);
        selectRow(row);
      });
    });
  }

  function selectRow(row) {
    state.selectedRow = row;
    $('#summaryStatus').textContent = 'Seleccionado';
    $('#reserveButton').disabled = false;
    renderSummary();
  }

  function clearSelection(render = true) {
    state.selectedRow = null;
    $('#summaryStatus').textContent = 'Sin selección';
    $('#selectedSummary').className = 'summary-empty';
    $('#selectedSummary').textContent = 'Selecciona un horario para ver el resumen de la reserva.';
    $('#totalAmount').textContent = money(0);
    $('#reserveButton').disabled = true;
    $('#paymentButton').disabled = true;
    if (render) renderResults();
  }

  function renderSummary() {
    const row = state.selectedRow;
    if (!row) return;
    const counts = getCounts();
    $('#selectedSummary').className = 'summary-list';
    $('#selectedSummary').innerHTML = `
      ${summaryRow('Servicio', row.service.name)}
      ${summaryRow('Fecha', formatDate(row.date))}
      ${summaryRow('Hora', row.schedule.time)}
      ${summaryRow('Pasajeros', `${counts.adults} adulto(s), ${counts.children} niño(s), ${counts.guides} guía(s) / TC`)}
      ${summaryRow('Tarifa adulto', money(row.price.adultRate))}
      ${summaryRow('Idioma', row.language)}
    `;
    $('#totalAmount').textContent = money(row.price.total);
  }

  function summaryRow(label, value) {
    return `<div class="summary-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function openReserveDialog() {
    if (!state.selectedRow) return;
    buildPassengerForms();
    $('#pickupPoint').value = '';
    $('#bookingNotes').value = '';
    $('#reserveDialog').showModal();
  }

  function buildPassengerForms() {
    const { adults, children } = getCounts();
    const passengers = [];
    for (let i = 1; i <= adults; i++) passengers.push({ type: 'Adulto', index: i });
    for (let i = 1; i <= children; i++) passengers.push({ type: 'Niño', index: i });

    $('#passengerForms').innerHTML = passengers.map((passenger, idx) => `
      <article class="passenger-card" data-passenger-card>
        <div class="passenger-card__title">${passenger.type} ${passenger.index}${idx === 0 ? ' · pasajero principal' : ''}</div>
        <div class="dialog-grid">
          <label><span>Nombres</span><input data-passenger="firstName" required></label>
          <label><span>Apellidos</span><input data-passenger="lastName" required></label>
          <label><span>Tipo de documento</span><select data-passenger="docType"><option>DNI</option><option>Pasaporte</option><option>Carnet de extranjería</option></select></label>
          <label><span>Número de documento</span><input data-passenger="docNumber" required></label>
          <label class="dialog-grid__full"><span>Celular de contacto${idx === 0 ? '' : ' (opcional)'}</span><input data-passenger="phone" ${idx === 0 ? 'required' : ''} placeholder="+51 ..."></label>
        </div>
        <input type="hidden" data-passenger="type" value="${passenger.type}">
      </article>
    `).join('');
  }

  function submitReservation(event) {
    event.preventDefault();
    if (!state.selectedRow) return;

    const form = $('#reserveForm');
    if (!form.reportValidity()) return;

    const passengers = $$('[data-passenger-card]').map((card) => ({
      type: $('[data-passenger="type"]', card).value,
      firstName: $('[data-passenger="firstName"]', card).value.trim(),
      lastName: $('[data-passenger="lastName"]', card).value.trim(),
      docType: $('[data-passenger="docType"]', card).value,
      docNumber: $('[data-passenger="docNumber"]', card).value.trim(),
      phone: $('[data-passenger="phone"]', card).value.trim()
    }));

    const code = makeCode();
    const request = {
      code,
      createdAt: new Date().toISOString(),
      agencyEmail: state.session.email,
      agencyName: state.session.companyName,
      serviceId: state.selectedRow.service.id,
      serviceName: state.selectedRow.service.name,
      date: state.selectedRow.date,
      time: state.selectedRow.schedule.time,
      language: state.selectedRow.language,
      counts: getCounts(),
      passengers,
      pickupPoint: $('#pickupPoint').value.trim(),
      notes: $('#bookingNotes').value.trim(),
      amount: state.selectedRow.price.total,
      currency: 'PEN',
      status: 'Reserva pendiente',
      payment: null
    };

    const all = readJSON(STORAGE.REQUESTS, []);
    all.unshift(request);
    writeJSON(STORAGE.REQUESTS, all);
    state.requests.unshift(request);

    $('#reserveDialog').close();
    $('#paymentButton').disabled = false;
    $('#paymentButton').dataset.code = code;
    $('#summaryStatus').textContent = code;
    renderRequests();
    alert(`Reserva ${code} registrada correctamente.`);
  }

  function openPaymentDialog() {
    const code = $('#paymentButton').dataset.code || state.requests[0]?.code;
    if (!code) return;
    const request = state.requests.find((item) => item.code === code) || state.requests[0];
    $('#paymentReservationCode').value = request.code;
    $('#paymentAmount').value = Number(request.amount || 0).toFixed(2);
    $('#paymentOperation').value = '';
    $('#paymentProof').value = '';
    $('#paymentNotes').value = '';
    $('#paymentDialog').showModal();
  }

  function submitPayment(event) {
    event.preventDefault();
    const form = $('#paymentForm');
    if (!form.reportValidity()) return;
    const code = $('#paymentReservationCode').value;
    const proof = $('#paymentProof').files[0];
    const all = readJSON(STORAGE.REQUESTS, []);
    const updated = all.map((request) => {
      if (request.code !== code) return request;
      return {
        ...request,
        status: 'Pago pendiente de validación',
        payment: {
          amount: Number($('#paymentAmount').value || 0),
          method: $('#paymentMethod').value,
          operation: $('#paymentOperation').value.trim(),
          proofName: proof?.name || '',
          notes: $('#paymentNotes').value.trim(),
          registeredAt: new Date().toISOString()
        }
      };
    });
    writeJSON(STORAGE.REQUESTS, updated);
    state.requests = updated.filter((item) => item.agencyEmail === state.session.email);
    $('#paymentDialog').close();
    renderRequests();
    alert('Pago registrado. Queda pendiente de validación.');
  }

  function renderRequests() {
    const list = $('#requestsList');
    if (!state.requests.length) {
      list.innerHTML = '<p class="agency-empty">Aún no hay reservas registradas para esta agencia.</p>';
      return;
    }
    const template = $('#requestTemplate');
    list.innerHTML = '';
    state.requests.forEach((request) => {
      const node = template.content.cloneNode(true);
      $('[data-field="code"]', node).textContent = request.code;
      $('[data-field="title"]', node).textContent = request.serviceName;
      $('[data-field="meta"]', node).textContent = `${formatDate(request.date)} · ${request.time} · ${request.passengers?.length || 0} pasajero(s) · Recojo: ${request.pickupPoint || 'A coordinar'}`;
      $('[data-field="amount"]', node).textContent = money(request.amount);
      $('[data-field="status"]', node).textContent = request.status;
      list.appendChild(node);
    });
  }

  function exportCSV() {
    if (!state.requests.length) return;
    const rows = [
      ['codigo','agencia','servicio','fecha','hora','pasajeros','recojo','monto','estado'],
      ...state.requests.map((r) => [r.code, r.agencyName, r.serviceName, r.date, r.time, r.passengers?.length || 0, r.pickupPoint, r.amount, r.status])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reservas-agencia.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function makeCode() {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(2, 12);
    return `AG-${stamp}-${Math.floor(100 + Math.random() * 900)}`;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  init();
})();
