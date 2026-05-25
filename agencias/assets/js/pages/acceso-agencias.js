(() => {
  const SESSION = 'mct_agency_session';

  // Pega aquí tu URL de Apps Script terminada en /exec
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwu0pXSr_rnfeG_L6oc2lzdgj3iJ_HrgeifVJ7WyRLFUWG_UW548oMM2UpDgNlq5pD7/exec';

  const $ = (selector) => document.querySelector(selector);

  const write = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const show = (message, type = 'is-error') => {
    const el = $('#loginMessage');
    if (!el) return;
    el.textContent = message;
    el.className = `form-message ${type}`;
    el.hidden = false;
  };

  async function loginAgency(email, password) {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'loginAgency',
        email,
        password
      })
    });

    return await response.json();
  }

  $('#loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = $('#loginEmail')?.value.trim().toLowerCase();
    const password = $('#loginPassword')?.value;

    if (!email || !password) {
      show('Ingresa tu correo y contraseña.');
      return;
    }

    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes(https://script.google.com/macros/s/AKfycbwu0pXSr_rnfeG_L6oc2lzdgj3iJ_HrgeifVJ7WyRLFUWG_UW548oMM2UpDgNlq5pD7/exec')) {
      show('Falta configurar la URL de Google Apps Script.');
      return;
    }

    const button = event.submitter;
    if (button) {
      button.disabled = true;
      button.textContent = 'Ingresando...';
    }

    try {
      const result = await loginAgency(email, password);

      if (!result.ok) {
        show(result.message || 'No encontramos un acceso activo con esos datos.');
        return;
      }

      write(SESSION, {
        agencyId: result.agency.id,
        email: result.agency.correo,
        companyName: result.agency.nombreComercial || result.agency.razonSocial || 'Agencia registrada',
        contactName: result.agency.representanteNombres || '',
        status: result.agency.estado,
        loggedAt: new Date().toISOString(),
        source: 'google-sheets'
      });

      window.location.href = './index.html';

    } catch (error) {
      console.error(error);
      show('No se pudo conectar con el servidor. Revisa la URL de Apps Script.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Ingresar';
      }
    }
  });
})();
