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
    const input = $("bf-country");
    const trigger = $("bf-country-trigger");
    const menu = $("bf-country-menu");
    const search = $("bf-country-search");
    const options = $("bf-country-options");
    if (!input || !trigger || !menu || !search || !options) return;
    let countries = [{code:"PE",name:"Perú",dialCode:"+51"}];
    try {
      const response = await fetch(root + "assets/data/countries.json");
      if (!response.ok) throw new Error("Countries unavailable");
      const loaded = await response.json();
      if (Array.isArray(loaded) && loaded.length) countries = loaded;
    } catch (err) {
      console.warn("My Cusco Trip: usando código de Perú por defecto.", err);
    }
    function choose(country) {
      input.value = country.dialCode;
      $("bf-country-flag").textContent = flag(country.code);
      $("bf-country-dial").textContent = country.dialCode;
      close();
    }
    function render(query = "") {
      const q = String(query || "").trim().toLocaleLowerCase();
      const list = countries.filter(country =>
        [country.name,country.dialCode,country.code]
          .some(value => String(value).toLocaleLowerCase().includes(q)));
      const fragment = document.createDocumentFragment();
      list.slice(0,200).forEach(country => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "bf-country-option";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(input.value === country.dialCode));
        const flagEl = document.createElement("span");
        flagEl.className = "bf-option-flag";
        flagEl.textContent = flag(country.code);
        const nameEl = document.createElement("span");
        nameEl.textContent = country.name;
        const prefixEl = document.createElement("span");
        prefixEl.className = "bf-option-code";
        prefixEl.textContent = country.dialCode;
        button.append(flagEl,nameEl,prefixEl);
        button.addEventListener("click", () => choose(country));
        fragment.append(button);
      });
      if (!list.length) {
        const notice = document.createElement("p");
        notice.className = "bf-country-empty";
        notice.textContent = "No se encontraron países.";
        fragment.append(notice);
      }
      options.replaceChildren(fragment);
    }
    function close() {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded","false");
      search.value = "";
    }
    function open() {
      render("");
      menu.hidden = false;
      trigger.setAttribute("aria-expanded","true");
      search.focus();
    }
    trigger.addEventListener("click", () => menu.hidden ? open() : close());
    search.addEventListener("input", () => render(search.value));
    search.addEventListener("keydown", event => {
      if (event.key === "Escape") {close();trigger.focus();}
      if (event.key === "ArrowDown") {
        event.preventDefault();options.querySelector(".bf-country-option")?.focus();
      }
    });
    options.addEventListener("keydown", event => {
      if (event.key === "Escape") {close();trigger.focus();}
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const buttons = [...options.querySelectorAll(".bf-country-option")];
        const current = buttons.indexOf(document.activeElement);
        const next = event.key === "ArrowDown" ? Math.min(current+1,buttons.length-1) : Math.max(current-1,0);
        buttons[next]?.focus();
      }
    });
    document.addEventListener("click", event => {
      if (!event.target.closest(".bf-country-field")) close();
    });
    const preferred = countries.find(country => country.code === "PE") || countries[0];
    choose(preferred);
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