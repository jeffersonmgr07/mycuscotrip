(() => {
  const AGENCIES = 'mct_registered_agencies';
  const SESSION = 'mct_agency_session';
  const $ = (selector) => document.querySelector(selector);
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const value = (selector) => $(selector)?.value.trim() || '';
  const show = (message, type = 'is-error') => {
    const el = $('#registerMessage');
    el.textContent = message;
    el.className = `form-message ${type}`;
    el.hidden = false;
  };

  const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const createSalt = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };
  async function hashPassword(password, salt) {
    const input = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', input);
    return toHex(digest);
  }

  $('#sameContact')?.addEventListener('change', () => {
    const hidden = $('#sameContact').checked;
    $('#commercialContactFields').hidden = hidden;
    ['commercialFirstName','commercialLastName','commercialDocNumber','commercialEmail','commercialPhone'].forEach((id) => {
      const input = $(`#${id}`);
      if (input) input.required = !hidden;
    });
  });

  $('#agencyRegisterForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = $('#agencyRegisterForm');
    if (!form.reportValidity()) return;

    const password = $('#registerPassword').value;
    const confirm = $('#registerPasswordConfirm').value;
    if (password !== confirm) {
      show('Las contraseñas no coinciden.');
      return;
    }

    const same = $('#sameContact').checked;
    const accessEmail = (same ? value('#companyEmail') : value('#commercialEmail')).toLowerCase();
    const agencies = read(AGENCIES, []);
    if (agencies.some((item) => item.accessEmail === accessEmail)) {
      show('Ya existe una agencia registrada con ese correo de acceso.');
      return;
    }

    const salt = createSalt();
    const passwordHash = await hashPassword(password, salt);
    const file = $('#legalDocumentFile').files[0];
    const agency = {
      id: `agency_${Date.now()}`,
      status: 'Pendiente de revisión',
      createdAt: new Date().toISOString(),
      accessEmail,
      passwordSalt: salt,
      passwordHash,
      authMode: 'browser_demo_hash',
      company: {
        name: value('#companyName'),
        taxId: value('#companyTaxId'),
        email: value('#companyEmail').toLowerCase(),
        phone: value('#companyPhone'),
        address: value('#companyAddress'),
        website: value('#companyWebsite')
      },
      legalRepresentative: {
        firstName: value('#legalFirstName'),
        lastName: value('#legalLastName'),
        docType: value('#legalDocType'),
        docNumber: value('#legalDocNumber'),
        documentFileName: file?.name || ''
      },
      commercialContact: same ? {
        useCompanyEmail: true,
        firstName: value('#legalFirstName'),
        lastName: value('#legalLastName'),
        email: value('#companyEmail').toLowerCase(),
        phone: value('#companyPhone')
      } : {
        useCompanyEmail: false,
        firstName: value('#commercialFirstName'),
        lastName: value('#commercialLastName'),
        docType: value('#commercialDocType'),
        docNumber: value('#commercialDocNumber'),
        email: value('#commercialEmail').toLowerCase(),
        phone: value('#commercialPhone')
      }
    };

    agencies.unshift(agency);
    write(AGENCIES, agencies);
    write(SESSION, {
      email: agency.accessEmail,
      companyName: agency.company.name,
      contactName: agency.commercialContact.firstName,
      loggedAt: new Date().toISOString(),
      demoSession: true
    });
    show('Registro creado correctamente en modo demo. Para producción debe autenticarse desde backend.', 'is-success');
    setTimeout(() => { window.location.href = './index.html'; }, 900);
  });
})();
