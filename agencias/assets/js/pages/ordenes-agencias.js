(() => {
  const SESSION_KEY = 'mct_agency_session';
  const LOCAL_ORDERS_KEY = 'mct_reservation_orders';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwf5cwaC5VsT48XvXh480Jh4ZCVKuBo55AQ9sqon449Tg1ic8rLrHHicuYiMrfneDsA/exec?authuser=0';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  let orders = [];

  function requireSession() {
    const session = readJSON(SESSION_KEY, null);
    if (!session?.email) {
      window.location.href = './login.html';
      return null;
    }
    $('#ordersAgencyName').textContent = session.companyName || session.contactName || session.email || 'Agencia afiliada';
    return session;
  }

  function money(amount, currency = 'PEN') {
    const n = Number(amount || 0);
    return currency === 'USD' ? `USD ${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`;
  }

  function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function normalizeStatus(order) {
    const raw = String(order.estadoPago || order.status || 'Pendiente').toLowerCase();
    if (raw.includes('pag')) return 'pagado';
    if (raw.includes('venc')) return 'vencido';
    const due = order.fechaVencimientoPago || order.paymentDueAt || '';
    if (due && new Date(due).getTime() < Date.now()) return 'vencido';
    return 'pendiente';
  }

  function statusLabel(status) {
    return { pendiente: 'Pendiente', vencido: 'Vencido', pagado: 'Pagado' }[status] || 'Pendiente';
  }

  function isExpiredMoreThanTwoDays(order) {
    const status = normalizeStatus(order);
    if (status === 'pagado') return false;
    const due = order.fechaVencimientoPago || order.paymentDueAt || '';
    const dueTime = due ? new Date(due).getTime() : 0;
    return dueTime && dueTime < Date.now() - (48 * 60 * 60 * 1000);
  }

  function parseJsonSafe(value, fallback) {
    if (Array.isArray(value) || (value && typeof value === 'object')) return value;
    try { return JSON.parse(value || ''); } catch { return fallback; }
  }

  function getOrderItems(order) {
    const items = parseJsonSafe(order.serviciosJson, order.items || []);
    return Array.isArray(items) ? items : [];
  }

  function getOrderPassengers(order) {
    const passengers = parseJsonSafe(order.pasajerosJson, order.passengers || []);
    return Array.isArray(passengers) ? passengers : [];
  }

  function getOrderLead(order) {
    const lead = parseJsonSafe(order.titularJson, order.lead || {});
    return lead && typeof lead === 'object' && !Array.isArray(lead) ? lead : {};
  }

  function compactServiceName(name = '') {
    const clean = String(name || 'Servicio').replace(/\s+/g, ' ').trim();
    return clean.split(' + ')[0].split(' - ')[0] || clean;
  }

  function servicesText(order) {
    const items = getOrderItems(order);
    if (!items.length) return '<span>Sin detalle visible</span>';
    return items.map((item) => {
      const name = item.serviceShortName || compactServiceName(item.serviceName || item.title || item.name || 'Servicio');
      return `<span class="service-line">${escapeHtml(name)} <small>(${Number(item.pax || 1)} PAXS)</small></span>`;
    }).join('');
  }

  function orderExchangeRate(order) {
    const rate = Number(order.tipoCambio || order.exchangeRate || 3.38);
    return rate > 0 ? rate : 3.38;
  }

  function itemUnitPrice(item, currency, order = {}) {
    const rate = orderExchangeRate(order);
    const pen = Number(item.unitPricePEN ?? item.pricePEN ?? 0);
    const usdRaw = item.unitPriceUSD ?? item.priceUSD;
    const usd = usdRaw !== null && usdRaw !== undefined && usdRaw !== '' ? Number(usdRaw) : null;

    if (currency === 'PEN') {
      if (pen) return pen;
      if (usd !== null) return usd * rate;
    }

    if (currency === 'USD') {
      if (usd !== null && usd) return usd;
      if (pen) return pen / rate;
    }

    if (item.price && typeof item.price === 'object') return Number(item.price.amount || 0);
    return Number(item.unitPrice || item.price || 0);
  }

  function normalizeItemLead(item, order) {
    return item.lead || getOrderLead(order) || {};
  }

  function normalizeItemPassengers(item) {
    if (Array.isArray(item.passengers)) return item.passengers;
    if (Array.isArray(item.tourists)) return item.tourists;
    return [];
  }

  function normalizeOrderCode(order) {
    return String(order?.codigoOrden || order?.code || '').replace(/[^A-Za-z0-9]/g, '');
  }

  function normalizeLocalOrder(order) {
    if (!order || typeof order !== 'object') return order;
    return {
      ...order,
      codigoOrden: order.codigoOrden || order.code || '',
      fechaOrden: order.fechaOrden || order.createdAt || order.date || '',
      estadoPago: order.estadoPago || order.status || 'Pendiente',
      moneda: order.moneda || order.currency || 'PEN',
      tipoCambio: order.tipoCambio || order.exchangeRate || '',
      subtotalNeto: order.subtotalNeto ?? order.subtotal ?? '',
      montoComisionado: order.montoComisionado ?? order.total ?? '',
      comisionPaypalBanco: order.comisionPaypalBanco ?? order.fee ?? '',
      fechaVencimientoPago: order.fechaVencimientoPago || order.paymentDueAt || '',
      serviciosJson: order.serviciosJson || JSON.stringify(order.items || []),
      titularJson: order.titularJson || JSON.stringify((order.items || [])[0]?.lead || order.lead || {}),
      pasajerosJson: order.pasajerosJson || JSON.stringify((order.items || []).flatMap((item) => item.passengers || [])),
      observaciones: order.observaciones || order.observations || ''
    };
  }

  function mergeOrders(remoteOrders, localOrders) {
    const map = new Map();
    [...localOrders.map(normalizeLocalOrder), ...remoteOrders.map(normalizeLocalOrder)].forEach((order) => {
      const code = normalizeOrderCode(order) || `local-${Math.random().toString(36).slice(2)}`;
      map.set(code, order);
    });
    return [...map.values()].sort((a, b) => {
      const da = new Date(a.fechaOrden || a.createdAt || 0).getTime() || 0;
      const db = new Date(b.fechaOrden || b.createdAt || 0).getTime() || 0;
      return db - da;
    });
  }

  async function fetchOrders(session) {
    const local = readJSON(LOCAL_ORDERS_KEY, []);
    let remote = [];
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'listOrders', email: session.email, agencyId: session.agencyId })
      });
      const text = await response.text();
      let result = null;
      try { result = JSON.parse(text); } catch (parseError) {
        console.warn('Respuesta no JSON al cargar órdenes:', text);
      }
      if (result?.ok && Array.isArray(result.orders)) {
        remote = result.orders;
      } else if (result && result.message) {
        console.warn('Apps Script no devolvió órdenes:', result.message);
      }
    } catch (error) {
      console.warn('No se pudieron cargar órdenes desde Google Sheets', error);
    }
    return mergeOrders(remote, local);
  }

  function renderOrders() {
    const filter = $('#statusFilter').value;
    const visibleOrders = orders.filter((order) => !isExpiredMoreThanTwoDays(order));
    const filtered = visibleOrders.filter((order) => !filter || normalizeStatus(order) === filter || normalizeStatus(order).includes(filter));
    $('#ordersCount').textContent = filtered.length;
    if (!filtered.length) {
      $('#ordersMessage').hidden = false;
      $('#ordersMessage').textContent = 'No hay órdenes para mostrar con este filtro.';
      $('#ordersTableWrap').hidden = true;
      return;
    }
    $('#ordersMessage').hidden = true;
    $('#ordersTableWrap').hidden = false;
    $('#ordersTableBody').innerHTML = filtered.map((order) => {
      const index = orders.indexOf(order);
      const status = normalizeStatus(order);
      const total = order.montoComisionado || order.total || 0;
      const currency = order.moneda || order.currency || 'PEN';
      const code = String(order.codigoOrden || order.code || '').replace(/[^A-Za-z0-9]/g, '');
      return `
        <tr>
          <td class="order-code-cell"><strong>${escapeHtml(code)}</strong></td>
          <td class="order-date-cell">${formatDateTime(order.fechaOrden || order.createdAt)}</td>
          <td><span class="status-pill is-${status}">${statusLabel(status)}</span></td>
          <td class="order-services-cell">${servicesText(order)}</td>
          <td class="order-total-cell"><strong>${money(total, currency)}</strong></td>
          <td class="order-action-cell">
            <button type="button" class="agency-button agency-button--primary agency-button--small order-detail-button" data-order-detail="${index}">Ver detalles</button>
          </td>
        </tr>`;
    }).join('');
    $$('[data-order-detail]').forEach((button) => {
      button.addEventListener('click', () => openOrderDetail(Number(button.dataset.orderDetail)));
    });
  }

  function passengersList(passengers) {
    if (!passengers.length) return '<li>Datos adicionales pendientes.</li>';
    return passengers.map((p, index) => {
      const name = [p.firstName || p.first || p.nombres, p.lastName || p.last || p.apellidos].filter(Boolean).join(' ');
      const doc = [p.docType || p.tipoDocumento, p.docNumber || p.doc || p.numeroDocumento].filter(Boolean).join(' ');
      return `<li>Pasajero ${index + 2}: ${escapeHtml(name || 'Nombre pendiente')}${doc ? ` · ${escapeHtml(doc)}` : ''}</li>`;
    }).join('');
  }

  function orderItemsRows(order) {
    const items = getOrderItems(order);
    const currency = order.moneda || order.currency || 'PEN';
    if (!items.length) {
      const lead = getOrderLead(order);
      const allPassengers = getOrderPassengers(order);
      return `<tr><td colspan="5">No se encontró detalle de servicios en esta orden.</td></tr>
        <tr class="order-passenger-row"><td></td><td colspan="4"><strong>Titular:</strong> ${escapeHtml([lead.firstName || lead.first, lead.lastName || lead.last].filter(Boolean).join(' ') || 'Pendiente')}<br><strong>Pasajeros:</strong><ul>${passengersList(allPassengers)}</ul></td></tr>`;
    }
    return items.map((item, index) => {
      const lead = normalizeItemLead(item, order);
      const passengers = normalizeItemPassengers(item);
      const pax = Number(item.pax || item.passengersCount || 1);
      const unit = itemUnitPrice(item, currency, order);
      const amount = Number(item.subtotal || (unit * pax) || 0);
      const pickup = item.pickupPoint || item.pickup || item.hotel || '';
      const notes = item.notes || item.observations || '';
      const leadName = [lead.firstName || lead.first || lead.nombres, lead.lastName || lead.last || lead.apellidos].filter(Boolean).join(' ');
      const leadDoc = [lead.docType || lead.tipoDocumento, lead.docNumber || lead.doc || lead.numeroDocumento].filter(Boolean).join(' ');
      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHtml(item.serviceName || item.title || item.name || 'Servicio')}</strong><br>
            <small>Fecha: ${formatDate(item.travelDate || item.date || '')} · Hora: ${escapeHtml(item.serviceTime || item.time || 'Por confirmar')}</small><br>
            <small>Recojo: ${escapeHtml(pickup || 'Por confirmar')}</small>
          </td>
          <td>${pax}</td>
          <td>${money(unit, currency)}</td>
          <td><strong>${money(amount, currency)}</strong></td>
        </tr>
        <tr class="order-passenger-row">
          <td></td>
          <td colspan="4">
            <strong>Datos del titular:</strong> ${escapeHtml(leadName || 'Pendiente')} ${leadDoc ? `· ${escapeHtml(leadDoc)}` : ''} ${lead.phone ? `· ${escapeHtml(lead.phone)}` : ''}<br>
            <strong>Lugar de recojo:</strong> ${escapeHtml(pickup || 'Por confirmar')}<br>
            <strong>Pasajeros adicionales:</strong><ul>${passengersList(passengers)}</ul>
            ${notes ? `<strong>Observaciones:</strong> ${escapeHtml(notes)}` : ''}
          </td>
        </tr>`;
    }).join('');
  }

  function orderDetailHTML(order) {
    const currency = order.moneda || order.currency || 'PEN';
    const code = String(order.codigoOrden || order.code || '').replace(/[^A-Za-z0-9]/g, '');
    const status = statusLabel(normalizeStatus(order));
    const agencyName = order.agenciaNombre || order.account?.companyName || $('#ordersAgencyName')?.textContent || 'Agencia afiliada';
    return `
      <div id="orderPrintArea" class="order-print-area">
        <div class="print-order-head">
          <div>
            <p class="eyebrow">Detalle de orden</p>
            <h2>${escapeHtml(code)}</h2>
            <p>Agencia: <strong>${escapeHtml(agencyName)}</strong></p>
          </div>
          <div class="print-order-status is-${normalizeStatus(order)}">
            <span>${escapeHtml(status)}</span>
            <small>Vence: ${formatDateTime(order.fechaVencimientoPago || order.paymentDueAt)}</small>
          </div>
        </div>
        <div class="info-note"><strong>Importante:</strong> revisa los datos de titulares, pasajeros y recojos antes de realizar el pago. Las órdenes pendientes se confirman con pago validado dentro del plazo indicado.</div>
        <div class="order-table-wrap">
          <table class="order-table">
            <thead><tr><th>#</th><th>Servicio / recojo</th><th>Pax</th><th>Tarifa</th><th>Subtotal</th></tr></thead>
            <tbody>${orderItemsRows(order)}</tbody>
          </table>
        </div>
        <div class="order-totals">
          <div><span>Subtotal neto</span><strong>${money(order.subtotalNeto || order.subtotal || 0, currency)}</strong></div>
          <div><span>Comisiones PayPal + banco</span><strong>${money(order.comisionPaypalBanco || order.fee || 0, currency)}</strong></div>
          <div class="grand"><span>Total a pagar</span><strong>${money(order.montoComisionado || order.total || 0, currency)}</strong></div>
        </div>
        ${order.observaciones || order.observations ? `<p class="small-print-note"><strong>Observaciones generales:</strong> ${escapeHtml(order.observaciones || order.observations)}</p>` : ''}
      </div>
      <div class="dialog-actions order-modal-actions">
        <button type="button" class="agency-button agency-button--ghost" data-close-order-detail>Cerrar</button>
        <button type="button" class="agency-button paypal-button" id="payOrderWithPayPalButton" data-order-code="${escapeHtml(code)}">Pagar con PayPal</button>
        <button type="button" class="agency-button agency-button--primary" id="printOrderDetailButton">Imprimir detalle</button>
      </div>`;
  }

  function openOrderDetail(index) {
    const order = orders[index];
    if (!order) return;
    $('#orderDetailBody').innerHTML = orderDetailHTML(order);
    $('#orderDetailModal').classList.add('show');
    $('[data-close-order-detail]')?.addEventListener('click', closeOrderDetail);
    $('#printOrderDetailButton')?.addEventListener('click', printOrderDetail);
    $('#payOrderWithPayPalButton')?.addEventListener('click', () => startPayPalPayment(order));
  }

  function closeOrderDetail() {
    $('#orderDetailModal').classList.remove('show');
  }



  async function startPayPalPayment(order) {
    const status = normalizeStatus(order);
    if (status === 'pagado') { alert('Esta orden ya figura como pagada.'); return; }
    if (status === 'vencido') { alert('Esta orden está vencida. Genera una nueva orden o consulta disponibilidad.'); return; }
    const button = $('#payOrderWithPayPalButton');
    if (button) { button.disabled = true; button.textContent = 'Conectando con PayPal...'; }
    try {
      const code = String(order.codigoOrden || order.code || '').replace(/[^A-Za-z0-9]/g, '');
      const result = await sendToSheet('createPayPalOrder', {
        code,
        currency: order.moneda || order.currency || 'USD',
        total: Number(order.montoComisionado || order.total || 0),
        account: readJSON(SESSION_KEY, {})
      });
      if (!result.ok || !result.approvalUrl) {
        alert(result.message || 'No se pudo crear el pago en PayPal.');
        return;
      }
      window.location.href = result.approvalUrl;
    } catch (error) {
      console.error(error);
      alert('No se pudo conectar con PayPal.');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Pagar con PayPal'; }
    }
  }

  async function sendToSheet(action, payload) {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    const text = await response.text();
    try { return JSON.parse(text); } catch { return { ok:false, message:'Respuesta no válida de Apps Script.' }; }
  }

  function printOrderDetail() {
    document.body.classList.add('printing-order');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-order'), 600);
  }



  function bindLogout() {
    const logoutButtons = [
      document.getElementById('logoutButton'),
      document.getElementById('logoutBtn'),
      document.querySelector('[data-logout]')
    ].filter(Boolean);
    logoutButtons.forEach((button) => {
      button.addEventListener('click', () => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('mctAgencySession');
        window.location.href = './login.html';
      });
    });
  }

  async function init() {
    bindLogout();
    const session = requireSession();
    if (!session) return;
    orders = await fetchOrders(session);
    renderOrders();
    $('#statusFilter').addEventListener('change', renderOrders);
    $('#refreshOrdersButton').addEventListener('click', async () => { orders = await fetchOrders(session); renderOrders(); });
    $('#orderDetailModal')?.addEventListener('click', (event) => { if (event.target.id === 'orderDetailModal') closeOrderDetail(); });
    $$('[data-close-order-detail-static]').forEach((button) => button.addEventListener('click', closeOrderDetail));
  }

  init();
})();
