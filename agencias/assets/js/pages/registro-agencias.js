(() => {
  const CONFIG = {
    googleScriptUrl: 'https://script.google.com/macros/s/AKfycbycmduYce7cpGoMSqR3iqubsC46DiIox7qaNJXFFW8abQpr0s1SYCnYfyA2w95_vGYQ/exec?authuser=0'
  };

  const COUNTRIES = [
    ['PE','Perú','+51'], ['MX','México','+52'], ['CL','Chile','+56'], ['CO','Colombia','+57'], ['BR','Brasil','+55'], ['AR','Argentina','+54'], ['BO','Bolivia','+591'], ['EC','Ecuador','+593'], ['UY','Uruguay','+598'], ['PY','Paraguay','+595'], ['VE','Venezuela','+58'], ['US','Estados Unidos','+1'], ['CA','Canadá','+1'], ['ES','España','+34'],
    ['AF','Afganistán','+93'], ['AL','Albania','+355'], ['DE','Alemania','+49'], ['AD','Andorra','+376'], ['AO','Angola','+244'], ['AG','Antigua y Barbuda','+1'], ['SA','Arabia Saudita','+966'], ['DZ','Argelia','+213'], ['AM','Armenia','+374'], ['AU','Australia','+61'], ['AT','Austria','+43'], ['AZ','Azerbaiyán','+994'], ['BS','Bahamas','+1'], ['BD','Bangladés','+880'], ['BB','Barbados','+1'], ['BH','Baréin','+973'], ['BE','Bélgica','+32'], ['BZ','Belice','+501'], ['BJ','Benín','+229'], ['BY','Bielorrusia','+375'], ['MM','Birmania / Myanmar','+95'], ['BA','Bosnia y Herzegovina','+387'], ['BW','Botsuana','+267'], ['BN','Brunéi','+673'], ['BG','Bulgaria','+359'], ['BF','Burkina Faso','+226'], ['BI','Burundi','+257'], ['BT','Bután','+975'], ['CV','Cabo Verde','+238'], ['KH','Camboya','+855'], ['CM','Camerún','+237'], ['QA','Catar','+974'], ['TD','Chad','+235'], ['CN','China','+86'], ['CY','Chipre','+357'], ['VA','Ciudad del Vaticano','+379'], ['KM','Comoras','+269'], ['CG','Congo','+242'], ['CD','Congo, República Democrática','+243'], ['KP','Corea del Norte','+850'], ['KR','Corea del Sur','+82'], ['CI','Costa de Marfil','+225'], ['CR','Costa Rica','+506'], ['HR','Croacia','+385'], ['CU','Cuba','+53'], ['DK','Dinamarca','+45'], ['DM','Dominica','+1'], ['DO','República Dominicana','+1'], ['EG','Egipto','+20'], ['SV','El Salvador','+503'], ['AE','Emiratos Árabes Unidos','+971'], ['ER','Eritrea','+291'], ['SK','Eslovaquia','+421'], ['SI','Eslovenia','+386'], ['EE','Estonia','+372'], ['SZ','Esuatini','+268'], ['ET','Etiopía','+251'], ['PH','Filipinas','+63'], ['FI','Finlandia','+358'], ['FJ','Fiyi','+679'], ['FR','Francia','+33'], ['GA','Gabón','+241'], ['GM','Gambia','+220'], ['GE','Georgia','+995'], ['GH','Ghana','+233'], ['GD','Granada','+1'], ['GR','Grecia','+30'], ['GT','Guatemala','+502'], ['GN','Guinea','+224'], ['GQ','Guinea Ecuatorial','+240'], ['GW','Guinea-Bisáu','+245'], ['GY','Guyana','+592'], ['HT','Haití','+509'], ['HN','Honduras','+504'], ['HU','Hungría','+36'], ['IN','India','+91'], ['ID','Indonesia','+62'], ['IQ','Irak','+964'], ['IR','Irán','+98'], ['IE','Irlanda','+353'], ['IS','Islandia','+354'], ['IL','Israel','+972'], ['IT','Italia','+39'], ['JM','Jamaica','+1'], ['JP','Japón','+81'], ['JO','Jordania','+962'], ['KZ','Kazajistán','+7'], ['KE','Kenia','+254'], ['KG','Kirguistán','+996'], ['KI','Kiribati','+686'], ['KW','Kuwait','+965'], ['LA','Laos','+856'], ['LS','Lesoto','+266'], ['LV','Letonia','+371'], ['LB','Líbano','+961'], ['LR','Liberia','+231'], ['LY','Libia','+218'], ['LI','Liechtenstein','+423'], ['LT','Lituania','+370'], ['LU','Luxemburgo','+352'], ['MG','Madagascar','+261'], ['MY','Malasia','+60'], ['MW','Malaui','+265'], ['MV','Maldivas','+960'], ['ML','Malí','+223'], ['MT','Malta','+356'], ['MA','Marruecos','+212'], ['MU','Mauricio','+230'], ['MR','Mauritania','+222'], ['FM','Micronesia','+691'], ['MD','Moldavia','+373'], ['MC','Mónaco','+377'], ['MN','Mongolia','+976'], ['ME','Montenegro','+382'], ['MZ','Mozambique','+258'], ['NA','Namibia','+264'], ['NR','Nauru','+674'], ['NP','Nepal','+977'], ['NI','Nicaragua','+505'], ['NE','Níger','+227'], ['NG','Nigeria','+234'], ['NO','Noruega','+47'], ['NZ','Nueva Zelanda','+64'], ['OM','Omán','+968'], ['NL','Países Bajos','+31'], ['PK','Pakistán','+92'], ['PW','Palaos','+680'], ['PA','Panamá','+507'], ['PG','Papúa Nueva Guinea','+675'], ['PL','Polonia','+48'], ['PT','Portugal','+351'], ['GB','Reino Unido','+44'], ['CF','República Centroafricana','+236'], ['CZ','República Checa','+420'], ['RW','Ruanda','+250'], ['RO','Rumanía','+40'], ['RU','Rusia','+7'], ['WS','Samoa','+685'], ['KN','San Cristóbal y Nieves','+1'], ['SM','San Marino','+378'], ['VC','San Vicente y las Granadinas','+1'], ['LC','Santa Lucía','+1'], ['ST','Santo Tomé y Príncipe','+239'], ['SN','Senegal','+221'], ['RS','Serbia','+381'], ['SC','Seychelles','+248'], ['SL','Sierra Leona','+232'], ['SG','Singapur','+65'], ['SY','Siria','+963'], ['SO','Somalia','+252'], ['LK','Sri Lanka','+94'], ['ZA','Sudáfrica','+27'], ['SD','Sudán','+249'], ['SS','Sudán del Sur','+211'], ['SE','Suecia','+46'], ['CH','Suiza','+41'], ['SR','Surinam','+597'], ['TH','Tailandia','+66'], ['TZ','Tanzania','+255'], ['TJ','Tayikistán','+992'], ['TL','Timor Oriental','+670'], ['TG','Togo','+228'], ['TO','Tonga','+676'], ['TT','Trinidad y Tobago','+1'], ['TN','Túnez','+216'], ['TM','Turkmenistán','+993'], ['TR','Turquía','+90'], ['TV','Tuvalu','+688'], ['UA','Ucrania','+380'], ['UG','Uganda','+256'], ['UZ','Uzbekistán','+998'], ['VU','Vanuatu','+678'], ['VN','Vietnam','+84'], ['YE','Yemen','+967'], ['DJ','Yibuti','+253'], ['ZM','Zambia','+260'], ['ZW','Zimbabue','+263']
  ];

  const TAX_LABELS = {
    PE: 'RUC', MX: 'RFC', CL: 'RUT', BR: 'CNPJ', CO: 'NIT', AR: 'CUIT', BO: 'NIT', EC: 'RUC', UY: 'RUT', PY: 'RUC', VE: 'RIF', US: 'EIN / Tax ID', CA: 'Business Number', ES: 'NIF / CIF'
  };

  const LEGAL_NAME_LABELS = {
    PE: 'Razón social', MX: 'Razón social', CL: 'Razón social', CO: 'Razón social', AR: 'Razón social', BO: 'Razón social', EC: 'Razón social', UY: 'Razón social', PY: 'Razón social', VE: 'Razón social', BR: 'Razão social', US: 'Legal business name', CA: 'Legal business name', GB: 'Legal business name', ES: 'Razón social'
  };

  const $ = (selector) => document.querySelector(selector);
  const value = (selector) => $(selector)?.value.trim() || '';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TAX_RE = /^[A-Za-z0-9.\-\s]{4,24}$/;
  const I18N = window.MCTAgenciesI18n || null;
  const t = (key, fallback = key) => I18N?.t ? I18N.t(key) : fallback;

  function fillCountrySelect(select, selected = 'PE') {
    if (!select) return;
    select.innerHTML = COUNTRIES.map(([code, label]) => `<option value="${code}">${label}</option>`).join('');
    select.value = selected;
  }

  function fillPhoneSelect(select, selected = '+51') {
    if (!select) return;
    const seen = new Set();
    select.innerHTML = COUNTRIES.filter(([, , phone]) => {
      const key = `${phone}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(([code, label, phone]) => `<option value="${phone}">${label} ${phone}</option>`).join('');
    select.value = selected;
  }

  function countryPhone(code) {
    return (COUNTRIES.find(([c]) => c === code) || [null, null, '+51'])[2];
  }

  function onlyDigits(input) { if (input) input.value = input.value.replace(/\D+/g, ''); }
  function validateEmail(email, label) { return EMAIL_RE.test(email) ? '' : `${label} debe ser un correo válido, por ejemplo nombre@dominio.com.`; }
  function currentRegistrationType() { return document.querySelector('input[name="registrationType"]:checked')?.value || 'natural'; }

  function show(message, type = 'is-error') {
    const el = $('#registerMessage');
    if (!el) return;
    el.textContent = message;
    el.className = `form-message ${type}`;
    el.hidden = false;
  }

  function setLoading(isLoading) {
    const loader = $('#agencyFormLoader');
    const submit = $('#agencyRegisterForm button[type="submit"]');
    if (loader) loader.hidden = !isLoading;
    if (submit) submit.disabled = isLoading;
  }

  function syncRegistrationType() {
    const type = currentRegistrationType();
    const isCompany = type === 'company';
    $('#companyBlock').hidden = !isCompany;
    $('#representativeTitle').textContent = isCompany ? 'Datos del representante de la empresa' : 'Datos de la persona natural';
    document.querySelectorAll('[data-registration-card]').forEach((card) => {
      card.classList.toggle('is-active', card.dataset.registrationCard === type);
    });
    ['#companyCountry','#companyTaxId','#companyName','#tradeName'].forEach((selector) => {
      const el = $(selector);
      if (!el) return;
      el.required = isCompany;
      el.disabled = !isCompany;
      const wrapper = el.closest('.field');
      if (wrapper) wrapper.classList.toggle('is-disabled-by-type', !isCompany);
    });
    syncCountry();
  }

  function syncCountry() {
    const country = $('#companyCountry')?.value || $('#legalNationality')?.value || 'PE';
    const taxLabel = $('#taxLabel');
    const legalNameLabel = $('#legalNameLabel');
    if (taxLabel) taxLabel.textContent = TAX_LABELS[country] || 'Identificación fiscal';
    if (legalNameLabel) legalNameLabel.textContent = LEGAL_NAME_LABELS[country] || 'Nombre fiscal / legal';
    const phoneCountry = $('#companyPhoneCountry');
    if (phoneCountry) phoneCountry.value = countryPhone(country);
  }

  function normalizePhone() {
    const countryCode = value('#companyPhoneCountry').replace(/\D+/g, '').trim();
    const phone = value('#companyPhone').replace(/\D+/g, '').trim();
    return `${countryCode}${phone}`.trim();
  }

  function validatePassword(password) {
    if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password)) return 'La contraseña debe incluir al menos una letra.';
    if (!/\d/.test(password)) return 'La contraseña debe incluir al menos un número.';
    if (!/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password)) return 'La contraseña debe incluir al menos un carácter especial, por ejemplo @, #, $, %, &, * o !.';
    return '';
  }

  async function sendToSheet(action, payload) {
    if (!CONFIG.googleScriptUrl || CONFIG.googleScriptUrl.includes('PEGA_AQUI')) throw new Error('Falta configurar la URL de Google Apps Script.');
    const response = await fetch(CONFIG.googleScriptUrl, { method: 'POST', body: JSON.stringify({ action, payload }) });
    const text = await response.text();
    try { return JSON.parse(text); } catch { throw new Error('Google Apps Script no devolvió una respuesta JSON válida.'); }
  }

  function passwordRules(password, confirm) {
    return { length: password.length >= 8, letter: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password), number: /\d/.test(password), special: /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password), match: Boolean(password) && password === confirm };
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
    document.querySelectorAll('[data-toggle-password]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        const shouldShow = input.type === 'password';
        input.type = shouldShow ? 'text' : 'password';
        button.textContent = shouldShow ? t('login.hide', 'Ocultar') : t('login.show', 'Ver');
      });
    });
    $('#registerPassword')?.addEventListener('input', updatePasswordChecklist);
    $('#registerPasswordConfirm')?.addEventListener('input', updatePasswordChecklist);
  }

  function init() {
    fillCountrySelect($('#companyCountry'), 'PE');
    fillCountrySelect($('#legalNationality'), 'PE');
    fillPhoneSelect($('#companyPhoneCountry'), '+51');
    document.querySelectorAll('input[name="registrationType"]').forEach((input) => input.addEventListener('change', syncRegistrationType));
    $('#companyCountry')?.addEventListener('change', syncCountry);
    $('#legalNationality')?.addEventListener('change', () => { if (currentRegistrationType() === 'natural') syncCountry(); });
    $('#companyPhone')?.addEventListener('input', (event) => onlyDigits(event.target));
    $('#companyTaxId')?.addEventListener('input', (event) => { event.target.value = event.target.value.replace(/[^A-Za-z0-9.\-\s]/g, '').toUpperCase(); });
    $('#legalDocNumber')?.addEventListener('input', (event) => { event.target.value = event.target.value.replace(/[^A-Za-z0-9.\-\s]/g, '').toUpperCase(); });

    $('#agencyRegisterForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = $('#agencyRegisterForm');
      if (!form.reportValidity()) return;

      const type = currentRegistrationType();
      const isCompany = type === 'company';
      const password = $('#registerPassword').value;
      const confirm = $('#registerPasswordConfirm').value;
      const passwordError = validatePassword(password);
      if (passwordError) { show(passwordError); return; }
      if (password !== confirm) { show('Las contraseñas no coinciden.'); return; }

      if (isCompany && !TAX_RE.test(value('#companyTaxId'))) { show('El número de identificación fiscal debe contener solo letras, números, punto o guion.'); return; }
      const phoneDigits = value('#companyPhone').replace(/\D+/g, '');
      if (!/^\d{6,15}$/.test(phoneDigits)) { show('El número de WhatsApp debe contener solo números, entre 6 y 15 dígitos.'); return; }
      const accessEmailError = validateEmail(value('#accessEmail').toLowerCase(), 'El correo de inicio de sesión');
      if (accessEmailError) { show(accessEmailError); return; }

      const agency = {
        id: `AG-${Date.now()}`,
        providerType: 'agency',
        registrationType: type,
        status: 'Aprobado',
        password,
        accessEmail: value('#accessEmail').toLowerCase(),
        company: {
          country: isCompany ? value('#companyCountry') : value('#legalNationality'),
          taxLabel: isCompany ? ($('#taxLabel')?.textContent || '') : '',
          taxId: isCompany ? value('#companyTaxId') : '',
          legalName: isCompany ? value('#companyName') : '',
          tradeName: isCompany ? value('#tradeName') : '',
          phone: normalizePhone(),
          phoneCountry: value('#companyPhoneCountry'),
          phoneNumber: value('#companyPhone'),
          website: value('#companyWebsite')
        },
        legalRepresentative: {
          firstName: value('#legalFirstName'),
          lastName: value('#legalLastName'),
          nationality: value('#legalNationality'),
          docType: value('#legalDocType'),
          docNumber: value('#legalDocNumber')
        }
      };

      const button = event.submitter;
      const originalText = button?.textContent || t('register.submit', 'Registrar mi agencia');
      if (button) button.textContent = t('register.sending', 'Enviando registro...');
      setLoading(true);
      try {
        const result = await sendToSheet('registerAgency', agency);
        if (!result.ok) { show(result.message || 'No se pudo registrar la agencia.'); return; }
        $('#registerMessage').hidden = true;
        form.querySelectorAll('.form-block, .dialog-actions').forEach((el) => { el.hidden = true; });
        $('#registerSuccessPanel').hidden = false;
        setTimeout(() => { window.location.href = './login.html'; }, 8000);
      } catch (error) {
        console.error(error);
        show(error.message || 'No se pudo conectar con Google Apps Script. Revisa la URL y la implementación.');
      } finally {
        setLoading(false);
        if (button) button.textContent = originalText;
      }
    });

    bindPasswordToggles();
    updatePasswordChecklist();
    syncRegistrationType();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
