(() => {
  const CONFIG = {
    googleScriptUrl: 'https://script.google.com/macros/s/AKfycbycmduYce7cpGoMSqR3iqubsC46DiIox7qaNJXFFW8abQpr0s1SYCnYfyA2w95_vGYQ/exec?authuser=0'
  };

  const TAX_LABELS = {
    PE: 'RUC', MX: 'RFC', CL: 'RUT', BR: 'CNPJ', CO: 'NIT', AR: 'CUIT',
    BO: 'NIT', EC: 'RUC', US: 'EIN / Tax ID', ES: 'NIF / CIF', OTHER: 'Identificación fiscal'
  };

  const $ = (selector) => document.querySelector(selector);
  const value = (selector) => $(selector)?.value.trim() || '';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TAX_RE = /^[A-Za-z0-9.\-\s]{4,24}$/;
  const LETTERS_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]+$/;
  const I18N = window.MCTAgenciesI18n || null;
  const t = (key, fallback = key) => I18N?.t ? I18N.t(key) : fallback;

  function onlyDigits(input) {
    if (!input) return;
    input.value = input.value.replace(/\D+/g, '');
  }

  function validateEmailField(selector, label) {
    const email = value(selector).toLowerCase();
    if (!EMAIL_RE.test(email)) return `${label} debe ser un correo válido, por ejemplo nombre@dominio.com.`;
    return '';
  }

  function validateFiscalId() {
    if (value('#registrationType') !== 'company') return '';
    const taxId = value('#companyTaxId');
    if (!TAX_RE.test(taxId)) {
      return 'El número de identificación fiscal debe contener solo letras, números, punto o guion.';
    }
    return '';
  }

  function syncRegistrationType() {
    const type = value('#registrationType') || 'natural';
    const isCompany = type === 'company';
    document.querySelectorAll('[data-company-field]').forEach((field) => {
      field.hidden = !isCompany;
      field.querySelectorAll('input, select, textarea').forEach((control) => {
        control.required = isCompany;
        if (!isCompany) control.value = '';
      });
    });
    const companyName = $('#companyName');
    const tradeName = $('#tradeName');
    if (!isCompany) {
      const fullName = `${value('#legalFirstName')} ${value('#legalLastName')}`.trim();
      if (companyName) companyName.value = fullName ? `Persona natural - ${fullName}` : 'Persona natural';
      if (tradeName) tradeName.value = fullName || 'Agente de viajes independiente';
    }
  }


  function show(message, type = 'is-error') {
    const el = $('#registerMessage');
    if (!el) return;
    el.textContent = message;
    el.className = `form-message ${type}`;
    el.hidden = false;
  }

  function syncCountry() {
    const country = $('#companyCountry')?.value || 'PE';
    const taxLabel = $('#taxLabel');
    if (taxLabel) taxLabel.textContent = TAX_LABELS[country] || 'Identificación fiscal';

    const phoneCountry = $('#companyPhoneCountry');
    const map = { PE:'+51', MX:'+52', CL:'+56', BR:'+55', CO:'+57', AR:'+54', BO:'+591', EC:'+593', US:'+1' };
    if (phoneCountry && map[country]) phoneCountry.value = map[country];
  }

  function normalizePhone() {
    const countryCode = value('#companyPhoneCountry').replace(/\D+/g, '').trim();
    const phone = value('#companyPhone').replace(/\D+/g, '').trim();
    return `${countryCode} ${phone}`.trim();
  }

  function validatePassword(password) {
    if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
    if (!/[A-ZÁÉÍÓÚÜÑ]/.test(password)) return 'La contraseña debe incluir al menos una mayúscula.';
    if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.';
    if (!/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password)) return 'La contraseña debe incluir al menos un carácter especial, por ejemplo @, #, $, %, &, * o !.';
    return '';
  }

  async function sendToSheet(action, payload) {
    if (!CONFIG.googleScriptUrl || CONFIG.googleScriptUrl.includes('PEGA_AQUI')) {
      throw new Error('Falta configurar la URL de Google Apps Script.');
    }

    const response = await fetch(CONFIG.googleScriptUrl, {
      method: 'POST',
      // Sin headers para evitar preflight/CORS con Google Apps Script.
      body: JSON.stringify({ action, payload })
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Respuesta no JSON de Apps Script:', text);
      throw new Error('Google Apps Script no devolvió una respuesta JSON válida. Revisa que la URL termine en /exec y que la implementación esté publicada para “Cualquier persona”.');
    }
  }



  function passwordRules(password, confirm) {
    return {
      length: password.length >= 8,
      upper: /[A-ZÁÉÍÓÚÜÑ]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password),
      match: Boolean(password) && password === confirm
    };
  }

  function updatePasswordChecklist() {
    const password = $('#registerPassword')?.value || '';
    const confirm = $('#registerPasswordConfirm')?.value || '';
    const rules = passwordRules(password, confirm);
    Object.entries(rules).forEach(([key, ok]) => {
      const el = document.querySelector(`#passwordChecklist [data-rule="${key}"]`);
      if (el) {
        el.classList.toggle('is-ok', ok);
        const icon = el.querySelector('i');
        if (icon) icon.className = ok ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
      }
    });
  }

  function bindPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        const icon = button.querySelector('i');
        if (icon) icon.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        else button.textContent = show ? t('login.hide', 'Ocultar') : t('login.show', 'Ver');
      });
    });
    $('#registerPassword')?.addEventListener('input', updatePasswordChecklist);
    $('#registerPasswordConfirm')?.addEventListener('input', updatePasswordChecklist);
  }

  $('#registrationType')?.addEventListener('change', syncRegistrationType);
  $('#companyCountry')?.addEventListener('change', syncCountry);
  $('#companyPhone')?.addEventListener('input', (event) => onlyDigits(event.target));
  $('#companyTaxId')?.addEventListener('input', (event) => { event.target.value = event.target.value.replace(/[^A-Za-z0-9.\-\s]/g, '').toUpperCase(); });
  document.querySelectorAll('[data-letters-only]').forEach((input) => {
    input.addEventListener('input', (event) => { event.target.value = event.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]/g, ''); syncRegistrationType(); });
  });
  $('#legalFirstName')?.addEventListener('input', syncRegistrationType);
  $('#legalLastName')?.addEventListener('input', syncRegistrationType);

  $('#agencyRegisterForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = $('#agencyRegisterForm');
    if (!form.reportValidity()) return;

    const password = $('#registerPassword').value;
    const confirm = $('#registerPasswordConfirm').value;
    const passwordError = validatePassword(password);
    if (passwordError) { show(passwordError); return; }
    if (password !== confirm) { show('Las contraseñas no coinciden.'); return; }

    if (!LETTERS_RE.test(value('#legalFirstName')) || !LETTERS_RE.test(value('#legalLastName'))) { show('Los nombres y apellidos solo deben contener letras.'); return; }
    const fiscalError = validateFiscalId();
    if (fiscalError) { show(fiscalError); return; }
    const phoneDigits = value('#companyPhone').replace(/\D+/g, '');
    if (!/^\d{6,15}$/.test(phoneDigits)) { show('El número de WhatsApp debe contener solo números, entre 6 y 15 dígitos.'); return; }
    const accessEmailError = validateEmailField('#accessEmail', 'El correo de inicio de sesión');
    if (accessEmailError) { show(accessEmailError); return; }

    const button = event.submitter;
    const originalText = button?.textContent || t('register.submit', 'Registrar mi agencia');
    if (button) { button.disabled = true; button.textContent = t('register.sending', 'Enviando registro...'); }

    syncRegistrationType();
    const phone = normalizePhone();
    const registrationType = value('#registrationType') || 'natural';
    const representativeName = `${value('#legalFirstName')} ${value('#legalLastName')}`.trim();
    const accessEmail = value('#accessEmail').toLowerCase();
    const legalName = registrationType === 'company' ? value('#companyName') : `Persona natural - ${representativeName}`;
    const tradeName = registrationType === 'company' ? value('#tradeName') : representativeName;
    const agency = {
      id: `AG-${Date.now()}`,
      status: 'Aprobado',
      registrationType,
      password,
      accessEmail,
      email: accessEmail,
      country: value('#companyCountry'),
      taxLabel: registrationType === 'company' ? ($('#taxLabel')?.textContent || '') : '',
      taxNumber: registrationType === 'company' ? value('#companyTaxId') : '',
      legalName,
      commercialName: tradeName,
      repNames: value('#legalFirstName'),
      repLastnames: value('#legalLastName'),
      docType: value('#legalDocType'),
      docNumber: value('#legalDocNumber'),
      phone,
      website: value('#companyWebsite'),
      company: {
        country: value('#companyCountry'),
        taxLabel: registrationType === 'company' ? ($('#taxLabel')?.textContent || '') : '',
        taxId: registrationType === 'company' ? value('#companyTaxId') : '',
        legalName,
        tradeName,
        email: accessEmail,
        phone,
        phoneCountry: value('#companyPhoneCountry'),
        phoneNumber: value('#companyPhone'),
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
      if (!result.ok) {
        show(result.message || 'No se pudo registrar la agencia.');
        return;
      }
      show(result.message || 'Registro recibido correctamente. Revisa tu correo para verificar el email. Luego podrás ingresar al portal.', 'is-success');
      form.reset();
      syncCountry();
      syncRegistrationType();
      setTimeout(() => { window.location.href = './login.html'; }, 2600);
    } catch (error) {
      console.error(error);
      show(error.message || 'No se pudo conectar con Google Apps Script. Revisa la URL y la implementación.');
    } finally {
      if (button) { button.disabled = false; button.textContent = originalText; }
    }
  });

  bindPasswordToggles();
  updatePasswordChecklist();
  syncCountry();
  syncRegistrationType();
})();
