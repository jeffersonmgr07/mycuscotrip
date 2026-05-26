(() => {
  const AGENCIES = 'mct_registered_agencies';
  const SESSION = 'mct_agency_session';
  const CONFIG = { googleScriptUrl: 'https://script.google.com/macros/s/AKfycbwu0pXSr_rnfeG_L6oc2lzdgj3iJ_HrgeifVJ7WyRLFUWG_UW548oMM2UpDgNlq5pD7/exec' };
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
    if (!CONFIG.googleScriptUrl || CONFIG.googleScriptUrl.includes('PEGA_AQUI')) {
      throw new Error('Falta configurar la URL de Google Apps Script.');
    }
    const response = await fetch(CONFIG.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    return await response.json();
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
    const button = event.submitter;
    const originalText = button?.textContent || 'Registrar mi agencia';
    if (button) { button.disabled = true; button.textContent = 'Enviando registro...'; }
    const agency = {
      id: `AG-${Date.now()}`,
      status: 'Pendiente',
      password,
      accessEmail: value('#accessEmail').toLowerCase(),
      accessPhone: value('#accessPhone'),
      company: {
        country: value('#companyCountry'),
        taxLabel: $('#taxLabel').textContent,
        taxId: value('#companyTaxId'),
        legalName: value('#companyName'),
        tradeName: value('#tradeName'),
        email: value('#companyEmail').toLowerCase(),
        phone: value('#companyPhone'),
        website: value('#companyWebsite')
      },
      legalRepresentative: {
        firstName: value('#legalFirstName'),
        lastName: value('#legalLastName'),
        docType: value('#legalDocType'),
        docNumber: value('#legalDocNumber')
      }
    };
    try {
      const result = await sendToSheet('registerAgency', agency);
      if (!result.ok) { show(result.message || 'No se pudo registrar la agencia.'); return; }
      show('Registro recibido correctamente. Activaremos tu acceso después de validar los datos.', 'is-success');
      setTimeout(() => { window.location.href = './login.html'; }, 1200);
    } catch (error) {
      console.error(error);
      show('No se pudo conectar con Google Apps Script. Revisa la URL y la implementación.');
    } finally {
      if (button) { button.disabled = false; button.textContent = originalText; }
    }
  });


  syncCountry();
})();
