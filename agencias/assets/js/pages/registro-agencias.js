(() => {
  const CONFIG = {
    googleScriptUrl: 'https://script.google.com/macros/s/AKfycbycmduYce7cpGoMSqR3iqubsC46DiIox7qaNJXFFW8abQpr0s1SYCnYfyA2w95_vGYQ/exec?authuser=0'
  };

  const TAX_LABELS = {
    PE: { label: 'RUC', placeholder: '11 dígitos' },
    MX: { label: 'RFC', placeholder: 'RFC de la empresa' },
    CL: { label: 'RUT', placeholder: 'RUT de la empresa' },
    BR: { label: 'CNPJ', placeholder: 'CNPJ de la empresa' },
    CO: { label: 'NIT', placeholder: 'NIT de la empresa' },
    AR: { label: 'CUIT', placeholder: 'CUIT de la empresa' },
    BO: { label: 'NIT', placeholder: 'NIT de la empresa' },
    EC: { label: 'RUC', placeholder: 'RUC de la empresa' },
    US: { label: 'EIN / Tax ID', placeholder: 'Tax ID de la empresa' },
    ES: { label: 'NIF / CIF', placeholder: 'NIF o CIF de la empresa' },
    OTHER: { label: 'Identificación fiscal', placeholder: 'Número fiscal de la empresa' }
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const value = (selector) => $(selector)?.value.trim() || '';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TAX_RE = /^[A-Za-z0-9.\-\s]{4,24}$/;
  const I18N = window.MCTAgenciesI18n || null;
  const t = (key, fallback = key) => I18N?.t ? I18N.t(key) : fallback;

  function onlyDigits(input) {
    if (input) input.value = input.value.replace(/\D+/g, '');
  }

  function setRequired(elements, required) {
    elements.forEach((el) => {
      if (!el) return;
      if (required) el.setAttribute('required', 'required');
      else el.removeAttribute('required');
    });
  }

  function toggleBySelector(selector, visible) {
    $$(selector).forEach((el) => { el.hidden = !visible; });
  }

  function syncRegistrationType() {
    const type = value('#registrationType') || 'natural';
    const isCompany = type === 'company';

    toggleBySelector('[data-natural-field]', !isCompany);
    toggleBySelector('[data-company-field]', isCompany);

    setRequired([$('#legalDocType'), $('#legalDocNumber')], !isCompany);
    setRequired([$('#companyName'), $('#companyTaxId'), $('#tradeName')], isCompany);

    const countryLabel = $('#countryContextLabel');
    if (countryLabel) countryLabel.textContent = isCompany ? 'País fiscal de la empresa' : 'Nacionalidad';

    syncCountry();
  }

  function validateEmailField(selector, label) {
    const email = value(selector).toLowerCase();
    if (!EMAIL_RE.test(email)) return `${label} debe ser un correo válido, por ejemplo nombre@dominio.com.`;
    return '';
  }

  function validateFiscalId() {
    if (value('#registrationType') !== 'company') return '';
    const taxId = value('#companyTaxId');
    if (!TAX_RE.test(taxId)) return 'El número de identificación fiscal debe contener letras, números, punto o guion.';
    return '';
  }

  function show(message, type = 'is-error') {
    const el = $('#registerMessage');
    if (!el) return;
    el.textContent = message;
    el.className = `form-message ${type}`;
    el.hidden = false;
  }

  function syncCountry() {
    const country = value('#companyCountry') || 'PE';
    const data = TAX_LABELS[country] || TAX_LABELS.OTHER;
    const taxLabel = $('#taxLabel');
    const taxInput = $('#companyTaxId');
    if (taxLabel) taxLabel.textContent = data.label;
    if (taxInput) taxInput.placeholder = data.placeholder;

    const phoneCountry = $('#companyPhoneCountry');
    const map = { PE:'+51', MX:'+52', CL:'+56', BR:'+55', CO:'+57', AR:'+54', BO:'+591', EC:'+593', US:'+1', ES:'+34' };
    if (phoneCountry && map[country]) phoneCountry.value = map[country];
  }

  function normalizePhone() {
    const countryCode = value('#companyPhoneCountry').replace(/\D+/g, '').trim();
    const phone = value('#companyPhone').replace(/\D+/g, '').trim();
    return `${countryCode} ${phone}`.trim();
  }

  function validatePassword(password) {
    if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
    if (!/[A-ZÁÉÍÓÚÑ]/.test(password)) return 'La contraseña debe incluir al menos una mayúscula.';
    if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.';
    if (!/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password)) return 'La contraseña debe incluir al menos un carácter especial, por ejemplo @, #, $, %, &, * o !.';
    return '';
  }

  function passwordRules(password, confirm) {
    return {
      length: password.length >= 8,
      upper: /[A-ZÁÉÍÓÚÑ]/.test(password),
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
      if (el) el.classList.toggle('is-ok', ok);
    });
  }

  function bindPasswordToggles() {
    $$('[data-toggle-password]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        const showPassword = input.type === 'password';
        input.type = showPassword ? 'text' : 'password';
        const icon = button.querySelector('i');
        if (icon) icon.className = showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        else button.textContent = showPassword ? t('login.hide', 'Ocultar') : t('login.show', 'Ver');
      });
    });
    $('#registerPassword')?.addEventListener('input', updatePasswordChecklist);
    $('#registerPasswordConfirm')?.addEventListener('input', updatePasswordChecklist);
  }

  async function sendToSheet(action, payload) {
    if (!CONFIG.googleScriptUrl || CONFIG.googleScriptUrl.includes('PEGA_AQUI')) {
      throw new Error('Falta configurar la URL de Google Apps Script.');
    }
    const response = await fetch(CONFIG.googleScriptUrl, { method: 'POST', body: JSON.stringify({ action, payload }) });
    const text = await response.text();
    try { return JSON.parse(text); }
    catch (error) {
      console.error('Respuesta no JSON de Apps Script:', text);
      throw new Error('Google Apps Script no devolvió una respuesta JSON válida. Revisa que la URL termine en /exec y que la implementación esté publicada para “Cualquier persona”.');
    }
  }

  $('#registrationType')?.addEventListener('change', syncRegistrationType);
  $('#companyCountry')?.addEventListener('change', syncCountry);
  $('#companyPhone')?.addEventListener('input', (event) => onlyDigits(event.target));
  $('#legalDocNumber')?.addEventListener('input', (event) => { event.target.value = event.target.value.replace(/[^A-Za-z0-9.\-\s]/g, '').toUpperCase(); });
  $('#companyTaxId')?.addEventListener('input', (event) => { event.target.value = event.target.value.replace(/[^A-Za-z0-9.\-\s]/g, '').toUpperCase(); });

  $('#agencyRegisterForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = $('#agencyRegisterForm');
    syncRegistrationType();
    if (!form.reportValidity()) return;

    const registrationType = value('#registrationType') || 'natural';
    const isCompany = registrationType === 'company';
    const password = $('#registerPassword').value;
    const confirm = $('#registerPasswordConfirm').value;
    const passwordError = validatePassword(password);
    if (passwordError) { show(passwordError); return; }
    if (password !== confirm) { show('Las contraseñas no coinciden.'); return; }

    const fiscalError = validateFiscalId();
    if (fiscalError) { show(fiscalError); return; }

    const phoneDigits = value('#companyPhone').replace(/\D+/g, '');
    if (!/^\d{6,15}$/.test(phoneDigits)) { show('El número de WhatsApp debe contener solo números, entre 6 y 15 dígitos.'); return; }

    const accessEmailError = validateEmailField('#accessEmail', 'El correo de inicio de sesión');
    if (accessEmailError) { show(accessEmailError); return; }

    const button = event.submitter;
    const originalText = button?.textContent || t('register.submit', 'Enviar registro');
    if (button) { button.disabled = true; button.textContent = t('register.sending', 'Enviando registro...'); }

    const phone = normalizePhone();
    const agency = {
      id: `AG-${Date.now()}`,
      status: 'Aprobado',
      registrationType,
      password,
      accessEmail: value('#accessEmail').toLowerCase(),
      company: {
        country: value('#companyCountry'),
        taxLabel: isCompany ? ($('#taxLabel')?.textContent || '') : '',
        taxId: isCompany ? value('#companyTaxId') : '',
        legalName: isCompany ? value('#companyName') : `${value('#legalFirstName')} ${value('#legalLastName')}`.trim(),
        tradeName: isCompany ? value('#tradeName') : '',
        email: value('#accessEmail').toLowerCase(),
        phone,
        phoneCountry: value('#companyPhoneCountry'),
        phoneNumber: value('#companyPhone'),
        website: value('#companyWebsite')
      },
      legalRepresentative: {
        firstName: value('#legalFirstName'),
        lastName: value('#legalLastName'),
        docType: isCompany ? '' : value('#legalDocType'),
        docNumber: isCompany ? '' : value('#legalDocNumber'),
        nationality: value('#companyCountry')
      }
    };

    try {
      const result = await sendToSheet('registerAgency', agency);
      if (!result.ok) { show(result.message || 'No se pudo registrar la agencia.'); return; }
      show(result.message || 'Registro recibido correctamente. Revisa tu correo para verificar el email. Luego podrás ingresar al portal.', 'is-success');
      form.reset();
      syncRegistrationType();
      updatePasswordChecklist();
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
  syncRegistrationType();
})();
