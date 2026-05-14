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

  $('#sameContact')?.addEventListener('change', () => {
    const hidden = $('#sameContact').checked;
    $('#commercialContactFields').hidden = hidden;
    ['commercialFirstName','commercialLastName','commercialDocNumber','commercialEmail','commercialPhone'].forEach((id) => {
      const input = $(`#${id}`);
      if (input) input.required = !hidden;
    });
  });

  $('#agencyRegisterForm')?.addEventListener('submit', (event) => {
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

    const file = $('#legalDocumentFile').files[0];
    const agency = {
      id: `agency_${Date.now()}`,
      status: 'Pendiente de revisión',
      createdAt: new Date().toISOString(),
      accessEmail,
      password,
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
      loggedAt: new Date().toISOString()
    });
    show('Registro creado correctamente. Ingresando al portal...', 'is-success');
    setTimeout(() => { window.location.href = './index.html'; }, 900);
  });
})();
