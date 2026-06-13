(() => {
  const API = window.MCT_HOTEL_MARKETPLACE_APPS_SCRIPT_URL || '';
  const COUNTRIES = ['Perú','Argentina','Bolivia','Brasil','Canadá','Chile','Colombia','Costa Rica','Cuba','Ecuador','El Salvador','España','Estados Unidos','Francia','Alemania','Italia','México','Países Bajos','Panamá','Paraguay','Reino Unido','Uruguay','Venezuela','Afganistán','Albania','Andorra','Angola','Antigua y Barbuda','Arabia Saudita','Argelia','Armenia','Australia','Austria','Azerbaiyán','Bahamas','Bangladés','Barbados','Bélgica','Belice','Benín','Bielorrusia','Bosnia y Herzegovina','Botsuana','Brunéi','Bulgaria','Burkina Faso','Burundi','Bután','Cabo Verde','Camboya','Camerún','Catar','Chad','China','Chipre','Ciudad del Vaticano','Comoras','Congo','Corea del Norte','Corea del Sur','Costa de Marfil','Croacia','Dinamarca','Dominica','Egipto','Emiratos Árabes Unidos','Eslovaquia','Eslovenia','Estonia','Etiopía','Filipinas','Finlandia','Fiyi','Gabón','Gambia','Georgia','Ghana','Granada','Grecia','Guatemala','Guinea','Guinea-Bisáu','Guinea Ecuatorial','Guyana','Haití','Honduras','Hungría','India','Indonesia','Irak','Irán','Irlanda','Islandia','Israel','Jamaica','Japón','Jordania','Kazajistán','Kenia','Kirguistán','Kiribati','Kuwait','Laos','Lesoto','Letonia','Líbano','Liberia','Libia','Liechtenstein','Lituania','Luxemburgo','Macedonia del Norte','Madagascar','Malasia','Malaui','Maldivas','Malí','Malta','Marruecos','Mauricio','Mauritania','Micronesia','Moldavia','Mónaco','Mongolia','Montenegro','Mozambique','Myanmar','Namibia','Nauru','Nepal','Nicaragua','Níger','Nigeria','Noruega','Nueva Zelanda','Omán','Pakistán','Palaos','Palestina','Papúa Nueva Guinea','Polonia','Portugal','República Centroafricana','República Checa','República Democrática del Congo','República Dominicana','Ruanda','Rumanía','Rusia','Samoa','San Cristóbal y Nieves','San Marino','San Vicente y las Granadinas','Santa Lucía','Santo Tomé y Príncipe','Senegal','Serbia','Seychelles','Sierra Leona','Singapur','Siria','Somalia','Sri Lanka','Sudáfrica','Sudán','Sudán del Sur','Suecia','Suiza','Surinam','Tailandia','Tanzania','Tayikistán','Timor Oriental','Togo','Tonga','Trinidad y Tobago','Túnez','Turkmenistán','Turquía','Tuvalu','Ucrania','Uganda','Uzbekistán','Vanuatu','Vietnam','Yemen','Yibuti','Zambia','Zimbabue'];
  const PHONE_CODES = [['+51','PE'], ['+1','US/CA'], ['+54','AR'], ['+591','BO'], ['+55','BR'], ['+56','CL'], ['+57','CO'], ['+506','CR'], ['+593','EC'], ['+503','SV'], ['+34','ES'], ['+52','MX'], ['+507','PA'], ['+595','PY'], ['+44','UK'], ['+598','UY'], ['+58','VE'], ['+33','FR'], ['+49','DE'], ['+39','IT'], ['+31','NL']];
  const DESTINATIONS = ['Cusco','Aguas Calientes','Machu Picchu','Valle Sagrado','Ollantaytambo','Urubamba','Pisac','Lima','Paracas / Ica','Arequipa','Puno','Uyuni'];
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const escapeHtml = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const serialize = (form) => Object.fromEntries(new FormData(form).entries());
  const lettersOnlyRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'´-]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitizeLetters = (value = '') => String(value).replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'´-]/g, '').replace(/\s{2,}/g, ' ');
  const sanitizeDigits = (value = '') => String(value).replace(/\D/g, '');
  const sanitizeDoc = (value = '', type = '') => type === 'DNI' ? sanitizeDigits(value).slice(0, 8) : String(value).replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\-_.]/g, '').slice(0, 24);
  const passwordChecks = (value = '', confirm = '') => ({
    length: String(value).length >= 8,
    upper: /[A-ZÁÉÍÓÚÜÑ]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/.test(value),
    match: !!value && value === confirm
  });

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

  function fillSelects() {
    const countryHtml = COUNTRIES.map(c => `<option value="${escapeHtml(c)}" ${c === 'Perú' ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
    const phoneHtml = PHONE_CODES.map(([c,l]) => `<option value="${escapeHtml(c)}" ${c === '+51' ? 'selected' : ''}>${escapeHtml(c)} · ${escapeHtml(l)}</option>`).join('');
    const destinationHtml = DESTINATIONS.map((d, i) => `<option value="${escapeHtml(d)}" ${i === 0 ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
    $$('[data-country-select]').forEach(el => { if (!el.dataset.ready) { el.innerHTML = countryHtml; el.dataset.ready = '1'; } });
    $$('[data-phone-code-select]').forEach(el => { if (!el.dataset.ready) { el.innerHTML = phoneHtml; el.dataset.ready = '1'; } });
    $$('[data-destination-select]').forEach(el => { if (!el.dataset.ready) { el.innerHTML = destinationHtml; el.dataset.ready = '1'; } });
  }

  function updatePasswordRules() {
    const pass = $('#hotelOwnerPassword');
    const confirm = $('#hotelOwnerConfirmPassword');
    const rules = $('[data-password-rules]');
    if (!pass || !confirm || !rules) return;
    const checks = passwordChecks(pass.value, confirm.value);
    Object.entries(checks).forEach(([key, ok]) => {
      const row = rules.querySelector(`[data-rule="${key}"]`);
      if (!row) return;
      row.classList.toggle('is-ok', ok);
      const icon = row.querySelector('i');
      if (icon) icon.className = ok ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
    });
  }

  function isStrongPassword(value) {
    const checks = passwordChecks(value, value);
    return checks.length && checks.upper && checks.number && checks.special;
  }

  function togglePassword(button) {
    const id = button?.dataset?.togglePassword;
    const input = id ? document.getElementById(id) : null;
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    const icon = button.querySelector('i');
    if (icon) icon.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  }

  function updateRegistrationType() {
    const type = $('#hotelRegistrationType')?.value || 'natural';
    const isCompany = type === 'company';
    $$('[data-company-field]').forEach(el => { el.hidden = !isCompany; $$('input,select,textarea', el).forEach(field => field.required = isCompany); });
    $$('[data-natural-field]').forEach(el => { el.hidden = isCompany; $$('input,select,textarea', el).forEach(field => field.required = !isCompany); });
  }

  function sanitizeInput(target) {
    if (!target) return;
    if (target.matches('#hotelOwnerPassword, #hotelOwnerConfirmPassword')) updatePasswordRules();
    if (target.matches('[data-letters-only]')) target.value = sanitizeLetters(target.value);
    if (target.matches('[data-phone-only]')) target.value = sanitizeDigits(target.value).slice(0, 15);
    if (target.matches('[data-ruc-only]')) target.value = sanitizeDigits(target.value).slice(0, 11);
    if (target.matches('[data-document-input]')) target.value = sanitizeDoc(target.value, $('#hotelOwnerDocType')?.value || '');
    if (target.matches('#hotelOwnerDocType')) {
      const docInput = $('#hotelOwnerDocNumber');
      if (docInput) {
        docInput.value = sanitizeDoc(docInput.value, target.value);
        docInput.inputMode = target.value === 'DNI' ? 'numeric' : 'text';
        docInput.maxLength = target.value === 'DNI' ? 8 : 24;
      }
    }
  }

  function validateForm(form) {
    let ok = true;
    $$('[required]', form).forEach(field => {
      const value = String(field.value || '').trim();
      const label = field.closest('label');
      label?.classList.remove('has-error');
      if (!value) { ok = false; label?.classList.add('has-error'); }
      if (field.type === 'email' && value && !emailRegex.test(value)) { ok = false; label?.classList.add('has-error'); }
      if (field.matches('[data-letters-only]') && value && !lettersOnlyRegex.test(value)) { ok = false; label?.classList.add('has-error'); }
      if (field.matches('[data-ruc-only]') && value && !/^\d{11}$/.test(value)) { ok = false; label?.classList.add('has-error'); }
      if (field.matches('[data-phone-only]') && value && !/^\d{6,15}$/.test(value)) { ok = false; label?.classList.add('has-error'); }
      if (field.matches('[data-document-input]')) {
        const docType = $('#hotelOwnerDocType')?.value || '';
        if (docType === 'DNI' && !/^\d{8}$/.test(value)) { ok = false; label?.classList.add('has-error'); }
      }
    });
    $$('[data-min-files]', form).forEach(field => {
      const label = field.closest('label');
      const min = Number(field.dataset.minFiles || 0);
      label?.classList.remove('has-error');
      if (min && field.files && field.files.length && field.files.length < min) { ok = false; label?.classList.add('has-error'); }
    });
    if (form.id === 'hotelOwnerRegisterForm') {
      const pass = form.elements.password?.value || '';
      const confirm = form.elements.confirmPassword?.value || '';
      if (!isStrongPassword(pass) || pass !== confirm) {
        ok = false;
        form.elements.password?.closest('label')?.classList.add('has-error');
        form.elements.confirmPassword?.closest('label')?.classList.add('has-error');
        updatePasswordRules();
      }
    }
    return ok;
  }

  function openModal(id) { const el = document.getElementById(id); if (el) { el.hidden = false; document.body.style.overflow = 'hidden'; } }
  function closeModal() { $$('.hotel-market-modal').forEach(el => el.hidden = true); document.body.style.overflow = ''; }
  function switchPanelTab(tab) {
    $$('[data-hotel-panel-tab]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.hotelPanelTab === tab));
    $$('[data-hotel-panel-section]').forEach(sec => sec.classList.toggle('is-active', sec.dataset.hotelPanelSection === tab));
  }

  function init() {
    fillSelects();
    updateRegistrationType();
    $('#hotelRegistrationType')?.addEventListener('change', updateRegistrationType);
    $('#hotelOwnerPassword')?.addEventListener('input', updatePasswordRules);
    $('#hotelOwnerConfirmPassword')?.addEventListener('input', updatePasswordRules);
    updatePasswordRules();
    document.addEventListener('input', e => sanitizeInput(e.target));
    document.addEventListener('change', e => sanitizeInput(e.target));
    document.addEventListener('click', e => {
      const tab = e.target.closest('[data-hotel-panel-tab]');
      if (tab) switchPanelTab(tab.dataset.hotelPanelTab);
      const opener = e.target.closest('[data-open-market-modal]');
      if (opener) openModal(opener.dataset.openMarketModal);
      const passwordToggle = e.target.closest('[data-toggle-password]');
      if (passwordToggle) togglePassword(passwordToggle);
      if (e.target.closest('[data-close-market-modal]')) closeModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  document.addEventListener('submit', async (event) => {
    const register = event.target.closest('#hotelOwnerRegisterForm');
    const login = event.target.closest('#hotelOwnerLoginForm');
    const marketForm = event.target.closest('[data-marketplace-form]');
    if (register) {
      event.preventDefault();
      if (!validateForm(register)) { showMsg('#hotelOwnerRegisterMsg', 'Revisa los campos marcados antes de enviar el registro.', false); return; }
      const payload = serialize(register);
      const result = await post('register_owner', payload);
      showMsg('#hotelOwnerRegisterMsg', result.localOnly ? result.message : 'Registro enviado correctamente. Tu cuenta quedará pendiente de aprobación.');
    }
    if (login) {
      event.preventDefault();
      if (!validateForm(login)) { showMsg('#hotelOwnerLoginMsg', 'Ingresa un correo válido y tu contraseña.', false); return; }
      const payload = serialize(login);
      localStorage.setItem('mctHotelOwnerEmail', payload.email || '');
      showMsg('#hotelOwnerLoginMsg', 'Acceso demo correcto. Redirigiendo al panel...');
      setTimeout(() => { window.location.href = './panel-admin-hotel.html'; }, 500);
    }
    if (marketForm) {
      event.preventDefault();
      if (!validateForm(marketForm)) { showMsg('#hotelPanelMsg', 'Revisa los campos obligatorios antes de guardar.', false); return; }
      const type = marketForm.dataset.marketplaceForm;
      const payload = serialize(marketForm);
      let action = type === 'property' ? 'create_property' : type === 'room' ? 'create_room' : type === 'availability' ? 'block_dates' : type === 'account' ? 'update_owner' : 'update_confirmation_mode';
      if (type === 'availability') payload.dates = dateRange(payload.from, payload.to);
      if (type === 'property') {
        const galleryCount = String(payload.galleryUrls || '').split('\n').map(v => v.trim()).filter(Boolean).length;
        const fileCount = marketForm.elements.photoFiles?.files?.length || 0;
        if ((galleryCount + fileCount) < 5) {
          showMsg('#hotelPanelMsg', 'Agrega mínimo 5 fotos del alojamiento o 5 URLs de galería antes de guardar.', false);
          return;
        }
        const urls = String(payload.galleryUrls || '').split('\n').map(v => v.trim()).filter(Boolean);
        payload.galleryJson = JSON.stringify(urls);
        payload.photoCount = fileCount;
      }
      if (type === 'room') {
        const urls = String(payload.roomGalleryUrls || '').split('\n').map(v => v.trim()).filter(Boolean);
        payload.roomGalleryJson = JSON.stringify(urls);
        payload.roomPhotoCount = marketForm.elements.roomPhotoFiles?.files?.length || 0;
      }
      const result = await post(action, payload);
      showMsg('#hotelPanelMsg', result.localOnly ? result.message : 'Cambios guardados correctamente.');
      closeModal();
    }
  });

  window.MCTHotelMarketplace = { init };
  document.addEventListener('DOMContentLoaded', init);
})();
