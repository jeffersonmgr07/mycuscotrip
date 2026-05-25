(() => {
  const AGENCIES = 'mct_registered_agencies';
  const SESSION = 'mct_agency_session';
  const CONFIG = { googleScriptUrl: '' }; // Pega aquí la URL de Google Apps Script si quieres enviar registros a Google Sheets.
  const TAX_LABELS = { PE: 'RUC', MX: 'RFC', CL: 'RUT', BR: 'CNPJ', CO: 'NIT', AR: 'CUIT', BO: 'NIT', EC: 'RUC', US: 'EIN / Tax ID', OTHER: 'Identificación fiscal' };
  const $ = (selector) => document.querySelector(selector);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const value = (selector) => $(selector)?.value.trim() || '';
  const show = (message, type = 'is-error') => { const el = $('#registerMessage'); el.textContent = message; el.className = `form-message ${type}`; el.hidden = false; };
  const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const createSalt = () => { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(''); };
  async function hashPassword(password, salt) { const input = new TextEncoder().encode(`${salt}:${password}`); const digest = await crypto.subtle.digest('SHA-256', input); return toHex(digest); }

  function syncCountry() {
    const country = $('#companyCountry').value;
    $('#taxLabel').textContent = TAX_LABELS[country] || 'Identificación fiscal';
  }

  async function sendToSheet(action, payload) {
    if (!CONFIG.googleScriptUrl) return;
    try {
      await fetch(CONFIG.googleScriptUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, payload }) });
    } catch (error) { console.warn('No se pudo enviar a Google Sheets', error); }
  }

  $('#companyCountry')?.addEventListener('change', syncCountry);
  $('#companyEmail')?.addEventListener('input', () => { if (!$('#accessEmail').value.trim()) $('#accessEmail').value = $('#companyEmail').value.trim(); });
  $('#companyPhone')?.addEventListener('input', () => { if (!$('#accessPhone').value.trim()) $('#accessPhone').value = $('#companyPhone').value.trim(); });

  $('#agencyRegisterForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = $('#agencyRegisterForm');
    if (!form.reportValidity()) return;
    const password = $('#registerPassword').value;
    const confirm = $('#registerPasswordConfirm').value;
    if (password !== confirm) { show('Las contraseñas no coinciden.'); return; }
    const accessEmail = value('#accessEmail').toLowerCase();
    const agencies = read(AGENCIES, []);
    if (agencies.some((item) => item.accessEmail === accessEmail)) { show('Ya existe un acceso registrado con ese correo.'); return; }
    const salt = createSalt();
    const passwordHash = await hashPassword(password, salt);
    const agency = {
      id: `account_${Date.now()}`,
      status: 'Activo',
      createdAt: new Date().toISOString(),
      accessEmail,
      accessPhone: value('#accessPhone'),
      passwordSalt: salt,
      passwordHash,
      authMode: 'browser_hash_demo',
      company: { country: value('#companyCountry'), taxLabel: $('#taxLabel').textContent, taxId: value('#companyTaxId'), legalName: value('#companyName'), tradeName: value('#tradeName'), email: value('#companyEmail').toLowerCase(), phone: value('#companyPhone'), website: value('#companyWebsite') },
      legalRepresentative: { firstName: value('#legalFirstName'), lastName: value('#legalLastName'), docType: value('#legalDocType'), docNumber: value('#legalDocNumber') }
    };
    agencies.unshift(agency); write(AGENCIES, agencies);
    write(SESSION, { email: agency.accessEmail, companyName: agency.company.tradeName || agency.company.legalName, contactName: agency.legalRepresentative.firstName, loggedAt: new Date().toISOString(), localSession: true });
    await sendToSheet('registerAgency', agency);
    show('Acceso creado correctamente. Serás redirigido al portal de reservas.', 'is-success');
    setTimeout(() => { window.location.href = './index.html'; }, 900);
  });

  syncCountry();
})();
