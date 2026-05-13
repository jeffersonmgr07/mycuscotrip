(() => {
  const PEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  const STORAGE_KEY = 'myCuscoTripAgencyRequests';

  const state = {
    catalog: [],
    rows: [],
    filteredRows: [],
    selectedRow: null,
    lastReservation: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const serviceIcons = ['◎', '▦', '✺', '▱', '△', '◒', '◉', '◇', '⛰', '●', '☼'];

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setDefaultDate();
    bindUi();
    await loadCatalog();
    renderServiceNavigation();
    renderServiceSelect();
    buildRows();
    applyFilters();
    renderRequests();
  }

  async function loadCatalog() {
    try {
      const response = await fetch('./assets/data/agencias-tours.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`No se pudo cargar el catálogo de tours (${response.status})`);
      const data = await response.json();
      state.catalog = Array.isArray(data.services) ? data.services : [];
    } catch (error) {
      console.error(error);
      $('#emptyResults').hidden = false;
      $('#emptyResults').textContent = 'Por el momento no pudimos cargar el catálogo de tours. Inténtalo nuevamente o comunícate con tu ejecutivo de reservas.';
    }
  }

  function bindUi() {
    $('#searchForm').addEventListener('submit', (event) => {
      event.preventDefault();
      applyFilters();
    });

    ['serviceSelect', 'travelDate', 'adultCount', 'childCount', 'guideCount', 'languageSelect'].forEach((id) => {
      $(`#${id}`).addEventListener('change', () => {
        buildRows();
        applyFilters();
        if (state.selectedRow) updateSelectionFromCurrentFilters();
      });
    });

    $('#quickFilter').addEventListener('input', applyFilters);
    $('#clearSelection').addEventListener('click', clearSelection);
    $('#reserveButton').addEventListener('click', openReserveDialog);
    $('#paymentButton').addEventListener('click', openPaymentDialog);
    $('#reserveForm').addEventListener('submit', saveReservation);
    $('#paymentForm').addEventListener('submit', savePayment);
    $('#exportRequests').addEventListener('click', exportRequestsCsv);

    $$('[data-close-dialog]').forEach((button) => {
      button.addEventListener('click', () => button.closest('dialog')?.close());
    });
  }

  function setDefaultDate() {
    const input = $('#travelDate');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    input.value = tomorrow.toISOString().slice(0, 10);
  }

  function renderServiceNavigation() {
    const menu = $('#serviceMenu');
    const buttons = state.catalog.map((service, index) => `
      <button type="button" data-service="${escapeHtml(service.slug)}">
        <span class="service-icon" aria-hidden="true">${serviceIcons[(index + 1) % serviceIcons.length]}</span>
        <span>${escapeHtml(service.shortName || service.name)}</span>
        <small>Desde ${formatMoney(service.agentNetRate?.adult || 0)} neto</small>
      </button>
    `).join('');
    menu.insertAdjacentHTML('beforeend', buttons);

    menu.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-service]');
      if (!button) return;
      const value = button.dataset.service || 'all';
      $('#serviceSelect').value = value;
      $$('#serviceMenu button').forEach((item) => item.classList.toggle('is-active', item === button));
      buildRows();
      applyFilters();
      clearSelection(false);
    });
  }

  function renderServiceSelect() {
    const select = $('#serviceSelect');
    state.catalog.forEach((service) => {
      const option = document.createElement('option');
      option.value = service.slug;
      option.textContent = service.shortName || service.name;
      select.appendChild(option);
    });
  }

  function buildRows() {
    const date = $('#travelDate').value;
    const language = $('#languageSelect').value;
    const passengers = getPassengers();
    state.rows = state.catalog.flatMap((service) => {
      return (service.schedules || []).map((schedule, index) => {
        const rates = service.agentNetRate || {};
        const subtotal = (passengers.adult * Number(rates.adult || 0)) +
          (passengers.child * Number(rates.child || rates.adult || 0)) +
          (passengers.guide * Number(rates.guide || 0));

        return {
          uid: `${service.slug}__${schedule.time}__${index}`,
          serviceSlug: service.slug,
          serviceName: service.shortName || service.name,
          fullName: service.name,
          date,
          language,
          passengers,
          schedule,
          rates,
          subtotal,
          includes: service.includes || [],
          importantNotes: service.importantNotes || []
        };
      });
    });
  }

  function applyFilters() {
    const selectedService = $('#serviceSelect').value;
    const term = normalize($('#quickFilter').value);

    state.filteredRows = state.rows.filter((row) => {
      const matchesService = selectedService === 'all' || row.serviceSlug === selectedService;
      const haystack = normalize(`${row.serviceName} ${row.fullName} ${row.schedule.time} ${row.schedule.pickup} ${row.schedule.duration}`);
      const matchesTerm = !term || haystack.includes(term);
      return matchesService && matchesTerm;
    });

    renderRows();
    renderKpis();
    syncSidebarActive(selectedService);
  }

  function renderRows() {
    const tbody = $('#resultsBody');
    const empty = $('#emptyResults');

    if (!state.filteredRows.length) {
      tbody.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    tbody.innerHTML = state.filteredRows.map((row) => {
      const selected = state.selectedRow?.uid === row.uid;
      return `
        <tr class="${selected ? 'is-selected' : ''}" data-row-id="${escapeHtml(row.uid)}">
          <td class="radio-cell">
            <input type="radio" name="tourRow" ${selected ? 'checked' : ''} aria-label="Elegir ${escapeHtml(row.serviceName)} ${escapeHtml(row.schedule.time)}" />
          </td>
          <td>
            <span class="service-name">
              <strong>${escapeHtml(row.serviceName)}</strong>
              <small>Frecuencia diaria · Cupos ${escapeHtml(String(row.schedule.capacity || ''))}</small>
            </span>
          </td>
          <td>${formatDate(row.date)}</td>
          <td><strong>${escapeHtml(row.schedule.time)}</strong></td>
          <td>${escapeHtml(row.schedule.duration)}</td>
          <td>${escapeHtml(row.schedule.pickup)}</td>
          <td>${escapeHtml(row.language)}</td>
          <td class="price-cell"><strong>${formatMoney(row.rates.adult || 0)}</strong><small>por adulto</small></td>
          <td><strong>${formatMoney(row.subtotal)}</strong></td>
          <td class="status-available">${escapeHtml(row.schedule.status || 'Disponible')}</td>
        </tr>
      `;
    }).join('');

    $$('tr[data-row-id]', tbody).forEach((rowElement) => {
      rowElement.addEventListener('click', () => {
        const row = state.filteredRows.find((item) => item.uid === rowElement.dataset.rowId);
        if (row) selectRow(row);
      });
    });
  }

  function renderKpis() {
    const services = new Set(state.filteredRows.map((row) => row.serviceSlug));
    const prices = state.filteredRows.map((row) => Number(row.rates.adult || 0)).filter(Boolean);
    $('#kpiServices').textContent = services.size;
    $('#kpiSchedules').textContent = state.filteredRows.length;
    $('#kpiFrom').textContent = prices.length ? formatMoney(Math.min(...prices)) : formatMoney(0);
  }

  function selectRow(row) {
    state.selectedRow = { ...row, passengers: getPassengers() };
    renderRows();
    renderSummary();
    $('#reserveButton').disabled = false;
    $('#paymentButton').disabled = !state.lastReservation;
  }

  function clearSelection(render = true) {
    state.selectedRow = null;
    state.lastReservation = null;
    $('#selectedSummary').className = 'summary-empty';
    $('#selectedSummary').textContent = 'Selecciona un horario para ver el resumen de la reserva.';
    $('#summaryStatus').textContent = 'Sin selección';
    $('#summaryStatus').className = 'agency-chip';
    $('#totalAmount').textContent = formatMoney(0);
    $('#reserveButton').disabled = true;
    $('#paymentButton').disabled = true;
    if (render) renderRows();
  }

  function updateSelectionFromCurrentFilters() {
    const next = state.rows.find((row) => row.uid === state.selectedRow.uid);
    if (next) selectRow(next);
  }

  function renderSummary() {
    const row = state.selectedRow;
    if (!row) return;
    const passengers = getPassengers();
    const totalPeople = passengers.adult + passengers.child + passengers.guide;
    const summary = $('#selectedSummary');
    summary.className = 'summary-detail';
    summary.innerHTML = `
      <div class="summary-row"><span>Servicio</span><strong>${escapeHtml(row.serviceName)}</strong></div>
      <div class="summary-row"><span>Fecha y hora</span><strong>${formatDate(row.date)} · ${escapeHtml(row.schedule.time)}</strong></div>
      <div class="summary-row"><span>Pasajeros</span><strong>${passengers.adult} adulto(s), ${passengers.child} niño(s), ${passengers.guide} guía(s)</strong></div>
      <div class="summary-row"><span>Idioma</span><strong>${escapeHtml(row.language)}</strong></div>
      <div class="summary-row"><span>Recojo</span><strong>${escapeHtml(row.schedule.pickup)}</strong></div>
      <div class="summary-row"><span>Tarifa neta</span><strong>${formatMoney(row.rates.adult || 0)} adulto · ${formatMoney(row.rates.child || row.rates.adult || 0)} niño</strong></div>
      <div class="summary-row"><span>Total personas</span><strong>${totalPeople}</strong></div>
    `;
    $('#summaryStatus').textContent = 'Listo para reservar';
    $('#summaryStatus').className = 'agency-chip is-paid';
    $('#totalAmount').textContent = formatMoney(calculateCurrentTotal());
  }

  function openReserveDialog() {
    if (!state.selectedRow) return;
    $('#reserveDialog').showModal();
  }

  function openPaymentDialog() {
    if (!state.lastReservation) return;
    $('#paymentReservationCode').value = state.lastReservation.code;
    $('#paymentAmount').value = state.lastReservation.total.toFixed(2);
    $('#paymentDialog').showModal();
  }

  function saveReservation(event) {
    event.preventDefault();
    if (!state.selectedRow) return;
    const code = createReservationCode();
    const reservation = {
      code,
      createdAt: new Date().toISOString(),
      status: 'Reserva pendiente',
      paymentStatus: 'Pago no registrado',
      agency: $('#agencyName').value.trim(),
      contact: $('#agencyContact').value.trim(),
      email: $('#agencyEmail').value.trim(),
      phone: $('#agencyPhone').value.trim(),
      leadPassenger: $('#leadPassenger').value.trim(),
      notes: $('#bookingNotes').value.trim(),
      service: state.selectedRow.serviceName,
      serviceSlug: state.selectedRow.serviceSlug,
      date: state.selectedRow.date,
      time: state.selectedRow.schedule.time,
      pickup: state.selectedRow.schedule.pickup,
      language: state.selectedRow.language,
      passengers: getPassengers(),
      total: calculateCurrentTotal(),
      currency: 'PEN',
      proof: null
    };
    state.lastReservation = reservation;
    const requests = getStoredRequests();
    requests.unshift(reservation);
    saveStoredRequests(requests);
    $('#reserveDialog').close();
    $('#reserveForm').reset();
    $('#paymentButton').disabled = false;
    $('#summaryStatus').textContent = 'Reserva pendiente';
    $('#summaryStatus').className = 'agency-chip is-pending';
    renderRequests();
  }

  function savePayment(event) {
    event.preventDefault();
    const code = $('#paymentReservationCode').value;
    const file = $('#paymentProof').files?.[0];
    const requests = getStoredRequests();
    const index = requests.findIndex((item) => item.code === code);
    if (index === -1) return;

    requests[index] = {
      ...requests[index],
      paymentStatus: 'Pago pendiente de aprobación',
      payment: {
        amount: Number($('#paymentAmount').value || 0),
        method: $('#paymentMethod').value,
        operation: $('#paymentOperation').value.trim(),
        notes: $('#paymentNotes').value.trim(),
        proofName: file?.name || '',
        proofType: file?.type || '',
        registeredAt: new Date().toISOString()
      }
    };
    state.lastReservation = requests[index];
    saveStoredRequests(requests);
    $('#paymentDialog').close();
    $('#paymentForm').reset();
    renderRequests();
  }

  function renderRequests() {
    const list = $('#requestsList');
    const requests = getStoredRequests();
    if (!requests.length) {
      list.innerHTML = '<p class="agency-empty">Aún no hay reservas registradas en este navegador.</p>';
      return;
    }
    const template = $('#requestTemplate');
    list.innerHTML = '';
    requests.slice(0, 12).forEach((request) => {
      const node = template.content.cloneNode(true);
      $('[data-field="code"]', node).textContent = request.code;
      $('[data-field="title"]', node).textContent = request.service;
      $('[data-field="meta"]', node).textContent = `${formatDate(request.date)} · ${request.time} · ${request.agency || 'Agencia'} · ${request.leadPassenger || 'Pasajero líder pendiente'}`;
      $('[data-field="amount"]', node).textContent = formatMoney(request.total || 0);
      const status = $('[data-field="status"]', node);
      status.textContent = request.paymentStatus || request.status;
      status.classList.toggle('is-pending', true);
      list.appendChild(node);
    });
  }

  function exportRequestsCsv() {
    const requests = getStoredRequests();
    if (!requests.length) return;
    const headers = ['codigo','fecha_creacion','agencia','contacto','servicio','fecha_viaje','hora','adultos','ninos','guias','total_pen','estado_reserva','estado_pago','operacion','comprobante'];
    const rows = requests.map((r) => [
      r.code, r.createdAt, r.agency, r.contact, r.service, r.date, r.time,
      r.passengers?.adult, r.passengers?.child, r.passengers?.guide, r.total,
      r.status, r.paymentStatus, r.payment?.operation || '', r.payment?.proofName || ''
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas-agencias-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function syncSidebarActive(value) {
    $$('#serviceMenu button').forEach((button) => {
      button.classList.toggle('is-active', (button.dataset.service || 'all') === value);
    });
  }

  function calculateCurrentTotal() {
    if (!state.selectedRow) return 0;
    const rates = state.selectedRow.rates || {};
    const p = getPassengers();
    return (p.adult * Number(rates.adult || 0)) +
      (p.child * Number(rates.child || rates.adult || 0)) +
      (p.guide * Number(rates.guide || 0));
  }

  function getPassengers() {
    return {
      adult: clampInt($('#adultCount').value, 1, 60),
      child: clampInt($('#childCount').value, 0, 60),
      guide: clampInt($('#guideCount').value, 0, 10)
    };
  }

  function getStoredRequests() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  function saveStoredRequests(requests) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }

  function createReservationCode() {
    const date = new Date();
    const ymd = date.toISOString().slice(2,10).replaceAll('-', '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `AG-${ymd}-${random}`;
  }

  function clampInt(value, min, max) {
    const number = Number.parseInt(value, 10);
    if (Number.isNaN(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function formatMoney(value) { return PEN.format(Number(value || 0)); }

  function formatDate(value) {
    if (!value) return '';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(year, month - 1, day));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }
})();
