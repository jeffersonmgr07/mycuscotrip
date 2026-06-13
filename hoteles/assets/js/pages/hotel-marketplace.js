(() => {
  function getApiUrl() {
    return String(
      window.MCT_HOTEL_MARKETPLACE_APPS_SCRIPT_URL ||
      window.MCT_HOTEL_MARKETPLACE_CONFIG?.appsScriptUrl ||
      localStorage.getItem('mctHotelMarketplaceAppsScriptUrl') ||
      ''
    ).trim();
  }
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
    const API = getApiUrl();
    if (!API) return { ok: false, configMissing: true, error: 'Falta configurar la URL del Apps Script en hoteles/assets/js/config.js.' };
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...payload }) });
      return await res.json();
    } catch (error) {
      console.error('Hotel marketplace API error', error);
      return { ok: false, error: 'No se pudo conectar con Google Sheet. Revisa la URL del Apps Script.' };
    }
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

  function togglePassword(button, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const id = button?.dataset?.togglePassword;
    const input = id ? document.getElementById(id) : null;
    if (!input) return false;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-pressed', show ? 'true' : 'false');
    const icon = button.querySelector('i');
    if (icon) icon.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    input.focus({ preventScroll: true });
    return false;
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
    if (target.matches('[data-document-input]')) { const form = target.closest('form'); const docType = form?.querySelector('[name="docType"]')?.value || $('#hotelOwnerDocType')?.value || ''; target.value = sanitizeDoc(target.value, docType); }
    if (target.matches('#hotelOwnerDocType, select[name="docType"]')) {
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
        const docType = field.closest('form')?.querySelector('[name="docType"]')?.value || $('#hotelOwnerDocType')?.value || '';
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
    if (form.dataset.marketplaceForm === 'password') {
      const pass = form.elements.newPassword?.value || '';
      const confirm = form.elements.confirmPassword?.value || '';
      if (!isStrongPassword(pass) || pass !== confirm) {
        ok = false;
        form.elements.newPassword?.closest('label')?.classList.add('has-error');
        form.elements.confirmPassword?.closest('label')?.classList.add('has-error');
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


  function useCurrentLocation(button) {
    if (!navigator.geolocation) {
      alert('Tu navegador no permite obtener ubicación automáticamente. Puedes abrir Google Maps y pegar el enlace.');
      return;
    }
    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Obteniendo...';
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      const form = button.closest('form');
      const input = form?.querySelector('[name="mapUrl"]');
      if (input) input.value = `https://www.google.com/maps?q=${lat},${lng}`;
      button.disabled = false;
      button.innerHTML = original;
    }, () => {
      button.disabled = false;
      button.innerHTML = original;
      alert('No se pudo obtener tu ubicación. Revisa permisos del navegador o pega el enlace de Google Maps manualmente.');
    }, { enableHighAccuracy: true, timeout: 10000 });
  }


  const SESSION_KEY = 'mctHotelOwnerSession';

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
  }
  function setSession(data) {
    if (!data) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    if (data.email) localStorage.setItem('mctHotelOwnerEmail', data.email);
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('mctHotelOwnerEmail');
  }
  function statusIsAllowed(status = '') {
    const value = String(status).toLowerCase();
    return ['approved','aprobado','active','activo','verified','verificado','provider','proveedor','hotel_provider'].includes(value);
  }
  function setAccountValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '—';
  }
  function ownerDisplayType(owner) {
    return owner?.registrationType === 'company' ? 'Empresa' : 'Persona natural';
  }
  function updateAccountView(owner) {
    if (!document.body.classList.contains('hotel-panel-admin-body') && !document.querySelector('[data-hotel-panel-section="account"]')) return;
    const current = owner || getSession() || {};
    setAccountValue('accountType', ownerDisplayType(current));
    setAccountValue('accountFirstName', current.firstName || current.nombres || '—');
    setAccountValue('accountLastName', current.lastName || current.apellidos || '—');
    const doc = current.registrationType === 'company'
      ? 'Empresa'
      : [current.docType || current.tipoDocumento, current.docNumber || current.numeroDocumento].filter(Boolean).join(' · ');
    setAccountValue('accountDocument', doc || '—');
    setAccountValue('accountNationality', current.nationality || current.nacionalidad || (current.registrationType === 'company' ? '—' : 'Perú'));
    setAccountValue('accountPhone', [current.phoneCode || '+51', current.phone || current.whatsapp].filter(Boolean).join(' '));
    setAccountValue('accountEmail', current.email || localStorage.getItem('mctHotelOwnerEmail') || '—');
    setAccountValue('accountWebsite', current.website || current.web || '—');
    setAccountValue('accountBusiness', current.businessName || current.razonSocial || (current.registrationType === 'company' ? 'Pendiente de completar' : 'No aplica'));
    setAccountValue('accountTaxId', current.taxId || current.ruc || (current.registrationType === 'company' ? '—' : 'No aplica'));
    document.querySelectorAll('[data-company-account]').forEach(el => {
      el.hidden = current.registrationType !== 'company' && !current.businessName && !current.taxId;
    });
    document.querySelectorAll('[data-owner-email]').forEach(el => { el.value = current.email || ''; });
    document.querySelectorAll('[data-owner-user-id]').forEach(el => { el.value = current.userId || ''; });
  }

  function renderProperties(properties = []) {
    const list = document.getElementById('hotelOwnerPropertiesList');
    const empty = document.getElementById('hotelOwnerPropertiesEmpty');
    if (!list) return;
    list.innerHTML = '';
    if (!properties.length) {
      if (empty) empty.hidden = false;
      renderPropertyOptions([]);
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = properties.map(item => `
      <article class="hotel-owner-property-card">
        <div>
          <span>${escapeHtml(item.destination || 'Destino pendiente')}</span>
          <strong>${escapeHtml(item.name || 'Alojamiento sin nombre')}</strong>
          <small>${escapeHtml(item.type || 'hotel')} · ${escapeHtml(item.confirmationMode === 'manual' ? 'Confirmación manual' : 'Confirmación instantánea')}</small>
        </div>
        <em>${escapeHtml(item.status || 'draft')}</em>
      </article>
    `).join('');
    renderPropertyOptions(properties);
  }

  function renderPropertyOptions(properties = []) {
    const fallback = '<option value="">Selecciona alojamiento</option>';
    const options = properties.length
      ? properties.map(item => `<option value="${escapeHtml(item.propertyId || item.id || item.name)}">${escapeHtml(item.name || item.propertyId || 'Alojamiento')}</option>`).join('')
      : fallback;
    document.querySelectorAll('[data-property-select]').forEach(select => {
      const current = select.value;
      select.innerHTML = options;
      if (current && Array.from(select.options).some(o => o.value === current)) select.value = current;
    });
  }

  async function loadPanelData() {
    const panel = document.querySelector('.hotel-admin-dashboard');
    if (!panel) return;
    const session = getSession();
    const API = getApiUrl();
    if (!session && getApiUrl()) {
      window.location.href = './login-admin-hotel.html';
      return;
    }
    updateAccountView(session || { registrationType: 'natural', email: localStorage.getItem('mctHotelOwnerEmail') || '' });
    if (!API || !session?.email) {
      renderProperties([]);
      return;
    }
    const ownerResult = await post('get_owner', { email: session.email, sessionToken: session.sessionToken || '' });
    if (ownerResult?.ok && ownerResult.owner) {
      setSession({ ...session, ...ownerResult.owner, sessionToken: ownerResult.sessionToken || session.sessionToken });
      updateAccountView({ ...session, ...ownerResult.owner });
    }
    const propertiesResult = await post('get_properties', { ownerUserId: (ownerResult.owner || session).userId, email: session.email });
    if (propertiesResult?.ok) renderProperties(propertiesResult.properties || []);
  }

  function appendOwnerPayload(payload = {}) {
    const session = getSession() || {};
    if (!payload.ownerUserId) payload.ownerUserId = session.userId || '';
    if (!payload.ownerEmail) payload.ownerEmail = session.email || localStorage.getItem('mctHotelOwnerEmail') || '';
    return payload;
  }

  function init() {
    if (window.__MCT_HOTEL_MARKETPLACE_INIT__) return;
    window.__MCT_HOTEL_MARKETPLACE_INIT__ = true;
    fillSelects();
    updateRegistrationType();
    $('#hotelRegistrationType')?.addEventListener('change', updateRegistrationType);
    $('#hotelOwnerPassword')?.addEventListener('input', updatePasswordRules);
    $('#hotelOwnerConfirmPassword')?.addEventListener('input', updatePasswordRules);
    updatePasswordRules();
    loadPanelData();
    document.addEventListener('input', e => sanitizeInput(e.target));
    document.addEventListener('change', e => sanitizeInput(e.target));
    document.addEventListener('click', e => {
      const passwordToggle = e.target.closest('[data-toggle-password]');
      if (passwordToggle) return togglePassword(passwordToggle, e);
      const logout = e.target.closest('[data-hotel-logout]');
      if (logout) {
        e.preventDefault();
        clearSession();
        window.location.href = './login-admin-hotel.html';
        return;
      }
      const tab = e.target.closest('[data-hotel-panel-tab]');
      if (tab) switchPanelTab(tab.dataset.hotelPanelTab);
      const opener = e.target.closest('[data-open-market-modal]');
      if (opener) openModal(opener.dataset.openMarketModal);
      const currentLocation = e.target.closest('[data-use-current-location]');
      if (currentLocation) useCurrentLocation(currentLocation);
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
      if (!result.ok) { showMsg('#hotelOwnerRegisterMsg', result.error || 'No se pudo enviar el registro.', false); return; }
      showMsg('#hotelOwnerRegisterMsg', 'Hemos enviado un correo de verificación a tu bandeja. Revisa ese correo para activar tu cuenta.');
    }
    if (login) {
      event.preventDefault();
      if (!validateForm(login)) { showMsg('#hotelOwnerLoginMsg', 'Ingresa un correo válido y tu contraseña.', false); return; }
      const payload = serialize(login);
      const result = await post('login_owner', payload);
      if (!result.ok) { showMsg('#hotelOwnerLoginMsg', result.error || 'No se pudo iniciar sesión.', false); return; }
      if (result.owner && !statusIsAllowed(result.owner.status)) {
        showMsg('#hotelOwnerLoginMsg', 'Tu cuenta aún no está activa. Revisa el correo de verificación o espera la aprobación.', false);
        return;
      }
      setSession({ ...(result.owner || {}), sessionToken: result.sessionToken || '' });
      showMsg('#hotelOwnerLoginMsg', 'Acceso correcto. Redirigiendo al panel...');
      setTimeout(() => { window.location.href = './panel-admin-hotel.html'; }, 500);
    }
    if (marketForm) {
      event.preventDefault();
      if (!validateForm(marketForm)) { showMsg('#hotelPanelMsg', 'Revisa los campos obligatorios antes de guardar.', false); return; }
      const type = marketForm.dataset.marketplaceForm;
      const payload = appendOwnerPayload(serialize(marketForm));
      let action = type === 'property' ? 'create_property' : type === 'room' ? 'create_room' : type === 'availability' ? 'block_dates' : type === 'account' ? 'update_owner' : type === 'password' ? 'change_password' : 'update_confirmation_mode';
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
      if (!result.ok) { showMsg('#hotelPanelMsg', result.error || 'No se pudo guardar.', false); return; }
      showMsg('#hotelPanelMsg', 'Cambios guardados correctamente.');
      closeModal();
      if (type === 'account') {
        const current = getSession() || {};
        setSession({ ...current, ...payload });
        updateAccountView({ ...current, ...payload });
      }
      if (['property','room','confirmation'].includes(type)) loadPanelData();
    }
  });


  window.MCTHotelMarketplace = { init, togglePassword };
  document.addEventListener('DOMContentLoaded', init);
})();
