(() => {
  const AGENCIES = 'mct_registered_agencies';
  const SESSION = 'mct_agency_session';
  const $ = (selector) => document.querySelector(selector);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const show = (message, type = 'is-error') => { const el = $('#loginMessage'); el.textContent = message; el.className = `form-message ${type}`; el.hidden = false; };
  const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  async function hashPassword(password, salt) { const input = new TextEncoder().encode(`${salt}:${password}`); const digest = await crypto.subtle.digest('SHA-256', input); return toHex(digest); }
  async function isPasswordValid(account, password) { return account.passwordHash && account.passwordSalt ? await hashPassword(password, account.passwordSalt) === account.passwordHash : account.password === password; }
  $('#loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('#loginEmail').value.trim().toLowerCase();
    const password = $('#loginPassword').value;
    const agencies = read(AGENCIES, []);
    const account = agencies.find((item) => item.accessEmail === email);
    if (!account || !(await isPasswordValid(account, password))) { show('No encontramos un acceso activo con esos datos. Verifica el correo y la contraseña.'); return; }
    write(SESSION, { email: account.accessEmail, companyName: account.company?.tradeName || account.company?.legalName || 'Cuenta registrada', contactName: account.legalRepresentative?.firstName || '', loggedAt: new Date().toISOString(), localSession: true });
    window.location.href = './index.html';
  });
})();
