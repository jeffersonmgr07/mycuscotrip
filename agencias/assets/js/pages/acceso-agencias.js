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

  $('#loginForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = $('#loginEmail').value.trim().toLowerCase();
    const password = $('#loginPassword').value;
    const agencies = read(AGENCIES, []);
    const agency = agencies.find((item) => item.accessEmail === email && item.password === password);
    if (!agency) {
      show('No encontramos una agencia activa con esos datos. Verifica tu correo y contraseña.');
      return;
    }
    write(SESSION, {
      email: agency.accessEmail,
      companyName: agency.company?.name || 'Agencia autorizada',
      contactName: agency.commercialContact?.firstName || agency.legalRepresentative?.firstName || '',
      loggedAt: new Date().toISOString()
    });
    window.location.href = './index.html';
  });
})();
