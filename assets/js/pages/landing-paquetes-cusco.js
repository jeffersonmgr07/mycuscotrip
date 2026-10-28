"use strict";
(function () {
  function init() {
    const node = document.getElementById("package-landing-data");
    const form = document.getElementById("package-quote-form");
    if (!node || !form) return;
    let product;
    try { product = JSON.parse(node.textContent); } catch (_) { return; }
    const tracking = window.MyCuscoTripTracking;
    tracking?.trackCatalogProduct?.(product, "USD");
    tracking?.track?.("landing_view", { item_id: product.id, product_slug: product.slug });
    const get = name => form.elements.namedItem(name);
    const message = document.getElementById("package-payment-message");
    const button = document.getElementById("package-pay");
    const money = n => `US$${n.toFixed(2)}`;
    button.type = "submit";
    button.disabled = false;
    let busy = false;
    let pending = null;
    get("start").min = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date());
    function counts() {
      const adults = Number(get("adults").value), children = Number(get("children").value);
      if (!Number.isInteger(adults) || adults < 1 || adults > 30 ||
          !Number.isInteger(children) || children < 0 || children > 30 ||
          !Number.isFinite(product.adultPrice) || product.adultPrice <= 0 ||
          !Number.isFinite(product.childPrice) || product.childPrice <= 0) return null;
      return { adults, children, total: (adults * Math.round(product.adultPrice * 100) + children * Math.round(product.childPrice * 100)) / 100 };
    }
    function update() {
      const c = counts();
      document.getElementById("package-total").textContent = c ? `Total: ${money(c.total)}` : "Revisa la cantidad de viajeros";
      document.getElementById("package-breakdown").textContent = c ? `${c.adults} adulto(s) × ${money(product.adultPrice)} + ${c.children} niño(s) × ${money(product.childPrice)}. Sin alojamiento.` : "";
      if (!busy) pending = null;
    }
    form.addEventListener("input", update);
    update();
    if (new URLSearchParams(location.search).get("payment") === "cancelled") {
      message.textContent = "El pago fue cancelado. No se ha confirmado un pago. Puedes consultar tu reserva en Mi Reserva o contactarnos antes de volver a pagar.";
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      const c = counts();
      if (!c) return;
      const api = window.MyCuscoTripApiClient;
      busy = true; button.disabled = true;
      // Freeze the reviewed quantities and holder while the request is in flight.
      const controls = Array.from(form.querySelectorAll("input"));
      const holder = { firstName: get("firstName").value.trim(), lastName: get("lastName").value.trim(), email: get("email").value.trim(), whatsapp: get("whatsapp").value.trim(), language: "Español", travels: false };
      controls.forEach(input => { input.disabled = true; });
      try {
        if (!holder.firstName || !holder.lastName) throw new Error("Completa el nombre y los apellidos.");
        if (!api || !await api.isBackendEnabled()) throw new Error("El pago no está disponible. Contáctanos por WhatsApp.");
        if (!pending) {
          const code = `MCT-PKG-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
          const passengers = Array.from({ length: c.adults + c.children }, (_, i) => ({ passengerNumber: i + 1, role: "traveler", type: i < c.adults ? "adult" : "child", completionStatus: "pending", completeLater: true }));
          pending = { code, reservationCode: code, createdAt: new Date().toISOString(), source: "landing-paquetes-cusco", landingId: product.id, productId: product.id, productSlug: product.slug, productTitle: product.title, productType: "package", sourcePage: location.pathname, landingPath: location.pathname, date: get("start").value, adults: c.adults, children: c.children, infants: 0, totalPassengers: c.adults + c.children, currency: "USD", paymentMode: "full", payNowValue: c.total, serviceTotalValue: c.total, payLaterValue: 0, status: "pre_reservation", paymentStatus: "pending", holderIsPassenger: false, holder, passengers, travelers: { adults: c.adults, children: c.children, infants: 0, passengers }, accommodationIncluded: false, availabilityConfirmed: true, childEligibilityConfirmed: c.children > 0, pricing: { subtotal: c.total, discount: 0, total: c.total, currency: "USD" }, services: [{ id: product.id, productId: product.id, title: product.title, date: get("start").value, lineTotal: c.total, extras: ["Sin alojamiento"] }] };
        }
        message.textContent = "Verificando el importe de tu reserva…";
        // Read-only check fails closed on an older Apps Script deployment.
        const verified = await api.postAction("validatePackageFare", pending);
        if (!verified?.ok || verified.mock || verified.version !== "packages-20261027" || verified.total !== c.total) throw new Error(verified?.error || "Estamos actualizando el pago de estos paquetes. Contáctanos por WhatsApp para reservar.");
        if (!pending.saved) {
          message.textContent = "Registrando tu reserva…";
          const saved = await api.createPreReservation(pending);
          if (!saved?.ok || saved.mock) throw new Error(saved?.error || saved?.message || "No se pudo registrar la reserva.");
          pending.code = pending.reservationCode = saved.reservationCode || saved.code || pending.code;
          pending.saved = true;
        }
        message.textContent = "Conectando con PayPal…";
        const result = await api.createPayPalOrder({ code: pending.code, reservationCode: pending.code, productId: product.id, productTitle: product.title, currency: "USD", total: c.total, amountToPayNowValue: c.total });
        if (!result?.ok || result.mock || !result.approvalUrl) throw new Error(result?.error || result?.message || "PayPal no devolvió el enlace de pago.");
        const approval = new URL(result.approvalUrl);
        if (approval.protocol !== "https:" || !/^(?:www\.)?(?:sandbox\.)?paypal\.com$/.test(approval.hostname)) throw new Error("Enlace de pago no válido.");
        // Store only tracking data, not holder contact details or passenger data.
        try { sessionStorage.setItem(`mct_pending_payment_${pending.code}`, JSON.stringify({ payload: { productId: product.id, productTitle: product.title, productType: "package", currency: "USD", payNowValue: c.total } })); } catch (_) {}
        tracking?.track?.("begin_checkout", { item_id: product.id, value: c.total, currency: "USD" });
        location.assign(approval.href);
      } catch (error) {
        message.textContent = error?.message || "No se pudo iniciar el pago. Contáctanos por WhatsApp.";
      } finally {
        busy = false; button.disabled = false;
        controls.forEach(input => { input.disabled = false; });
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
