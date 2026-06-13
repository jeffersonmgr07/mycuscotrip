(() => {
  const API = window.MCT_HOTEL_MARKETPLACE_APPS_SCRIPT_URL || '';
  const $ = (s) => document.querySelector(s);
  const serialize = (form) => Object.fromEntries(new FormData(form).entries());
  async function post(action, payload) {
    if (!API) return { ok: true, localOnly: true, message: 'Demo local: configura Apps Script para guardar en Google Sheets.' };
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...payload }) });
    return res.json();
  }
  function showMsg(selector, text, ok = true) {
    const el = $(selector);
    if (!el) return;
    el.hidden = false;
    el.textContent = text;
    el.style.background = ok ? '#f2faf3' : '#fff2f2';
  }
  function dateRange(from, to) {
    const dates = [];
    if (!from || !to) return dates;
    const cursor = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);
    while (cursor < end) {
      dates.push(cursor.toISOString().slice(0,10));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }
  document.addEventListener('submit', async (event) => {
    const register = event.target.closest('#hotelOwnerRegisterForm');
    const login = event.target.closest('#hotelOwnerLoginForm');
    const marketForm = event.target.closest('[data-marketplace-form]');
    if (register) {
      event.preventDefault();
      const payload = serialize(register);
      const result = await post('register_owner', payload);
      showMsg('#hotelOwnerRegisterMsg', result.localOnly ? result.message : 'Registro enviado correctamente.');
    }
    if (login) {
      event.preventDefault();
      const payload = serialize(login);
      localStorage.setItem('mctHotelOwnerEmail', payload.email || '');
      showMsg('#hotelOwnerLoginMsg', 'Acceso demo correcto. Redirigiendo al panel...');
      setTimeout(() => { window.location.href = './panel-hotelero.html'; }, 500);
    }
    if (marketForm) {
      event.preventDefault();
      const type = marketForm.dataset.marketplaceForm;
      const payload = serialize(marketForm);
      let action = type === 'property' ? 'create_property' : type === 'room' ? 'create_room' : type === 'availability' ? 'block_dates' : 'update_confirmation_mode';
      if (type === 'availability') payload.dates = dateRange(payload.from, payload.to);
      const result = await post(action, payload);
      showMsg('#hotelPanelMsg', result.localOnly ? result.message : 'Cambios guardados correctamente.');
    }
  });
})();
