(() => {
  const SESSION_KEY = 'mct_agency_session';
  const LOCAL_ORDERS_KEY = 'mct_reservation_orders';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz38yAU-vEt5Joe8NQjDRFsEIOqgDIv-w99YHI5sLbO03rKCt-dwAH10j0A92pyOAEx/exec';
  const $ = (selector, root = document) => root.querySelector(selector);
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

  function normalizeStatus(order) {
    const raw = String(order.estadoPago || order.status || 'Pendiente de pago').toLowerCase();
    if (raw.includes('pag')) return 'pagada';
    const due = order.fechaVencimientoPago || order.paymentDueAt || '';
    if (due && new Date(due).getTime() < Date.now() && !raw.includes('pag')) return 'vencida';
    if (raw.includes('venc')) return 'vencida';
    return 'pendiente';
  }

  function parseJsonSafe(value, fallback) {
    if (Array.isArray(value)) return value;
    try { return JSON.parse(value || ''); } catch { return fallback; }
  }

  function servicesText(order) {
    const items = parseJsonSafe(order.serviciosJson, order.items || []);
    if (!items.length) return 'Sin detalle visible';
    return items.map((item) => `${item.serviceName || item.title || item.name || 'Servicio'} (${item.pax || 1} pax)`).join(', ');
  }

  async function fetchOrders(session) {
    const local = readJSON(LOCAL_ORDERS_KEY, []);
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'listOrders', email: session.email, agencyId: session.agencyId })
      });
      const result = await response.json();
      if (result.ok && Array.isArray(result.orders)) return result.orders;
    } catch (error) {
      console.warn('No se pudieron cargar órdenes desde Google Sheets', error);
    }
    return local;
  }

  function renderOrders() {
    const filter = $('#statusFilter').value;
    const filtered = orders.filter((order) => !filter || normalizeStatus(order) === filter || normalizeStatus(order).includes(filter));
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
      const status = normalizeStatus(order);
      const total = order.montoComisionado || order.total || 0;
      const currency = order.moneda || order.currency || 'PEN';
      const code = order.codigoOrden || order.code || '';
      return `
        <tr>
          <td><strong>${escapeHtml(code)}</strong></td>
          <td>${formatDateTime(order.fechaOrden || order.createdAt)}</td>
          <td><span class="status-pill is-${status}">${status}</span></td>
          <td><strong>${money(total, currency)}</strong></td>
          <td>${escapeHtml(servicesText(order))}</td>
          <td><div class="order-detail-pre">Vence: ${formatDateTime(order.fechaVencimientoPago || order.paymentDueAt)}\nSubtotal: ${money(order.subtotalNeto || order.subtotal || 0, currency)}\nComisiones: ${money(order.comisionPaypalBanco || order.fee || 0, currency)}</div></td>
        </tr>`;
    }).join('');
  }

  async function init() {
    const session = requireSession();
    if (!session) return;
    orders = await fetchOrders(session);
    renderOrders();
    $('#statusFilter').addEventListener('change', renderOrders);
    $('#refreshOrdersButton').addEventListener('click', async () => { orders = await fetchOrders(session); renderOrders(); });
  }

  init();
})();
