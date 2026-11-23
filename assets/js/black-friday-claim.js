"use strict";
/* My Cusco Trip · registro Black Friday 2026. No contiene códigos ni secretos. */
(() => {
  const $ = id => document.getElementById(id);
  const root = location.hostname.includes("github.io") ? "/mycuscotrip/" : "/";
  const status = (message, good = false) => {
    const el = $("bf-message");
    el.textContent = message || "";
    el.classList.toggle("is-success", good);
  };
  async function include(name, id) {
    try {
      const response = await fetch(root + "components/" + name + ".html");
      if (!response.ok) throw new Error("HTTP " + response.status);
      $(id).innerHTML = await response.text();
      if (name === "header") window.initMyCuscoTripHeader?.();
      else window.MyCuscoTripFooter?.localizeFooterLinks?.();
    } catch (err) {
      console.error("My Cusco Trip component", name, err);
      $(id).textContent = "My Cusco Trip";
    }
  }
  function flag(code) {
    return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0))) : "🌐";
  }
  async function setupCountries() {
    const select = $("bf-country");
    try {
      const response = await fetch(root + "assets/data/countries.json");
      if (!response.ok) throw new Error();
      const countries = await response.json();
      const render = text => {
        const query = String(text || "").trim().toLocaleLowerCase();
        const current = select.value || "+51";
        select.replaceChildren(...countries.filter(c => [c.name, c.dialCode, c.code].some(v => String(v).toLocaleLowerCase().includes(query)))
          .map(c => new Option(flag(c.code) + " " + c.name + " · " + c.dialCode, c.dialCode)));
        if ([...select.options].some(o => o.value === current)) select.value = current;
      };
      render("");
      select.value = "+51";
      $("bf-country-search").addEventListener("input", e => render(e.target.value));
    } catch (error) {
      select.replaceChildren(new Option("🇵🇪 Perú · +51", "+51"));
      status("No se pudo cargar la lista de países; puedes usar +51.", false);
    }
  }
  let busy = false;
  let pending = {};
  async function api(action, payload) {
    const client = window.MyCuscoTripApiClient;
    if (!client?.postAction || !await client.isBackendEnabled()) throw new Error("No podemos registrar cupones por ahora. Intenta nuevamente.");
    const result = await client.postAction(action, payload);
    if (!result?.ok || result?.mock) throw new Error(result?.error || result?.message || "Solicitud no disponible.");
    return result;
  }
  function setBusy(state) {
    busy = state;
    document.querySelectorAll("#bf-registration button, #bf-verify button").forEach(b => b.disabled = state);
  }
  async function start(event) {
    event.preventDefault();
    if (busy) return;
    const form = $("bf-registration");
    if (!form.reportValidity()) return;
    const payload = {
      firstName: $("bf-first").value.trim(),
      lastName: $("bf-last").value.trim(),
      email: $("bf-email").value.trim().toLowerCase(),
      countryCode: $("bf-country").value,
      whatsapp: $("bf-phone").value.trim().replace(/\D/g, ""),
      privacyAccepted: $("bf-privacy").checked,
      marketingAccepted: $("bf-marketing").checked,
      honeypot: $("bf-website").value
    };
    setBusy(true);
    status("Enviando verificación…");
    try {
      await api("mctBfStart", payload);
      pending = payload;
      $("bf-pending-email").textContent = payload.email;
      $("bf-registration").hidden = true;
      $("bf-verify").hidden = false;
      $("bf-otp").focus();
      status("Código enviado. Revisa tu correo electrónico.", true);
    } catch (err) { status(err.message); }
    finally { setBusy(false); }
  }
  async function verify(event) {
    event.preventDefault();
    if (busy || !$("bf-verify").reportValidity()) return;
    setBusy(true);
    status("Verificando tu correo…");
    try {
      const result = await api("mctBfVerify", {email: pending.email, otp: $("bf-otp").value.trim()});
      const code = String(result.code || "");
      if (!/^MCT26-/.test(code)) throw new Error("No recibimos el cupón. Revisa tu correo.");
      $("bf-private-code").textContent = code;
      $("bf-verify").hidden = true;
      $("bf-success").hidden = false;
      $("bf-otp").value = "";
      status("Cupón asignado. También recibirás una copia por correo.", true);
    } catch (err) { status(err.message); }
    finally { setBusy(false); }
  }
  async function resend() {
    if (busy || !pending.email) return;
    setBusy(true);
    try {
      await api("mctBfStart", pending);
      status("Te enviamos un nuevo código de verificación.", true);
    } catch (err) { status(err.message); }
    finally { setBusy(false); }
  }
  function back() {
    pending = {};
    $("bf-verify").hidden = true;
    $("bf-registration").hidden = false;
    $("bf-otp").value = "";
    status("");
  }
  document.addEventListener("DOMContentLoaded", () => {
    void include("header", "header-container");
    void include("footer", "footer-container");
    void setupCountries();
    $("bf-registration").addEventListener("submit", start);
    $("bf-verify").addEventListener("submit", verify);
    $("bf-resend").addEventListener("click", resend);
    $("bf-back").addEventListener("click", back);
    $("bf-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("bf-private-code").textContent); status("Código copiado.", true); }
      catch (_) { status("Selecciona el código para copiarlo manualmente."); }
    });
  });
})();