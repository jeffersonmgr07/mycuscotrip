(() => {
  const SESSION_KEY = 'mct_agency_session';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwf5cwaC5VsT48XvXh480Jh4ZCVKuBo55AQ9sqon449Tg1ic8rLrHHicuYiMrfneDsA/exec?authuser=0';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const show = (id, message, type = 'is-error') => { const el = $(id); if (!el) return; el.textContent = message; el.className = `form-message ${type}`; el.hidden = false; };

  function requireSession() {
    const session = readJSON(SESSION_KEY, null);
    if (!session?.email) { window.location.href = './login.html'; return null; }
    return session;
  }

  async function callApps(action, payload) {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload, email: payload?.account?.email, agencyId: payload?.account?.agencyId })
    });
    const text = await response.text();
    try { return JSON.parse(text); } catch { return { ok:false, message:'No se pudo leer la respuesta del servidor.' }; }
  }

  function validPassword(password) {
    if (!password || password.length < 8) return false;
    return /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) && /\d/.test(password) && /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password);
  }

  function passwordRules(password, confirm) {
    return {
      length: password.length >= 8,
      letter: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password),
      match: Boolean(password) && password === confirm
    };
  }

  function updatePasswordChecklist() {
    const password = $('#newPassword')?.value || '';
    const confirm = $('#confirmPassword')?.value || '';
    const rules = passwordRules(password, confirm);
    Object.entries(rules).forEach(([key, ok]) => {
      const el = $(`#profilePasswordChecklist [data-rule="${key}"]`);
      if (el) el.classList.toggle('is-ok', ok);
    });
  }

  function bindPasswordToggles() {
    $$('[data-toggle-password]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        const showValue = input.type === 'password';
        input.type = showValue ? 'text' : 'password';
        button.textContent = showValue ? 'Ocultar' : 'Ver';
      });
    });
    $('#newPassword')?.addEventListener('input', updatePasswordChecklist);
    $('#confirmPassword')?.addEventListener('input', updatePasswordChecklist);
  }

  function phoneCountryFromSession(session) {
    const country = String(session.country || session.pais || '').trim().toUpperCase();
    const map = { PE:'51', PERU:'51', 'PERÚ':'51', MX:'52', CL:'56', BR:'55', CO:'57', AR:'54', BO:'591', EC:'593', US:'1' };
    return map[country] || '51';
  }

  function parsePhone(raw, fallbackCountry = '51') {
    const clean = String(raw || '').replace('#ERROR!', '').trim();
    const digits = clean.replace(/\D+/g, '');
    if (!digits) return { country: fallbackCountry, number: '' };
    const codes = ['591','593','51','52','56','55','57','54','34','44','33','49','39','81','82','86','1'];
    const code = codes.find((c) => digits.startsWith(c) && digits.length > c.length + 4) || fallbackCountry;
    const number = digits.startsWith(code) ? digits.slice(code.length) : digits;
    return { country: code, number };
  }

  function composePhone() {
    const code = ($('#profilePhoneCountry')?.value || '51').replace(/\D+/g, '');
    const number = ($('#profilePhone')?.value || '').replace(/\D+/g, '');
    return number ? `${code} ${number}` : '';
  }

  async function init() {
    const session = requireSession();
    if (!session) return;
    $('#profileCompany').value = session.companyName || '';
    $('#profileEmail').value = session.email || '';
    $('#profilePhoneCountry').value = phoneCountryFromSession(session);
    try {
      const result = await callApps('getAgencyProfile', { account: session });
      if (result.ok && result.profile) {
        $('#profileCompany').value = result.profile.nombreComercial || result.profile.razonSocial || session.companyName || '';
        const parsed = parsePhone(result.profile.celular, phoneCountryFromSession(session));
        $('#profilePhoneCountry').value = parsed.country;
        $('#profilePhone').value = parsed.number;
        $('#profileWeb').value = result.profile.web || '';
      }
    } catch (error) { console.warn(error); }

    $('#profileForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.submitter;
      const phoneDigits = $('#profilePhone').value.replace(/\D+/g, '');
      if (phoneDigits && !/^\d{6,15}$/.test(phoneDigits)) { show('#profileMessage', 'El WhatsApp debe contener solo números, entre 6 y 15 dígitos.'); return; }
      button.disabled = true;
      button.textContent = 'Guardando...';
      try {
        const celular = composePhone();
        const result = await callApps('updateAgencyProfile', { account: session, celular, web: $('#profileWeb').value.trim() });
        if (!result.ok) { show('#profileMessage', result.message || 'No se pudo actualizar.'); return; }
        const updatedSession = { ...session, phone: celular };
        writeJSON(SESSION_KEY, updatedSession);
        show('#profileMessage', result.message || 'Datos actualizados correctamente.', 'is-success');
      } finally {
        button.disabled = false;
        button.textContent = 'Guardar cambios';
      }
    });

    $('#passwordForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const currentPassword = $('#currentPassword').value;
      const newPassword = $('#newPassword').value;
      const confirmPassword = $('#confirmPassword').value;
      if (newPassword !== confirmPassword) { show('#passwordMessage', 'La confirmación no coincide.'); return; }
      if (!validPassword(newPassword)) { show('#passwordMessage', 'La nueva contraseña debe tener mínimo 8 caracteres, una letra, un número y un carácter especial.'); return; }
      const button = event.submitter;
      button.disabled = true;
      button.textContent = 'Actualizando...';
      try {
        const result = await callApps('changePassword', { account: session, currentPassword, newPassword });
        if (!result.ok) { show('#passwordMessage', result.message || 'No se pudo cambiar la contraseña.'); return; }
        show('#passwordMessage', result.message || 'Contraseña actualizada correctamente.', 'is-success');
        event.target.reset();
        updatePasswordChecklist();
      } finally {
        button.disabled = false;
        button.textContent = 'Actualizar contraseña';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindPasswordToggles();
    init();
    updatePasswordChecklist();
    $('#profilePhone')?.addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/\D+/g, '');
    });
  });
})();
