(() => {
  const SESSION_KEY = 'mct_agency_session';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz38yAU-vEt5Joe8NQjDRFsEIOqgDIv-w99YHI5sLbO03rKCt-dwAH10j0A92pyOAEx/exec';
  const $ = (selector, root = document) => root.querySelector(selector);
  const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const show = (id, message, type = 'is-error') => { const el = $(id); el.textContent = message; el.className = `form-message ${type}`; el.hidden = false; };

  function requireSession() {
    const session = readJSON(SESSION_KEY, null);
    if (!session?.email) { window.location.href = './login.html'; return null; }
    return session;
  }

  async function callApps(action, payload) {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload, email: payload?.account?.email, agencyId: payload?.account?.agencyId })
    });
    const text = await response.text();
    try { return JSON.parse(text); } catch { return { ok:false, message:'No se pudo leer la respuesta del servidor.' }; }
  }

  function validPassword(password) {
    if (!password || password.length < 8) return false;
    return /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) && /\d/.test(password) && /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(password);
  }

  async function init() {
    const session = requireSession();
    if (!session) return;
    $('#profileCompany').value = session.companyName || '';
    $('#profileEmail').value = session.email || '';
    try {
      const result = await callApps('getAgencyProfile', { account: session });
      if (result.ok && result.profile) {
        $('#profileCompany').value = result.profile.nombreComercial || result.profile.razonSocial || session.companyName || '';
        $('#profilePhone').value = result.profile.celular || '';
        $('#profileWeb').value = result.profile.web || '';
      }
    } catch (error) { console.warn(error); }

    $('#profileForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      button.textContent = 'Guardando...';
      try {
        const result = await callApps('updateAgencyProfile', { account: session, celular: $('#profilePhone').value.trim(), web: $('#profileWeb').value.trim() });
        if (!result.ok) { show('#profileMessage', result.message || 'No se pudo actualizar.'); return; }
        const updatedSession = { ...session, phone: $('#profilePhone').value.trim() };
        writeJSON(SESSION_KEY, updatedSession);
        show('#profileMessage', result.message || 'Datos actualizados correctamente.', 'is-success');
      } finally {
        button.disabled = false;
        button.textContent = 'Guardar cambios';
      }
    });

    $('#passwordForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const currentPassword = $('#currentPassword').value;
      const newPassword = $('#newPassword').value;
      const confirmPassword = $('#confirmPassword').value;
      if (newPassword !== confirmPassword) { show('#passwordMessage', 'La confirmación no coincide.'); return; }
      if (!validPassword(newPassword)) { show('#passwordMessage', 'La nueva contraseña debe tener mínimo 8 caracteres, una letra, un número y un carácter especial.'); return; }
      const button = event.submitter;
      button.disabled = true;
      button.textContent = 'Actualizando...';
      try {
        const result = await callApps('changePassword', { account: session, currentPassword, newPassword });
        if (!result.ok) { show('#passwordMessage', result.message || 'No se pudo cambiar la contraseña.'); return; }
        show('#passwordMessage', result.message || 'Contraseña actualizada correctamente.', 'is-success');
        event.target.reset();
      } finally {
        button.disabled = false;
        button.textContent = 'Actualizar contraseña';
      }
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
