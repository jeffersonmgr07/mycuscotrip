"use strict";

/**
 * My Cusco Trip - Quote Packages
 * Cotizador ligero API-ready para paquetes a medida.
 * No procesa pagos ni guarda documentos en frontend.
 */
(function () {
  const COPY = {
    es: {
      eyebrow: "Cotización flexible",
      title: "Cuéntanos cómo quieres viajar",
      intro: "Genera una solicitud con datos básicos. Luego el backend podrá guardarla y conectarla con PayPal para el pago del adelanto o total.",
      destination: "Destino principal",
      destinationPlaceholder: "Ej. Cusco, Machu Picchu, Perú multidestino",
      startDate: "Fecha tentativa",
      days: "Duración",
      adults: "Adultos",
      children: "Niños",
      hotel: "Hotel",
      budget: "Presupuesto referencial",
      name: "Nombre",
      email: "Correo",
      whatsapp: "WhatsApp",
      notes: "Preferencias del viaje",
      notesPlaceholder: "Ej. hoteles 3 estrellas, tren turístico, viaje privado, luna de miel, etc.",
      submit: "Generar solicitud",
      sending: "Generando solicitud...",
      required: "Completa nombre y al menos un medio de contacto.",
      successMock: "Solicitud {code} creada como borrador seguro. Cuando conectes el backend, se guardará en la base de datos.",
      successBackend: "Solicitud {code} enviada correctamente.",
      error: "No se pudo crear la solicitud. Revisa la configuración del backend.",
      whatsappText: "Enviar por WhatsApp",
      privacy: "No ingreses pasaportes, DNI ni datos sensibles en esta primera solicitud.",
      choose: "Selecciona",
      noHotel: "Sin hotel / solo tours",
      hotel3: "Hotel 3 estrellas",
      hotel4: "Hotel 4 estrellas",
      hotel5: "Hotel 5 estrellas",
      days3: "3 a 4 días",
      days5: "5 a 7 días",
      days8: "8 a 10 días",
      custom: "A medida"
    },
    en: {
      eyebrow: "Flexible quote",
      title: "Tell us how you want to travel",
      intro: "Create a basic request. Later, the backend can store it and connect it with PayPal for deposit or full payment.",
      destination: "Main destination",
      destinationPlaceholder: "e.g., Cusco, Machu Picchu, multi-destination Peru",
      startDate: "Tentative date",
      days: "Duration",
      adults: "Adults",
      children: "Children",
      hotel: "Hotel",
      budget: "Reference budget",
      name: "Name",
      email: "Email",
      whatsapp: "WhatsApp",
      notes: "Travel preferences",
      notesPlaceholder: "e.g., 3-star hotels, tourist train, private trip, honeymoon, etc.",
      submit: "Create request",
      sending: "Creating request...",
      required: "Complete your name and at least one contact channel.",
      successMock: "Request {code} was created as a secure draft. Once the backend is connected, it will be saved in the database.",
      successBackend: "Request {code} sent successfully.",
      error: "The request could not be created. Check the backend configuration.",
      whatsappText: "Send by WhatsApp",
      privacy: "Do not enter passport, ID or sensitive data in this first request.",
      choose: "Choose",
      noHotel: "No hotel / tours only",
      hotel3: "3-star hotel",
      hotel4: "4-star hotel",
      hotel5: "5-star hotel",
      days3: "3 to 4 days",
      days5: "5 to 7 days",
      days8: "8 to 10 days",
      custom: "Custom"
    }
  };

  function getLocale() {
    return (window.MyCuscoTripI18n?.getLocaleFromUrl?.() || document.documentElement.lang || "es").slice(0, 2).toLowerCase();
  }

  function t(key) {
    const locale = getLocale();
    return (COPY[locale] || COPY.en || COPY.es)[key] || COPY.es[key] || key;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function generateQuoteCode() {
    const date = new Date();
    const stamp = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()]
      .map((value) => String(value).padStart(2, "0"))
      .join("");
    return `QTC${(Number(stamp) % 999999).toString().padStart(6, "0")}`;
  }

  function getWhatsAppLink(payload) {
    const lines = [
      `Hola My Cusco Trip, quiero cotizar un paquete.`,
      `Código: ${payload.quoteCode}`,
      `Destino: ${payload.destination || "Por definir"}`,
      `Fecha: ${payload.startDate || "Flexible"}`,
      `Duración: ${payload.duration || "A medida"}`,
      `Pasajeros: ${payload.travelers.adults} adultos, ${payload.travelers.children} niños`,
      `Hotel: ${payload.hotelCategory || "Por definir"}`,
      `Nombre: ${payload.customer.name}`
    ];
    return `https://wa.me/51900608980?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  function buildQuoteForm() {
    const host = document.querySelector(".catalog-landing .container") || document.querySelector("main");
    if (!host || document.getElementById("quoteBuilderLite")) return;

    const section = document.createElement("section");
    section.className = "quote-builder-lite";
    section.id = "quoteBuilderLite";
    section.innerHTML = `
      <div class="quote-builder-lite__header">
        <p>${escapeHtml(t("eyebrow"))}</p>
        <h2>${escapeHtml(t("title"))}</h2>
        <span>${escapeHtml(t("intro"))}</span>
      </div>
      <form class="quote-builder-lite__form" id="quoteBuilderForm" novalidate>
        <label><span>${escapeHtml(t("destination"))}</span><input name="destination" placeholder="${escapeHtml(t("destinationPlaceholder"))}" type="text"></label>
        <label><span>${escapeHtml(t("startDate"))}</span><input name="startDate" type="date"></label>
        <label><span>${escapeHtml(t("days"))}</span><select name="duration"><option value="">${escapeHtml(t("choose"))}</option><option>${escapeHtml(t("days3"))}</option><option>${escapeHtml(t("days5"))}</option><option>${escapeHtml(t("days8"))}</option><option>${escapeHtml(t("custom"))}</option></select></label>
        <label><span>${escapeHtml(t("adults"))}</span><input min="1" name="adults" type="number" value="2"></label>
        <label><span>${escapeHtml(t("children"))}</span><input min="0" name="children" type="number" value="0"></label>
        <label><span>${escapeHtml(t("hotel"))}</span><select name="hotelCategory"><option value="">${escapeHtml(t("choose"))}</option><option>${escapeHtml(t("noHotel"))}</option><option>${escapeHtml(t("hotel3"))}</option><option>${escapeHtml(t("hotel4"))}</option><option>${escapeHtml(t("hotel5"))}</option></select></label>
        <label><span>${escapeHtml(t("budget"))}</span><input name="budget" placeholder="USD" type="text"></label>
        <label><span>${escapeHtml(t("name"))}</span><input name="name" required type="text" autocomplete="name"></label>
        <label><span>${escapeHtml(t("email"))}</span><input name="email" type="email" autocomplete="email"></label>
        <label><span>${escapeHtml(t("whatsapp"))}</span><input name="whatsapp" type="tel" autocomplete="tel"></label>
        <label class="quote-builder-lite__wide"><span>${escapeHtml(t("notes"))}</span><textarea name="notes" rows="3" placeholder="${escapeHtml(t("notesPlaceholder"))}"></textarea></label>
        <div class="quote-builder-lite__actions">
          <small>${escapeHtml(t("privacy"))}</small>
          <button class="btn" type="submit">${escapeHtml(t("submit"))}</button>
        </div>
      </form>
      <div class="quote-builder-lite__result" id="quoteBuilderResult" hidden></div>
    `;

    host.insertBefore(section, host.firstElementChild);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = document.getElementById("quoteBuilderResult");
    const submit = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const whatsapp = String(data.get("whatsapp") || "").trim();

    if (!name || (!email && !whatsapp)) {
      result.hidden = false;
      result.className = "quote-builder-lite__result is-error";
      result.textContent = t("required");
      return;
    }

    const payload = {
      quoteCode: generateQuoteCode(),
      locale: getLocale(),
      source: "quote-packages-page",
      destination: String(data.get("destination") || "").trim(),
      startDate: String(data.get("startDate") || "").trim(),
      duration: String(data.get("duration") || "").trim(),
      travelers: {
        adults: Math.max(1, Number(data.get("adults") || 1)),
        children: Math.max(0, Number(data.get("children") || 0))
      },
      hotelCategory: String(data.get("hotelCategory") || "").trim(),
      budget: String(data.get("budget") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
      customer: { name, email, whatsapp },
      status: "quote_requested",
      paymentProviderPrepared: "paypal",
      createdAt: new Date().toISOString()
    };

    if (submit) {
      submit.disabled = true;
      submit.textContent = t("sending");
    }

    try {
      const response = window.MyCuscoTripApiClient?.createQuote
        ? await window.MyCuscoTripApiClient.createQuote(payload)
        : { mock: true, code: payload.quoteCode };
      const message = response?.mock ? t("successMock") : t("successBackend");
      result.hidden = false;
      result.className = "quote-builder-lite__result is-success";
      result.innerHTML = `
        <strong>${escapeHtml(message.replace("{code}", payload.quoteCode))}</strong>
        <a href="${escapeHtml(getWhatsAppLink(payload))}" target="_blank" rel="noopener">${escapeHtml(t("whatsappText"))}</a>
      `;
      form.reset();
    } catch (error) {
      console.error("No se pudo crear la cotización:", error);
      result.hidden = false;
      result.className = "quote-builder-lite__result is-error";
      result.textContent = t("error");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = t("submit");
      }
    }
  }

  function init() {
    buildQuoteForm();
    document.getElementById("quoteBuilderForm")?.addEventListener("submit", handleSubmit);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
