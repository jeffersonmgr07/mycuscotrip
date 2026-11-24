"use strict";
/* My Cusco Trip · registro Black Friday 2026. No contiene códigos ni secretos. */
(() => {
  const $ = id => document.getElementById(id);
  const isEnglish = String(document.documentElement.lang || window.MCT_LOCALE || "es").toLowerCase().startsWith("en");
  const tr = (es, en) => isEnglish ? en : es;
  const backendMessagesEn = {
    "La campaña ha finalizado.": "This Black Friday campaign has ended.",
    "Revisa los datos del formulario.": "Please check the information in the form.",
    "Debes aceptar la política de privacidad.": "Please accept the privacy policy.",
    "No se pudo validar el formulario.": "We could not validate your request.",
    "Ya enviamos un código. Revisa tu correo.": "We have already sent a code. Please check your inbox.",
    "Has alcanzado el límite diario de solicitudes.": "You have reached today's verification request limit.",
    "No es posible enviar correos por ahora.": "Email verification is temporarily unavailable. Please try again later.",
    "Los cupones de esta campaña se han agotado.": "All available promotional coupons have been claimed.",
    "No se pudo enviar el correo. Inténtalo nuevamente.": "We could not send the email. Please try again.",
    "Ingresa el código de seis dígitos.": "Please enter the six-digit verification code.",
    "Solicita un código de verificación.": "Please request a verification code first.",
    "El código ha vencido. Solicita otro.": "Your code has expired. Please request a new one.",
    "Demasiados intentos. Solicita otro código.": "Too many attempts. Please request a new code.",
    "Código de verificación incorrecto.": "Incorrect verification code.",
    "Los cupones se han agotado.": "All coupons have been claimed.",
    "Cupón no disponible para recuperar.": "Your coupon is not available for recovery.",
    "No se pudo registrar.": "We could not complete your registration.",
    "No se pudo verificar.": "We could not verify your email."
  };
  const translateBackendError = value => {
    const message = String(value || "");
    if (!isEnglish) return message;
    return backendMessagesEn[message] || "We could not complete your request. Please try again.";
  };
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
      console.warn("My Cusco Trip: country list unavailable, using default.", err);
    }
    const countryNames = isEnglish && typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;
    function countryLabel(country) {
      if (!countryNames) return country.name;
      try { return countryNames.of(country.code) || country.name; }
      catch (_) { return country.name; }
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
        [countryLabel(country),country.name,country.dialCode,country.code]
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
        nameEl.textContent = countryLabel(country);
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
        notice.textContent = tr("No se encontraron países.", "No matching countries found.");
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
    if (!client?.postAction || !await client.isBackendEnabled()) throw new Error(tr(
      "No podemos registrar cupones por ahora. Intenta nuevamente.",
      "Coupon registration is temporarily unavailable. Please try again later."
    ));
    const result = await client.postAction(action, payload);
    if (!result?.ok || result?.mock) throw new Error(translateBackendError(result?.error || result?.message || "Solicitud no disponible."));
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
    status(tr("Enviando verificación…", "Sending verification code…"));
    try {
      await api("mctBfStart", payload);
      pending = payload;
      $("bf-pending-email").textContent = payload.email;
      $("bf-registration").hidden = true;
      $("bf-verify").hidden = false;
      $("bf-otp").focus();
      status(tr("Código enviado. Revisa tu correo electrónico.", "Verification code sent. Please check your email."), true);
    } catch (err) { status(err.message); }
    finally { setBusy(false); }
  }
  async function verify(event) {
    event.preventDefault();
    if (busy || !$("bf-verify").reportValidity()) return;
    setBusy(true);
    status(tr("Verificando tu correo…", "Verifying your email…"));
    try {
      const result = await api("mctBfVerify", {email: pending.email, otp: $("bf-otp").value.trim()});
      const code = String(result.code || "");
      if (!/^MCT26-/.test(code)) throw new Error(tr("No recibimos el cupón. Revisa tu correo.", "We could not retrieve your coupon. Please check your email."));
      $("bf-private-code").textContent = code;
      $("bf-verify").hidden = true;
      $("bf-success").hidden = false;
      $("bf-otp").value = "";
      status(tr("Cupón asignado. También recibirás una copia por correo.", "Coupon assigned! A copy will also be sent to your email."), true);
    } catch (err) { status(err.message); }
    finally { setBusy(false); }
  }
  async function resend() {
    if (busy || !pending.email) return;
    setBusy(true);
    try {
      await api("mctBfStart", pending);
      status(tr("Te enviamos un nuevo código de verificación.", "We sent you a new verification code."), true);
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
      try { await navigator.clipboard.writeText($("bf-private-code").textContent); status(tr("Código copiado.", "Coupon copied."), true); }
      catch (_) { status(tr("Selecciona el código para copiarlo manualmente.", "Select the coupon code to copy it manually.")); }
    });
  });
})();