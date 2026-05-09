"use strict";

/**
 * My Cusco Trip - Coupon Popup
 * Popup de captura de leads con cupón.
 */
(function () {
  const STORAGE_KEY = "mct_coupon_popup_state";
  const DISMISS_DAYS = 7;
  const MIN_DELAY_MS = 2500;
  const MAX_DELAY_MS = 3500;

  class MyCuscoTripCouponPopup {
    constructor(options = {}) {
      this.options = {
        couponCode: options.couponCode || "CUSCO10",
        discountLabel: options.discountLabel || "10% de descuento",
        endpoint: options.endpoint || "",
        ...options
      };

      this.popup = null;
      this.form = null;
      this.hasShown = false;
      this.timer = null;

      if (this.shouldSkipPage() || this.shouldSuppressPopup()) return;

      this.init();
    }

    init() {
      this.render();
      this.bindEvents();
      this.scheduleShow();
    }

    shouldSkipPage() {
      const path = window.location.pathname.toLowerCase();
      return (
        path.includes("registro-pasajeros") ||
        path.includes("booking-status") ||
        path.includes("mi-reserva") ||
        path.includes("detalle-reserva") ||
        path.includes("verificar-reserva")
      );
    }

    shouldSuppressPopup() {
      const state = this.getStoredState();
      if (state.registered === true) return true;
      if (!state.dismissedAt) return false;

      const dismissedAt = Number(state.dismissedAt);
      if (!Number.isFinite(dismissedAt)) return false;

      const elapsedDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      return elapsedDays < DISMISS_DAYS;
    }

    getStoredState() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      } catch (error) {
        return {};
      }
    }

    setStoredState(nextState) {
      const current = this.getStoredState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...nextState }));
    }

    scheduleShow() {
      const delay = this.getRandomDelay();
      this.timer = window.setTimeout(() => this.show(), delay);
    }

    getRandomDelay() {
      return Math.round(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
    }

    render() {
      const existing = document.getElementById("couponPopup");
      if (existing) {
        this.popup = existing;
        this.form = existing.querySelector("form") || null;
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.id = "couponPopup";
      wrapper.className = "coupon-popup";
      wrapper.hidden = true;
      wrapper.setAttribute("role", "dialog");
      wrapper.setAttribute("aria-modal", "true");
      wrapper.setAttribute("aria-labelledby", "couponPopupTitle");

      wrapper.innerHTML = `
        <div class="coupon-popup__backdrop" data-coupon-close></div>
        <div class="coupon-popup__panel">
          <div class="coupon-popup__visual" aria-hidden="true">
            <div class="coupon-popup__phone"></div>
            <div class="coupon-popup__ticket">
              <span class="coupon-popup__ticket-icon">%</span>
              <div>
                <strong>${this.escapeHtml(this.options.discountLabel)}</strong>
                <span>Aplica para tours y paquetes seleccionados</span>
              </div>
            </div>
          </div>

          <div class="coupon-popup__content">
            <button type="button" class="coupon-popup__close" data-coupon-close aria-label="Cerrar cupón">×</button>
            <p class="coupon-popup__eyebrow">Oferta especial</p>
            <h2 id="couponPopupTitle">Recibe ${this.escapeHtml(this.options.discountLabel)} en tu viaje a Cusco</h2>
            <p class="coupon-popup__intro">Déjanos tus datos y recibe un cupón para reservar experiencias en Cusco, Machu Picchu y paquetes seleccionados.</p>

            <div class="coupon-popup__code-box">
              <span>Código</span>
              <strong>${this.escapeHtml(this.options.couponCode)}</strong>
            </div>

            <form class="coupon-popup__form" novalidate>
              <label>
                <span>Nombre</span>
                <input type="text" name="name" autocomplete="name" required minlength="2" />
              </label>

              <label>
                <span>WhatsApp</span>
                <input type="tel" name="whatsapp" autocomplete="tel" required inputmode="tel" />
              </label>

              <label>
                <span>Correo</span>
                <input type="email" name="email" autocomplete="email" required />
              </label>

              <p class="coupon-popup__message" data-coupon-message aria-live="polite"></p>

              <button type="submit" class="btn coupon-popup__submit">Recibir cupón</button>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(wrapper);
      this.popup = wrapper;
      this.form = wrapper.querySelector("form");
    }

    bindEvents() {
      this.popup?.querySelectorAll("[data-coupon-close]").forEach((button) => {
        button.addEventListener("click", () => this.dismiss());
      });

      this.form?.addEventListener("submit", (event) => this.handleSubmit(event));

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.popup && !this.popup.hidden) {
          this.dismiss();
        }
      });
    }

    show() {
      if (this.hasShown || !this.popup || this.shouldSuppressPopup()) return;

      this.hasShown = true;
      this.popup.hidden = false;
      this.popup.classList.add("is-visible");
      document.body.classList.add("coupon-popup-open");
    }

    hide() {
      if (!this.popup) return;

      this.popup.classList.remove("is-visible");
      this.popup.hidden = true;
      document.body.classList.remove("coupon-popup-open");
    }

    dismiss() {
      this.setStoredState({ dismissedAt: Date.now() });
      this.hide();
    }

    async handleSubmit(event) {
      event.preventDefault();
      if (!this.form) return;

      const formData = new FormData(this.form);
      const payload = {
        name: String(formData.get("name") || "").trim(),
        whatsapp: String(formData.get("whatsapp") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        couponCode: this.options.couponCode,
        page: window.location.href,
        createdAt: new Date().toISOString()
      };

      const validation = this.validatePayload(payload);
      if (!validation.valid) {
        this.setMessage(validation.message, true);
        return;
      }

      this.setMessage("Registrando tus datos...", false);

      try {
        await this.submitCouponLead(payload);
        this.setStoredState({ registered: true, registeredAt: Date.now(), couponCode: this.options.couponCode });
        this.setMessage(`Listo. Tu cupón es ${this.options.couponCode}.`, false);
        window.setTimeout(() => this.hide(), 1800);
      } catch (error) {
        console.error("No se pudo registrar el cupón:", error);
        this.setMessage("No pudimos registrar tus datos. Inténtalo nuevamente.", true);
      }
    }

    validatePayload(payload) {
      if (!payload.name || payload.name.length < 2) {
        return { valid: false, message: "Ingresa tu nombre." };
      }

      if (!this.isValidWhatsApp(payload.whatsapp)) {
        return { valid: false, message: "Ingresa un WhatsApp válido con código de país o ciudad." };
      }

      if (!this.isValidEmail(payload.email)) {
        return { valid: false, message: "Ingresa un correo válido." };
      }

      return { valid: true, message: "" };
    }

    isValidWhatsApp(value) {
      const digits = String(value || "").replace(/\D/g, "");
      return digits.length >= 8 && digits.length <= 15;
    }

    isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
    }

    async submitCouponLead(payload) {
      if (!this.options.endpoint) {
        console.info("Lead de cupón capturado localmente:", payload);
        return { ok: true, simulated: true };
      }

      const response = await fetch(this.options.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json().catch(() => ({ ok: true }));
    }

    setMessage(message, isError = false) {
      const target = this.popup?.querySelector("[data-coupon-message]");
      if (!target) return;
      target.textContent = message || "";
      target.classList.toggle("is-error", Boolean(isError));
    }

    escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  }

  window.MyCuscoTripCouponPopup = MyCuscoTripCouponPopup;

  document.addEventListener("DOMContentLoaded", () => {
    window.myCuscoTripCouponPopup = new MyCuscoTripCouponPopup();
  });
})();
