(() => {
  const AGENCIES = 'mct_registered_agencies';
  const SESSION = 'mct_agency_session';
  const $ = (selector) => document.querySelector(selector);
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const show = (message, type = 'is-error') => {
    const el = $('#loginMessage');
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

  async function isPasswordValid(agency, password) {
    if (agency.passwordHash && agency.passwordSalt) {
      return await hashPassword(password, agency.passwordSalt) === agency.passwordHash;
    }
    // Migración temporal para registros demo antiguos que guardaban contraseña en texto plano.
    return agency.password === password;
  }

  $('#loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('#loginEmail').value.trim().toLowerCase();
    const password = $('#loginPassword').value;
    const agencies = read(AGENCIES, []);
    const agency = agencies.find((item) => item.accessEmail === email);
    if (!agency || !(await isPasswordValid(agency, password))) {
      show('No encontramos una agencia activa con esos datos. Verifica tu correo y contraseña.');
      return;
    }

    if (agency.password && !agency.passwordHash) {
      const salt = createSalt();
      agency.passwordSalt = salt;
      agency.passwordHash = await hashPassword(password, salt);
      agency.authMode = 'browser_demo_hash_migrated';
      delete agency.password;
      write(AGENCIES, agencies);
    }

    write(SESSION, {
      email: agency.accessEmail,
      companyName: agency.company?.name || 'Agencia autorizada',
      contactName: agency.commercialContact?.firstName || agency.legalRepresentative?.firstName || '',
      loggedAt: new Date().toISOString(),
      demoSession: true
    });
    window.location.href = './index.html';
  });
})();
